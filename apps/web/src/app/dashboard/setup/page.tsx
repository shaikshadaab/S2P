"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Download,
  Laptop,
  Printer as PrinterIcon,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileCheck,
  QrCode,
  Terminal,
  Activity,
  ArrowRight,
  Radio,
  FileText,
  AlertTriangle,
  PlayCircle
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, Printer, Device, UpiPaymentUtils } from "@s2p/shared";
import { useAuth } from "../../../lib/firebase/auth-context";

export default function DashboardGuidedSetupPage() {
  const { user, role } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pairing code state
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [pairingCodeData, setPairingCodeData] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(300);

  // Tunnel management state
  const [tunnelUrlInput, setTunnelUrlInput] = useState<string>("");
  const [isSavingTunnelUrl, setIsSavingTunnelUrl] = useState(false);
  const [tunnelStatusMsg, setTunnelStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Commissioning Upload Test
  const [isTriggeringTestUpload, setIsTriggeringTestUpload] = useState(false);
  const [testUploadResult, setTestUploadResult] = useState<{
    message: string;
    localPath?: string;
    sha256?: string;
    fileId?: string;
    sizeBytes?: number;
  } | null>(null);
  const [testUploadError, setTestUploadError] = useState<string | null>(null);

  // Commissioning Print Test
  const [isTriggeringTestPrint, setIsTriggeringTestPrint] = useState(false);
  const [testPrintResult, setTestPrintResult] = useState<{
    orderNumber: string;
    printJobId: string;
    message: string;
  } | null>(null);
  const [testPrintError, setTestPrintError] = useState<string | null>(null);

  // QR Code preview
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const printUrl = "https://sos-print.vercel.app/print";

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
        const activeDev = devData.devices?.find((d: any) => d.status === "ACTIVE" || d.agentUploadUrl);
        if (activeDev?.agentUploadUrl && !tunnelUrlInput) {
          setTunnelUrlInput(activeDev.agentUploadUrl);
        }
      }
      if (printData.success) {
        setPrinters(printData.printers || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load station status";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // QR generation
  useEffect(() => {
    UpiPaymentUtils.generateUpiQrDataUrl(printUrl)
      .then((url) => setQrDataUrl(url))
      .catch((e) => console.error("QR gen error:", e));
  }, []);

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate pairing code";
      setError(msg);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleSaveTunnelUrl = async (deviceId: string) => {
    if (!user) return;
    const url = tunnelUrlInput.trim();
    setIsSavingTunnelUrl(true);
    setTunnelStatusMsg(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/devices/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          deviceId,
          shopId: PRIMARY_PILOT_SHOP.id,
          agentUploadUrl: url,
          testPing: Boolean(url)
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update tunnel URL");
      }
      setTunnelStatusMsg({
        type: "success",
        text: data.healthVerified
          ? "Endpoint connected & ping verified live! (Ready for direct customer uploads)"
          : "Endpoint URL saved. Ensure Start-SOS-Print.bat is running on PC."
      });
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving tunnel URL";
      setTunnelStatusMsg({ type: "error", text: msg });
    } finally {
      setIsSavingTunnelUrl(false);
    }
  };

  const handleTriggerCommissioningUpload = async () => {
    if (!user) return;
    setIsTriggeringTestUpload(true);
    setTestUploadError(null);
    setTestUploadResult(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/orders/test-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ shopId: PRIMARY_PILOT_SHOP.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to trigger commissioning test upload");
      }
      setTestUploadResult({
        message: data.message || "Test document received and verified on shop PC!",
        localPath: data.file?.localPath || data.file?.agentLocalPath,
        sha256: data.file?.sha256,
        fileId: data.file?.id,
        sizeBytes: data.file?.sizeBytes
      });
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error triggering test upload";
      setTestUploadError(msg);
    } finally {
      setIsTriggeringTestUpload(false);
    }
  };

  const handleTriggerCommissioningPrint = async () => {
    if (!user) return;
    setIsTriggeringTestPrint(true);
    setTestPrintError(null);
    setTestPrintResult(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/orders/test-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ shopId: PRIMARY_PILOT_SHOP.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to trigger test order");
      }
      setTestPrintResult({
        orderNumber: data.orderNumber,
        printJobId: data.printJobId,
        message: "Commissioning test order successfully dispatched to Windows Spooler queue!"
      });
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error triggering test order";
      setTestPrintError(msg);
    } finally {
      setIsTriggeringTestPrint(false);
    }
  };

  const primaryDevice = devices[0];
  const isPcOnline = primaryDevice?.status === "ACTIVE";
  const hasPrinters = printers.length > 0;
  const isTunnelConfigured = Boolean(primaryDevice?.agentUploadUrl);

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Station Overview */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                Single-Station Guided Setup
              </span>
              <span className="text-xs text-[#64748B]">• {PRIMARY_PILOT_SHOP.name}, Guntur</span>
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
              SOS Print Station Setup
            </h1>
            <p className="text-xs text-[#475569] max-w-2xl leading-relaxed">
              Operate your print shop from <strong>one online dashboard</strong> and <strong>one Windows launcher</strong>.
              Connect your shop PC, tunnel, physical printers, and customer QR poster below.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 rounded-lg transition"
              title="Refresh status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a
              href="/SOS-Print-Agent-Package.zip"
              download="SOS-Print-Agent-Package.zip"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Agent Package
            </a>
          </div>
        </div>

        {/* Readiness Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#F1F5F9]">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isPcOnline ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-[#64748B]">Shop PC Agent</div>
              <div className="text-xs font-bold text-[#0F172A]">
                {isPcOnline ? "Connected & Online" : "Waiting for PC"}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isTunnelConfigured ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-[#64748B]">Cloudflare Tunnel</div>
              <div className="text-xs font-bold text-[#0F172A]">
                {isTunnelConfigured ? "Active & Direct" : "Pending Launcher"}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${hasPrinters ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
              <PrinterIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-[#64748B]">Printers Detected</div>
              <div className="text-xs font-bold text-[#0F172A]">
                {printers.length} Queue{printers.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-[#64748B]">Customer Intake</div>
              <div className="text-xs font-bold text-[#0F172A]">QR Ready</div>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Step Interactive Setup Flow */}
      <div className="space-y-6">

        {/* STEP 1: Download Agent */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0">
              1
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Download Official Windows Agent Package</h3>
                  <p className="text-xs text-[#475569]">
                    Extract this package on the primary shop Windows PC connected to your USB/LAN printers.
                  </p>
                </div>
                <a
                  href="/SOS-Print-Agent-Package.zip"
                  download="SOS-Print-Agent-Package.zip"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Package (13.9 MB)
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#475569] space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-[#0F172A]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Prerequisite: Microsoft .NET 8.0 Desktop Runtime (x64)
                </div>
                <p>
                  Requires Windows 10 or 11 (64-bit). If not already installed, download the runtime from{" "}
                  <a
                    href="https://dotnet.microsoft.com/en-us/download/dotnet/8.0"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 underline font-medium inline-flex items-center gap-1"
                  >
                    Microsoft .NET 8 Desktop Runtime <ExternalLink className="w-3 h-3" />
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: Unified Windows Launcher */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0">
              2
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Run All-in-One Launcher: Start-SOS-Print.bat</h3>
                <p className="text-xs text-[#475569]">
                  No need to run separate tunnel and agent files. Double-click <strong>Start-SOS-Print.bat</strong> from the extracted folder.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-600" />
                    Automated Actions Performed:
                  </div>
                  <ul className="space-y-1.5 text-[#475569] list-disc list-inside">
                    <li>Stops conflicting or duplicate agent/tunnel processes cleanly</li>
                    <li>Auto-downloads Cloudflare Zero Trust tunnel if missing</li>
                    <li>Starts free tunnel on port 5218 and grabs HTTPS public URL</li>
                    <li>Checks DPAPI credentials; prompts for pairing code only if needed</li>
                    <li>Reports tunnel URL to cloud server for direct phone-to-PC uploads</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Zero Paid Cloud Storage Invariant
                  </div>
                  <p className="text-emerald-800 leading-relaxed">
                    Customer uploads flow directly to the local Windows PC in Guntur through encrypted HTTPS.
                    Never incurs Firebase Blaze or external cloud storage costs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 3: Pair Shop PC */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0">
              3
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Pair Shop PC (One-Time Setup)</h3>
                  <p className="text-xs text-[#475569]">
                    If running for the first time, generate a secure 6-digit pairing code and enter it in the launcher prompt.
                  </p>
                </div>
                <button
                  onClick={handleGeneratePairingCode}
                  disabled={isGeneratingCode}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 shrink-0"
                >
                  {isGeneratingCode ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Laptop className="w-3.5 h-3.5" />
                  )}
                  Generate 6-Digit Pairing Code
                </button>
              </div>

              {/* Pairing Code Card */}
              {pairingCodeData && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
                  <div>
                    <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                      Active Pairing Code (Valid for {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")})
                    </div>
                    <div className="text-3xl font-mono font-black tracking-widest text-emerald-800 mt-1">
                      {pairingCodeData.code}
                    </div>
                    <p className="text-xs text-emerald-700 mt-1">
                      Type this 6-digit code into your Windows command prompt window.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pairingCodeData.code);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition shrink-0"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? "Copied" : "Copy Code"}
                  </button>
                </div>
              )}

              {/* Paired Device Status */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#0F172A]">Currently Paired Shop PC</div>
                {devices.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    No Windows PC paired yet. Run Start-SOS-Print.bat and enter the code above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {devices.map((dev) => (
                      <div key={dev.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#0F172A]">{dev.name || dev.hostname || "Shop PC"}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${dev.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
                              {dev.status === "ACTIVE" ? "ONLINE" : "OFFLINE"}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            OS: {dev.os || "Windows 64-bit"} • Agent v{dev.version || "1.0"}
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            Last Heartbeat: {dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleTimeString() : "Never"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* STEP 4: Tunnel Health & Direct Phone Upload Endpoint */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0">
              4
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Cloudflare Tunnel & Upload Endpoint Health</h3>
                <p className="text-xs text-[#475569]">
                  Start-SOS-Print.bat automatically detects the tunnel URL and links it. Verify reachability here.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={tunnelUrlInput}
                  onChange={(e) => setTunnelUrlInput(e.target.value)}
                  placeholder="https://xxxx-xxxx.trycloudflare.com"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-[#0F172A] focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => primaryDevice && handleSaveTunnelUrl(primaryDevice.id)}
                  disabled={!primaryDevice || isSavingTunnelUrl}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                >
                  {isSavingTunnelUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                  Save & Verify Health Ping
                </button>
              </div>

              {tunnelStatusMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${tunnelStatusMsg.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
                  {tunnelStatusMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                  {tunnelStatusMsg.text}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 5: Physical Printer Mapping */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0">
              5
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Physical Printer Mapping</h3>
                  <p className="text-xs text-[#475569]">
                    Windows Spooler printers auto-discovered by the agent worker.
                  </p>
                </div>
                <Link
                  href="/dashboard/printers"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                >
                  Manage All Printers <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {printers.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#475569] flex items-center gap-2">
                  <PrinterIcon className="w-4 h-4 text-[#64748B] shrink-0" />
                  No printers reported yet. Launch Start-SOS-Print.bat on your shop PC to auto-detect installed queues.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {printers.map((pr) => (
                    <div key={pr.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#0F172A]">{pr.displayName || pr.queueName}</span>
                          {pr.isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          Sizes: {pr.capabilities?.paperSizes?.join(", ") || "A4"} • Color: {pr.capabilities?.colorSupported ? "Yes" : "B&W Only"}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pr.isOnline ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-200 text-slate-700"}`}>
                        {pr.isOnline ? "READY" : "OFFLINE"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* STEP 6: Commissioning Tests */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0">
              6
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">Commissioning Tests (End-to-End Verification)</h3>
                <p className="text-xs text-[#475569]">
                  Run controlled end-to-end tests to verify both file transfer and print dispatch before opening for customer orders.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Test Upload Action */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div>
                    <div className="font-bold text-xs text-[#0F172A] flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-emerald-600" />
                      Test 1: Direct Phone-to-PC Upload
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Transfers a sample document directly through the tunnel to the shop PC disk.
                    </p>
                  </div>
                  <button
                    onClick={handleTriggerCommissioningUpload}
                    disabled={isTriggeringTestUpload}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isTriggeringTestUpload ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                    Run Direct Upload Test
                  </button>
                  {testUploadResult && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
                      <div className="font-bold">{testUploadResult.message}</div>
                      {testUploadResult.localPath && <div>PC Path: {testUploadResult.localPath}</div>}
                      {testUploadResult.sizeBytes && <div>Size: {testUploadResult.sizeBytes} bytes</div>}
                    </div>
                  )}
                  {testUploadError && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 font-semibold">
                      {testUploadError}
                    </div>
                  )}
                </div>

                {/* Test Print Action */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div>
                    <div className="font-bold text-xs text-[#0F172A] flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      Test 2: Dispatch Spooler Print
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      Creates a test order and claims it for Windows Spooler physical printing.
                    </p>
                  </div>
                  <button
                    onClick={handleTriggerCommissioningPrint}
                    disabled={isTriggeringTestPrint}
                    className="w-full py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isTriggeringTestPrint ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PrinterIcon className="w-3.5 h-3.5" />}
                    Trigger Physical Test Print
                  </button>
                  {testPrintResult && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
                      <div className="font-bold">{testPrintResult.message}</div>
                      <div>Order: {testPrintResult.orderNumber}</div>
                    </div>
                  )}
                  {testPrintError && (
                    <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 font-semibold">
                      {testPrintError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 7: Customer QR Standee & Posters */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0">
              7
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#0F172A]">Counter Standee & Customer QR Poster</h3>
                  <p className="text-xs text-[#475569]">
                    Customers simply scan this QR code with their phone camera to open the instant upload and print page.
                  </p>
                </div>
                <Link
                  href="/dashboard/standee"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition inline-flex items-center gap-2 shrink-0"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Print A4 / A5 Posters
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
                {qrDataUrl && (
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0">
                    <img src={qrDataUrl} alt="Shop Customer QR" className="w-28 h-28" />
                  </div>
                )}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-[#0F172A]">Destination URL:</div>
                  <div className="font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 break-all">
                    {printUrl}
                  </div>
                  <p className="text-[#475569]">
                    Works with any mobile browser (Safari, Chrome) without requiring app install or customer login.
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(printUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold hover:text-emerald-800"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? "Link Copied!" : "Copy Customer Print Link"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
