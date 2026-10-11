"use client";

import React, { useState, useEffect } from "react";
import {
  Printer as PrinterIcon,
  Laptop,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Loader2,
  Trash2,
  Radio,
  Wifi,
  Usb,
  Network,
  Download,
  Info,
  Star,
  Settings,
  Layers,
  FileText,
  AlertTriangle,
  Play,
  PauseCircle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Cpu
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, Printer, Device } from "@s2p/shared";
import { useAuth } from "../../../lib/firebase/auth-context";
import { safeFixed, formatRupees, formatFileSizeKb } from "@/lib/format";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function DashboardPrintersPage() {
  const { user, role } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [printJobs, setPrintJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pairing Modal state
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [pairingCodeData, setPairingCodeData] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(300);

  // Action feedback & state
  const [updatingPrinterId, setUpdatingPrinterId] = useState<string | null>(null);
  const [dispatchMode, setDispatchMode] = useState<"MANUAL_QUEUE" | "AUTO_AFTER_PAYMENT">("MANUAL_QUEUE");
  const [isUpdatingDispatchMode, setIsUpdatingDispatchMode] = useState<boolean>(false);
  const [isUpdatingIntake, setIsUpdatingIntake] = useState<boolean>(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string; printerName?: string } | null>(null);
  const [isRefreshingPrinters, setIsRefreshingPrinters] = useState(false);
  const [showObsoleteDevices, setShowObsoleteDevices] = useState(false);
  const [showQueueDetails, setShowQueueDetails] = useState(false);

  // Remove Printer Confirmation Modal
  const [removeModalData, setRemoveModalData] = useState<{
    printer: Printer;
    pendingJobs: number;
    replacementPrinterId: string;
    forceConfirm: boolean;
  } | null>(null);

  const isOwnerOrManager = role === "OWNER" || role === "MANAGER";

  // Data Fetching
  const fetchData = async () => {
    try {
      setError(null);
      const token = user ? await user.getIdToken() : "";
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [devRes, printRes, settRes, jobsRes] = await Promise.all([
        fetch(`/api/devices?shopId=${PRIMARY_PILOT_SHOP.id}`, { headers }),
        fetch(`/api/printers?shopId=${PRIMARY_PILOT_SHOP.id}`, { headers }),
        fetch(`/api/shops/${PRIMARY_PILOT_SHOP.id}/settings`, { headers }),
        fetch(`/api/print-jobs?shopId=${PRIMARY_PILOT_SHOP.id}`, { headers })
      ]);

      const devData = await devRes.json();
      const printData = await printRes.json();
      const settData = await settRes.json();
      const jobsData = await jobsRes.json();

      if (settData?.success && settData?.settings) {
        setShopSettings(settData.settings);
        if (settData.settings.printDispatchMode) {
          setDispatchMode(settData.settings.printDispatchMode);
        }
      }

      if (devData.success) {
        setDevices(devData.devices || []);
      }
      if (printData.success) {
        setPrinters(printData.printers || []);
      }
      if (jobsData.success) {
        setPrintJobs(jobsData.printJobs || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load devices/printers";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, [user]);

  // Compute Active Single PC with Priority Selection
  const activeDevice =
    devices.find(d => d.isActive && (d.id === shopSettings?.activeDeviceId || d.isPrimary)) ||
    devices.find(d => d.isActive && d.status === "ONLINE") ||
    devices.find(d => d.isActive) ||
    (devices.length > 0 ? devices[0] : null);

  const obsoleteDevices = devices.filter(d => d.id !== activeDevice?.id);

  // Compute Heartbeat & Online Status
  const hbTime = activeDevice ? (activeDevice.lastHeartbeatAt || activeDevice.lastSeen || activeDevice.lastSeenAt) : null;
  const lastSeenMs = hbTime ? Date.now() - new Date(hbTime).getTime() : Infinity;
  const isAgentOnline = Boolean(
    activeDevice &&
    activeDevice.isActive !== false &&
    !activeDevice.isRevoked &&
    (activeDevice.status === "ONLINE" || lastSeenMs <= 90000)
  );

  // Format recency of heartbeat
  const formatHeartbeatRecency = (ms: number): string => {
    if (!Number.isFinite(ms) || ms === Infinity) return "Never";
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  };

  // Compute Preferred Single Printer
  const preferredPrinter =
    printers.find(p => p.isDefault || (p as any).isPreferred) ||
    printers.find(p => p.queueName.toLowerCase().includes("smart tank")) ||
    (printers.length > 0 ? printers[0] : null);

  // Compute Intake & Order Counts
  const isIntakePaused = Boolean(
    shopSettings?.manualPause === true ||
    shopSettings?.settings?.manualPause === true
  );

  const pauseReason = shopSettings?.manualPauseReason || (
    isIntakePaused
      ? (shopSettings?.commissionedAt ? "Manual Owner Hold" : "Commissioning Safety Hold (Pending Physical Verification)")
      : null
  );

  const pendingOrdersCount = printJobs.filter(j => ['QUEUED', 'CLAIMED', 'DISPATCHED'].includes(j.status)).length;
  const failedOrdersCount = printJobs.filter(j => j.status === 'FAILED').length;
  const awaitingOutputCount = printJobs.filter(j => j.status === 'SPOOL_COMPLETED').length;

  // Pairing code countdown
  useEffect(() => {
    if (!pairingCodeData) return;
    const updateCountdown = () => {
      const remainingSec = Math.max(
        0,
        Math.floor((new Date(pairingCodeData.expiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remainingSec);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [pairingCodeData]);

  // Handle Pause / Resume Customer Intake
  const handleToggleIntake = async (targetPause: boolean) => {
    if (!user) return;
    setIsUpdatingIntake(true);
    setActionFeedback(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/shops/${PRIMARY_PILOT_SHOP.id}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          manualPause: targetPause,
          manualPauseReason: targetPause ? "MANUAL_PAUSE" : null
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update intake status");
      }
      setActionFeedback({
        type: "success",
        message: targetPause
          ? "Customer Intake PAUSED. Mobile QR uploads are held safely until you resume."
          : "Customer Intake RESUMED & OPEN! Customers can now upload documents and submit orders."
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({ type: "error", message: err?.message || "Failed to toggle intake state" });
    } finally {
      setIsUpdatingIntake(false);
    }
  };

  // Handle updating print dispatch mode
  const handleUpdateDispatchMode = async (newMode: "MANUAL_QUEUE" | "AUTO_AFTER_PAYMENT") => {
    if (!user) return;
    setIsUpdatingDispatchMode(true);
    setActionFeedback(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/shops/${PRIMARY_PILOT_SHOP.id}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ printDispatchMode: newMode })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update print dispatch mode");
      }
      setDispatchMode(newMode);
      setActionFeedback({
        type: "success",
        message: newMode === "MANUAL_QUEUE"
          ? "Manual Dispatch Active: Cashier reviews order on Counter screen before clicking 'Send to Printer'."
          : "Automatic Spooler Active: Payment confirmation instantly spools documents to Windows Spooler."
      });
    } catch (err: any) {
      setActionFeedback({ type: "error", message: err?.message || "Failed to save dispatch mode" });
    } finally {
      setIsUpdatingDispatchMode(false);
    }
  };

  // Handle setting Preferred Printer
  const handleSelectPreferredPrinter = async (printerId: string) => {
    if (!user) return;
    setUpdatingPrinterId(printerId);
    setActionFeedback(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/printers', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          printerId,
          shopId: PRIMARY_PILOT_SHOP.id,
          isDefault: true,
          isEnabled: true,
          isIgnored: false
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to select preferred printer');
      }
      const targetP = printers.find(p => p.id === printerId);
      setActionFeedback({
        type: 'success',
        message: `"${targetP?.displayName || targetP?.queueName}" is now the active SOS PRINT Preferred Printer!`,
        printerName: targetP?.displayName
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Error updating preferred printer' });
    } finally {
      setUpdatingPrinterId(null);
    }
  };

  // Set Windows Default Printer via Windows Agent
  const handleSetWindowsDefault = async (printer: Printer) => {
    if (!user) return;
    if (!isAgentOnline) {
      alert("Windows Agent is currently OFFLINE. Ensure Start-SOS-Print.bat is running on your shop PC.");
      return;
    }

    setExecutingActionId(printer.id);
    setActionFeedback(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/printers/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'SET_WINDOWS_DEFAULT',
          printerId: printer.id,
          queueName: printer.queueName,
          shopId: PRIMARY_PILOT_SHOP.id
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to change Windows default printer');
      }
      setActionFeedback({
        type: 'success',
        message: `Windows default printer set to "${printer.displayName || printer.queueName}" on SHAKEEL PC!`,
        printerName: printer.displayName
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error communicating with Windows Agent'
      });
    } finally {
      setExecutingActionId(null);
    }
  };

  // Send 1-page Test Document to a specific printer
  const handlePrintTestPage = async (printer: Printer) => {
    if (!user) return;
    if (!isAgentOnline) {
      alert("Windows Agent is currently OFFLINE. Ensure Start-SOS-Print.bat is running on SHAKEEL PC.");
      return;
    }

    setExecutingActionId(printer.id);
    setActionFeedback(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/printers/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'TEST_PRINT',
          printerId: printer.id,
          queueName: printer.queueName,
          shopId: PRIMARY_PILOT_SHOP.id
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to submit test print');
      }
      setActionFeedback({
        type: 'success',
        message: `Authorized test page sent to "${printer.displayName || printer.queueName}" (Spool Job #${data.agentResult?.spoolJobId || 'Active'}). Verify physical paper tray output!`,
        printerName: printer.displayName
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error sending test page to Windows Spooler'
      });
    } finally {
      setExecutingActionId(null);
    }
  };

  // Force Agent to Refresh / Re-enumerate Printers
  const handleRefreshFromAgent = async () => {
    if (!user) return;
    setIsRefreshingPrinters(true);
    setActionFeedback(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/printers/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'REFRESH',
          shopId: PRIMARY_PILOT_SHOP.id
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to refresh printers');
      }
      setActionFeedback({
        type: 'success',
        message: `Windows Spooler re-scanned: ${data.agentResult?.count || 0} queue(s) found.`
      });
      await fetchData();
    } catch (err: any) {
      await fetchData();
      if (err.message && !err.message.includes('AGENT_OFFLINE')) {
        setActionFeedback({ type: 'error', message: err.message });
      }
    } finally {
      setIsRefreshingPrinters(false);
    }
  };

  const handleGeneratePairingCode = async () => {
    setIsGeneratingCode(true);
    setError(null);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/devices/pairing-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ shopId: PRIMARY_PILOT_SHOP.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate pairing code");
      }
      setPairingCodeData({
        code: data.pairingCode,
        expiresAt: data.expiresAt
      });
      setTimeLeft(300);
      setIsPairingModalOpen(true);
    } catch (err: any) {
      setError(err?.message || "Failed to generate pairing code");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (!pairingCodeData) return;
    navigator.clipboard.writeText(pairingCodeData.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Banner Action Feedback */}
        {actionFeedback && (
          <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs border ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : actionFeedback.type === "info"
              ? "bg-blue-50 border-blue-300 text-blue-900"
              : "bg-red-50 border-red-300 text-red-900"
          }`}>
            <div className="flex items-center gap-2">
              {actionFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : actionFeedback.type === "info" ? (
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Header Bar with Global Controls */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                <PrinterIcon className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-black text-[#111827]">
                  SOS Print Operational Command Center
                </h1>
                <p className="text-xs text-[#475569] mt-0.5">
                  Single PC • Single Physical Printer • Controlled Spooler Dispatch • {PRIMARY_PILOT_SHOP.name}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleRefreshFromAgent}
              disabled={isRefreshingPrinters || isLoading}
              className="px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-[#475569] hover:text-[#111827] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Query Windows Spooler and reload status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPrinters || isLoading ? "animate-spin text-emerald-600" : ""}`} />
              <span>{isRefreshingPrinters ? "Scanning..." : "Refresh Status"}</span>
            </button>

            {isOwnerOrManager && (
              <button
                onClick={handleGeneratePairingCode}
                disabled={isGeneratingCode}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isGeneratingCode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Pair Windows PC</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2. THE THREE CORE OPERATIONAL PILLARS (SHOP PC | PRINTER | PRINTING) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* ========================================================= */}
          {/* PILLAR 1: SHOP PC                                         */}
          {/* ========================================================= */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    SHOP PC
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  isAgentOnline
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isAgentOnline ? "bg-emerald-600 animate-pulse" : "bg-red-500"}`} />
                  {isAgentOnline ? "ONLINE" : "OFFLINE"}
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-[#111827]">
                  {activeDevice?.name || "SHAKEEL PC"}
                </h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  Host: {activeDevice?.hostname || "DESKTOP-62D2CMR"}
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-[#475569] bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Agent Version:</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                    v{activeDevice?.agentVersion || "0.1.0"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Last Heartbeat:</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                    {formatHeartbeatRecency(lastSeenMs)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Device ID:</span>
                  <span className="font-mono font-semibold text-slate-700 text-[10px] truncate max-w-[140px]" title={activeDevice?.id}>
                    {activeDevice?.id || "None"}
                  </span>
                </div>
              </div>

              {activeDevice?.agentUploadUrl && (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-[11px]">
                  <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-500 text-[10px] block">Upload Tunnel:</span>
                    <span className="font-mono text-emerald-800 font-bold truncate block text-[11px]">
                      {activeDevice.agentUploadUrl}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Active Windows Pairing:</span>
                <span className="font-bold text-emerald-700 font-mono">1 PC Verified</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PILLAR 2: PRINTER                                         */}
          {/* ========================================================= */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <PrinterIcon className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    PRINTER
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                  <span>PREFERRED</span>
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-[#111827]">
                  {preferredPrinter?.displayName || "HP Smart Tank 580-590"}
                </h3>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate" title={preferredPrinter?.queueName}>
                  Queue: {preferredPrinter?.queueName || "HP SHADAAB Smart Tank 580-590 series"}
                </p>
              </div>

              <div className="space-y-1.5 text-xs text-[#475569] bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Windows Default:</span>
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                    {preferredPrinter?.isWindowsDefault ? (
                      <span className="text-blue-700">✓ Yes</span>
                    ) : (
                      <span className="text-slate-500">No</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Spooler State:</span>
                  <span className="font-bold text-emerald-700 text-[11px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Spooler Ready</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Driver / Port:</span>
                  <span className="font-mono text-slate-700 text-[10px] truncate max-w-[140px]" title={preferredPrinter?.portName}>
                    {preferredPrinter?.portName || "WSD / USB"}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Single Printer */}
              {preferredPrinter && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handlePrintTestPage(preferredPrinter)}
                    disabled={Boolean(executingActionId) || !isAgentOnline}
                    className="py-2 px-2.5 rounded-xl font-bold text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-700 border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Send official 1-page test document directly to this queue"
                  >
                    {executingActionId === preferredPrinter.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>Print Test Page</span>
                  </button>

                  <button
                    onClick={() => handleSetWindowsDefault(preferredPrinter)}
                    disabled={Boolean(executingActionId) || !isAgentOnline || preferredPrinter.isWindowsDefault}
                    className="py-2 px-2.5 rounded-xl font-bold text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300 text-slate-700 border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-600" />
                    <span>{preferredPrinter.isWindowsDefault ? "Default Queue" : "Set Default"}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Active Printer Mappings:</span>
                <span className="font-bold text-emerald-700 font-mono">1 Queue Mapped</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PILLAR 3: PRINTING & INTAKE                               */}
          {/* ========================================================= */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    PRINTING & INTAKE
                  </span>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                  !isIntakePaused
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-amber-100 text-amber-800 border-amber-300"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${!isIntakePaused ? "bg-emerald-600 animate-pulse" : "bg-amber-600"}`} />
                  {!isIntakePaused ? "INTAKE OPEN" : "INTAKE PAUSED"}
                </span>
              </div>

              <div>
                <h3 className="text-base font-black text-[#111827]">
                  {!isIntakePaused ? "Customer QR Intake Open" : "Intake Paused"}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {pauseReason || "Orders accepted via mobile QR & counter cashier"}
                </p>
              </div>

              {/* Counts Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="text-xs text-slate-500 font-medium">Pending</div>
                  <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                    {pendingOrdersCount}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="text-xs text-slate-500 font-medium">Failed</div>
                  <div className="text-base font-black text-red-600 font-mono mt-0.5">
                    {failedOrdersCount}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div className="text-xs text-slate-500 font-medium">Spooled</div>
                  <div className="text-base font-black text-emerald-700 font-mono mt-0.5">
                    {awaitingOutputCount}
                  </div>
                </div>
              </div>

              {/* Pause / Resume Authorized Button */}
              {isOwnerOrManager && (
                <div className="pt-1">
                  {isIntakePaused ? (
                    <button
                      onClick={() => handleToggleIntake(false)}
                      disabled={isUpdatingIntake}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingIntake ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PlayCircle className="w-4 h-4" />
                      )}
                      <span>Resume Customer Intake (Open Shop)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleIntake(true)}
                      disabled={isUpdatingIntake}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingIntake ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <PauseCircle className="w-4 h-4" />
                      )}
                      <span>Pause Customer Intake</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Dispatch Mode:</span>
                <span className="font-bold text-slate-800">
                  {dispatchMode === "MANUAL_QUEUE" ? "Manual Queue" : "Auto Spooler"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. DISPATCH MODE SELECTOR (MANUAL QUEUE VS AUTO SPOOLER) */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                <PrinterIcon className="w-4 h-4 text-emerald-600" />
                <span>Print Dispatch Mode (प्रिंट डिस्पैच मोड)</span>
              </h3>
              <p className="text-xs text-[#475569] mt-0.5">
                दुकानदार तय कर सकता है कि प्रिंट तुरंत Spooler को जाए या काउंटर से खुद भेजा जाए (Spooler Optional)
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold self-start sm:self-auto ${
              dispatchMode === "MANUAL_QUEUE"
                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : "bg-blue-100 text-blue-800 border border-blue-300"
            }`}>
              {dispatchMode === "MANUAL_QUEUE" ? "Manual Dispatch (Recommended)" : "Auto Spooler Active"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleUpdateDispatchMode("MANUAL_QUEUE")}
              disabled={isUpdatingDispatchMode}
              className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                dispatchMode === "MANUAL_QUEUE"
                  ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                  : "border-[#E2E8F0] hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-xs text-[#111827] flex items-center gap-1.5">
                    <span>🔘 Manual Dispatch (दुकानदार खुद प्रिंट भेजेगा)</span>
                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded">Recommended</span>
                  </div>
                  <p className="text-[11px] text-[#475569] mt-1">
                    Customer pay karega, fir Counter screen par <strong>&quot;Send to Printer (प्रिंटर को भेजो)&quot;</strong> button aayega. Spooler optional rahega taaki koi galat print na nikle.
                  </p>
                </div>
              </div>
              <div className="text-[10px] font-bold text-emerald-700">
                {dispatchMode === "MANUAL_QUEUE" ? "✓ Currently Active" : "Click to Activate"}
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleUpdateDispatchMode("AUTO_AFTER_PAYMENT")}
              disabled={isUpdatingDispatchMode}
              className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                dispatchMode === "AUTO_AFTER_PAYMENT"
                  ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                  : "border-[#E2E8F0] hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-xs text-[#111827]">
                    ⚪ Automatic Spooler (Payment होते ही तुरंत Spooler को भेजे)
                  </div>
                  <p className="text-[11px] text-[#475569] mt-1">
                    Payment confirm hote hi bina kisi staff click ke seedha Windows Spooler queue me job dispatch ho jayegi.
                  </p>
                </div>
              </div>
              <div className="text-[10px] font-bold text-blue-700">
                {dispatchMode === "AUTO_AFTER_PAYMENT" ? "✓ Currently Active" : "Click to Activate"}
              </div>
            </button>
          </div>
        </div>

        {/* 4. COLLAPSIBLE: MANAGE OBSOLETE DEVICE REGISTRATIONS */}
        {obsoleteDevices.length > 0 && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
            <button
              onClick={() => setShowObsoleteDevices(!showObsoleteDevices)}
              className="w-full flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700">
                  Manage Obsolete Device Registrations ({obsoleteDevices.length} Retired / Inactive)
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
                <span>{showObsoleteDevices ? "Hide" : "Show Details"}</span>
                {showObsoleteDevices ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showObsoleteDevices && (
              <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                <p className="text-[11px] text-slate-500">
                  These registrations were safely retired to preserve the single active shop PC rule. Historical print orders, audit trails, and payment records remain intact.
                </p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {obsoleteDevices.map(d => (
                    <div key={d.id} className="p-3 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-800">
                          {d.name || d.displayName || "Unknown Device"}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          ID: {d.id} • Host: {d.hostname || "N/A"}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                        {d.isRevoked ? "REVOKED" : "INACTIVE"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. PAIRING MODAL */}
        {isPairingModalOpen && pairingCodeData && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#111827] flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-emerald-600" />
                  <span>Pair Windows Print Agent</span>
                </h3>
                <button
                  onClick={() => setIsPairingModalOpen(false)}
                  className="text-[#475569] hover:text-[#111827] text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#475569] leading-relaxed">
                Launch <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-bold">Start-SOS-Print.bat</code> on your shop PC and type this single-use pairing code when prompted:
              </p>

              {/* 6-Digit Code Display */}
              <div className="bg-[#F8FAFC] border-2 border-dashed border-emerald-500/40 rounded-xl p-5 text-center space-y-2">
                <div className="text-3xl font-black font-mono tracking-widest text-[#111827]">
                  {pairingCodeData.code}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#475569]">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Expires in <strong className="text-[#111827]">{timeLeft}</strong> seconds</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={copyCodeToClipboard}
                  className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-[#111827] font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                </button>
                <button
                  onClick={() => setIsPairingModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
