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
  ExternalLink,
  ChevronRight,
  Terminal,
  Cpu,
  Star,
  Settings,
  Layers,
  FileText,
  AlertTriangle,
  Play
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, Printer, Device } from "@s2p/shared";
import { useAuth } from "../../../lib/firebase/auth-context";
import { safeFixed, formatRupees, formatFileSizeKb } from "@/lib/format";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export default function DashboardPrintersPage() {
  const { user, role } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
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

  // Revoke state
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);

  // Printer Management Action States
  const [updatingPrinterId, setUpdatingPrinterId] = useState<string | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string; printerName?: string } | null>(null);
  const [isRefreshingPrinters, setIsRefreshingPrinters] = useState(false);

  // Remove Printer Confirmation Modal
  const [removeModalData, setRemoveModalData] = useState<{
    printer: Printer;
    pendingJobs: number;
    replacementPrinterId: string;
    forceConfirm: boolean;
  } | null>(null);

  const isOwnerOrManager = role === "OWNER" || role === "MANAGER";

  // Compute online device and recency
  const activeDevice = devices.length > 0 ? devices[0] : null;
  const hbTime = activeDevice ? (activeDevice.lastHeartbeatAt || activeDevice.lastSeen || activeDevice.lastSeenAt) : null;
  const lastSeenMs = hbTime ? Date.now() - new Date(hbTime).getTime() : Infinity;
  const isAgentOnline = activeDevice && (activeDevice.status === "ONLINE" || activeDevice.status === "ACTIVE" || lastSeenMs < 90000);

  const fetchData = async () => {
    try {
      setError(null);
      const token = user ? await user.getIdToken() : "";
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [devRes, printRes] = await Promise.all([
        fetch(`/api/devices?shopId=${PRIMARY_PILOT_SHOP.id}`, { headers }),
        fetch(`/api/printers?shopId=${PRIMARY_PILOT_SHOP.id}`, { headers })
      ]);

      const devData = await devRes.json();
      const printData = await printRes.json();

      if (devData.success) {
        setDevices(devData.devices || []);
      }
      if (printData.success) {
        setPrinters(printData.printers || []);
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

  // Handle setting SOS PRINT preferred printer
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
        message: `"${targetP?.displayName || targetP?.queueName}" is now the active SOS PRINT Preferred Printer! All incoming customer print jobs will dispatch here.`,
        printerName: targetP?.displayName
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Error updating preferred printer' });
    } finally {
      setUpdatingPrinterId(null);
    }
  };

  // Toggle ignore / disable state
  const handleToggleIgnorePrinter = async (printerId: string, willIgnore: boolean) => {
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
          isIgnored: willIgnore,
          isEnabled: !willIgnore,
          ...(willIgnore ? { isDefault: false } : {})
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update printer status');
      }
      const targetP = printers.find(p => p.id === printerId);
      setActionFeedback({
        type: 'success',
        message: willIgnore
          ? `"${targetP?.displayName || targetP?.queueName}" excluded from SOS Print customer options.`
          : `"${targetP?.displayName || targetP?.queueName}" enabled and available for printing.`
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: err.message || 'Error updating printer status' });
    } finally {
      setUpdatingPrinterId(null);
    }
  };

  // Set Windows Default Printer via Windows Agent
  const handleSetWindowsDefault = async (printer: Printer) => {
    if (!user) return;
    if (!isAgentOnline) {
      alert("Windows Agent is currently OFFLINE. Please make sure Start-SOS-Print.bat is running on your shop PC before setting Windows default printer.");
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
        message: `Windows default printer successfully updated to "${printer.displayName || printer.queueName}" on the shop PC!`,
        printerName: printer.displayName
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error communicating with Windows Agent to set default printer'
      });
    } finally {
      setExecutingActionId(null);
    }
  };

  // Open Remove Confirmation Modal
  const handleInitiateRemovePrinter = (printer: Printer) => {
    if (!isAgentOnline) {
      alert("Windows Agent is currently OFFLINE. Cannot remove Windows printer queue while agent is disconnected.");
      return;
    }

    const otherPrinters = printers.filter(p => p.id !== printer.id);
    const preferredCandidate = otherPrinters.find(p => p.queueName.toLowerCase().includes('smart tank')) || otherPrinters[0];

    setRemoveModalData({
      printer,
      pendingJobs: printer.pendingJobCount || 0,
      replacementPrinterId: preferredCandidate?.id || '',
      forceConfirm: false
    });
  };

  // Confirm Remove Printer via Windows Agent
  const handleConfirmRemovePrinter = async () => {
    if (!user || !removeModalData) return;
    const { printer, replacementPrinterId, forceConfirm } = removeModalData;

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
          action: 'REMOVE_PRINTER',
          printerId: printer.id,
          queueName: printer.queueName,
          shopId: PRIMARY_PILOT_SHOP.id,
          force: forceConfirm,
          replacementPrinterId: printer.isDefault ? replacementPrinterId : undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Failed to remove Windows printer queue');
      }
      setRemoveModalData(null);
      setActionFeedback({
        type: 'success',
        message: `Printer queue "${printer.displayName || printer.queueName}" removed from Windows Spooler. Windows drivers and ports remain installed.`
      });
      await fetchData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Error removing printer queue from Windows Agent'
      });
    } finally {
      setExecutingActionId(null);
    }
  };

  // Send 1-page Test Document to a specific printer
  const handlePrintTestPage = async (printer: Printer) => {
    if (!user) return;
    if (!isAgentOnline) {
      alert("Windows Agent is currently OFFLINE. Ensure Start-SOS-Print.bat is running on the shop PC to submit a test print.");
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
        message: `Authorized 1-page test document sent to "${printer.displayName || printer.queueName}" (Windows Spool Job #${data.agentResult?.spoolJobId || 'Active'}). Verify physical paper tray output!`,
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
        throw new Error(data.error || data.message || 'Failed to refresh printers from Windows Agent');
      }
      setActionFeedback({
        type: 'success',
        message: `Discovered queues freshly re-enumerated from Windows Spooler (${data.agentResult?.count || 0} printers found).`
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
      setIsPairingModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error generating pairing code";
      setError(msg);
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
    <ErrorBoundary fallbackTitle="Printers Dashboard Notice">
      <div className="space-y-6 max-w-6xl pb-12">
        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 shadow-xs ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start gap-2.5">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 text-xs">
                <p className="font-bold">{actionFeedback.type === 'success' ? 'Command Verified' : 'Action Failed'}</p>
                <p className="leading-relaxed">{actionFeedback.message}</p>
              </div>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Header Banner */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <PrinterIcon className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-[#111827]">
                  Manual Printer Management & Windows Spooler
                </h2>
                <p className="text-xs text-[#475569] mt-0.5">
                  Select preferred printer for SOS PRINT, change Windows default, test print, and manage queues on {PRIMARY_PILOT_SHOP.name} PC
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleRefreshFromAgent}
              disabled={isRefreshingPrinters || isLoading}
              className="px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-[#475569] hover:text-[#111827] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Query Windows Spooler and reload printer queues"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPrinters || isLoading ? "animate-spin text-emerald-600" : ""}`} />
              <span>{isRefreshingPrinters ? "Scanning Spooler..." : "Refresh Printers"}</span>
            </button>

            {isOwnerOrManager && (
              <button
                onClick={handleGeneratePairingCode}
                disabled={isGeneratingCode}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGeneratingCode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Pair New Windows PC</span>
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

        {/* 2. Paired Windows PC Status Bar */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isAgentOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}>
                <Laptop className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#111827]">
                    {activeDevice?.name || "Shop Windows PC"}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isAgentOnline
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAgentOnline ? "bg-emerald-600 animate-pulse" : "bg-red-500"}`} />
                    {isAgentOnline ? "Agent Online & Ready" : "Agent Offline"}
                  </span>
                </div>
                <p className="text-[11px] text-[#475569] mt-0.5">
                  ID: <span className="font-mono">{activeDevice?.id || "None"}</span> • Last Heartbeat: {hbTime ? new Date(hbTime).toLocaleTimeString() : "Never"}
                </p>
              </div>
            </div>

            {activeDevice?.agentUploadUrl && (
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 rounded-lg flex items-center gap-2 text-[11px]">
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                <span className="text-[#475569]">Tunnel:</span>
                <span className="font-mono text-emerald-800 font-bold truncate max-w-xs">{activeDevice.agentUploadUrl}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. Discovered Printers Management Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                <PrinterIcon className="w-4 h-4 text-emerald-600" />
                <span>Discovered Windows Printer Queues ({printers.length})</span>
              </h3>
              <p className="text-xs text-[#475569] mt-0.5">
                Full owner controls: select preferred, set Windows default, send test print, or remove queue
              </p>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Synchronized from Windows Spooler
            </span>
          </div>

          {printers.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-3 shadow-xs">
              <PrinterIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#111827]">No Printers Discovered Yet</h4>
                <p className="text-xs text-[#475569] max-w-md mx-auto">
                  Ensure the Windows Agent is running on your shop PC. Click "Refresh Printers" above to query the Windows Print Spooler.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {printers.map((p) => {
                const isPreferred = Boolean(p.isDefault);
                const isWinDefault = Boolean(p.isWindowsDefault);
                const isExcluded = Boolean(p.isIgnored || !p.isEnabled);
                const isBusy = updatingPrinterId === p.id || executingActionId === p.id;
                const isSmartTank = p.queueName.toLowerCase().includes("smart tank") || p.displayName.toLowerCase().includes("smart tank");

                return (
                  <div
                    key={p.id}
                    className={`bg-white border rounded-2xl p-5 flex flex-col justify-between transition relative overflow-hidden shadow-xs ${
                      isPreferred
                        ? "border-emerald-500 ring-2 ring-emerald-500/20"
                        : isExcluded
                        ? "border-slate-200 opacity-70 bg-slate-50/50"
                        : "border-[#E2E8F0] hover:border-slate-300"
                    }`}
                  >
                    {/* Top Badges */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-[#111827] leading-tight">
                              {p.displayName || p.queueName}
                            </h4>
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 truncate" title={p.queueName}>
                            Queue: {p.queueName}
                          </p>
                        </div>

                        {/* Connection Type Icon */}
                        <div className="p-2 rounded-xl bg-slate-100 text-slate-700 shrink-0" title={`Connection: ${p.connectionType}`}>
                          {p.connectionType === "USB" ? (
                            <Usb className="w-4 h-4" />
                          ) : p.connectionType === "WIFI" ? (
                            <Wifi className="w-4 h-4" />
                          ) : (
                            <Network className="w-4 h-4" />
                          )}
                        </div>
                      </div>

                      {/* Status Badges Row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isPreferred && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                            <span>SOS PRINT Preferred</span>
                          </span>
                        )}

                        {isWinDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                            <Check className="w-3 h-3 text-blue-600" />
                            <span>Windows Default</span>
                          </span>
                        )}

                        {isExcluded ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-slate-500" />
                            <span>Excluded / Disabled</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Spooler Ready</span>
                          </span>
                        )}

                        {isSmartTank && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            Verified Hardware
                          </span>
                        )}
                      </div>

                      {/* Technical Details Grid */}
                      <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 space-y-1.5 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Driver Model:</span>
                          <span className="font-semibold text-slate-900 truncate max-w-[150px]">{p.driverName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Port Name:</span>
                          <span className="font-mono text-slate-800 text-[10px] truncate max-w-[150px]">{p.portName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Color Support:</span>
                          <span className="font-semibold text-slate-900">{p.capabilities?.colorSupported ? "Colour & B&W" : "Monochrome Only"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Duplex Mode:</span>
                          <span className="font-semibold text-slate-900">{p.capabilities?.duplexSupported ? "Automatic Duplex" : "Single-Sided (Calibrated)"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Paper Sizes:</span>
                          <span className="font-semibold text-slate-900">{p.capabilities?.paperSizes?.join(", ") || "A4"}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500">Pending Jobs:</span>
                          <span className={`font-mono font-bold ${Number(p.pendingJobCount || 0) > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                            {Number(p.pendingJobCount || 0)} pending in spooler
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="pt-4 mt-3 border-t border-[#E2E8F0] space-y-2">
                      {isOwnerOrManager && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            {/* 1. SELECT FOR SOS PRINT */}
                            <button
                              onClick={() => handleSelectPreferredPrinter(p.id)}
                              disabled={isBusy || isPreferred}
                              className={`py-2 px-2.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ${
                                isPreferred
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300 font-black cursor-default"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              }`}
                              title="Set this printer as the preferred target for incoming customer print orders"
                            >
                              {isBusy && updatingPrinterId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Star className={`w-3.5 h-3.5 ${isPreferred ? "fill-emerald-700 text-emerald-700" : ""}`} />
                              )}
                              <span>{isPreferred ? "SOS Preferred" : "Select for SOS"}</span>
                            </button>

                            {/* 2. SET AS WINDOWS DEFAULT */}
                            <button
                              onClick={() => handleSetWindowsDefault(p)}
                              disabled={isBusy || isWinDefault || !isAgentOnline}
                              className={`py-2 px-2.5 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                isWinDefault
                                  ? "bg-blue-50 text-blue-800 border border-blue-200 cursor-default"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                              }`}
                              title={!isAgentOnline ? "Agent is offline" : "Change Windows Default Printer on the shop PC"}
                            >
                              {isBusy && executingActionId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              ) : (
                                <Settings className="w-3.5 h-3.5 text-slate-600" />
                              )}
                              <span>{isWinDefault ? "Win Default" : "Set Win Default"}</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* 3. PRINT TEST PAGE */}
                            <button
                              onClick={() => handlePrintTestPage(p)}
                              disabled={isBusy || !isAgentOnline}
                              className="py-2 px-2.5 rounded-xl font-bold text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-700 border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title={!isAgentOnline ? "Agent is offline" : "Send 1-page test document directly to this queue"}
                            >
                              {isBusy && executingActionId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-slate-600" />
                              )}
                              <span>Test Print</span>
                            </button>

                            {/* 4. TOGGLE IGNORE OR REMOVE PRINTER */}
                            {isExcluded ? (
                              <button
                                onClick={() => handleToggleIgnorePrinter(p.id, false)}
                                disabled={isBusy}
                                className="py-2 px-2.5 rounded-xl font-bold text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="Re-enable this printer for SOS Print"
                              >
                                <span>Enable Queue</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleInitiateRemovePrinter(p)}
                                disabled={isBusy || !isAgentOnline}
                                className="py-2 px-2.5 rounded-xl font-bold text-[11px] bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-300 text-slate-600 border border-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Manually remove this queue from Windows Spooler"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>

                          {/* Quick Exclude/Ignore Toggle button */}
                          {!isExcluded && !isPreferred && (
                            <button
                              onClick={() => handleToggleIgnorePrinter(p.id, true)}
                              disabled={isBusy}
                              className="w-full text-center text-[10px] text-slate-500 hover:text-red-600 font-semibold py-1 transition cursor-pointer"
                            >
                              Exclude / Hide from Customer Service Mappings
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Remove Printer Queue Confirmation Modal */}
        {removeModalData && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3 className="text-base font-bold text-[#111827]">
                    Remove Windows Printer Queue
                  </h3>
                </div>
                <button
                  onClick={() => setRemoveModalData(null)}
                  className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-[#475569]">
                <p>
                  You are about to remove the following Windows printer queue from the paired shop PC:
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1 font-mono">
                  <div className="text-sm font-bold text-slate-900">
                    {removeModalData.printer.displayName || removeModalData.printer.queueName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Queue Name: <strong>{removeModalData.printer.queueName}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Driver: {removeModalData.printer.driverName}
                  </div>
                </div>

                {/* Safety Explanations */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Safe Queue-Only Removal Guarantee</span>
                  </div>
                  <p>
                    This action will <strong>ONLY remove the Windows print queue</strong>. Installed drivers, driver packages, and printer ports will remain intact and undamaged on the shop PC.
                  </p>
                </div>

                {/* Pending Jobs Warning */}
                {removeModalData.pendingJobs > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>{removeModalData.pendingJobs} Print Job(s) Pending in Windows Spooler</span>
                    </div>
                    <p>
                      This printer currently has active or pending jobs. Removing it may cancel those jobs.
                    </p>
                  </div>
                )}

                {/* Preferred Printer Replacement Requirement */}
                {removeModalData.printer.isDefault && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2 text-[11px] text-blue-900">
                    <div className="font-bold flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-blue-600 fill-blue-600" />
                      <span>This is currently the active SOS PRINT Preferred Printer</span>
                    </div>
                    <p>
                      Please select a replacement printer to receive incoming customer orders:
                    </p>
                    <select
                      value={removeModalData.replacementPrinterId}
                      onChange={(e) => setRemoveModalData(prev => prev ? { ...prev, replacementPrinterId: e.target.value } : null)}
                      className="w-full bg-white border border-blue-300 rounded-lg p-2 text-xs font-semibold text-slate-800"
                    >
                      {printers.filter(p => p.id !== removeModalData.printer.id).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.displayName || p.queueName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRemoveModalData(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemovePrinter}
                  disabled={Boolean(executingActionId)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {executingActionId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>Confirm Removal</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Pairing Code Modal */}
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
