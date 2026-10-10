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
  Cpu
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, Printer, Device } from "@s2p/shared";
import { useAuth } from "../../../lib/firebase/auth-context";

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

  const isOwnerOrManager = role === "OWNER" || role === "MANAGER";

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
    const interval = setInterval(fetchData, 5000);
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

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm("Are you sure you want to revoke this agent? It will immediately disconnect and fail all future requests.")) {
      return;
    }
    setRevokingDeviceId(deviceId);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/devices/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ deviceId, shopId: PRIMARY_PILOT_SHOP.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to revoke device");
      }
      await fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error revoking device";
      alert(msg);
    } finally {
      setRevokingDeviceId(null);
    }
  };

  const copyCodeToClipboard = () => {
    if (!pairingCodeData) return;
    navigator.clipboard.writeText(pairingCodeData.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 1. Prominent Windows Print Agent Download Card */}
      <div className="bg-white border-2 border-emerald-500/50 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                Official Release · v1.0.0 LTS
              </span>
              <span className="text-xs text-[#475569] font-medium flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                Windows Spooler Agent
              </span>
            </div>

            <h2 className="text-xl font-black text-[#111827] tracking-tight">
              Download SOS Print Windows Agent
            </h2>

            <p className="text-xs text-[#475569] leading-relaxed">
              Install the official SOS Print user-session agent on your shop Windows PC. It listens for verified customer orders, downloads encrypted print files, and sends them directly to your physical HP Smart Tank printer via the Windows Print Spooler.
            </p>

            {/* Prerequisites & Quick Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
                <div className="text-[10px] uppercase font-bold text-[#475569]">System Requirement</div>
                <div className="text-xs font-bold text-[#111827] mt-0.5">Windows 10 / 11 (64-bit)</div>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
                <div className="text-[10px] uppercase font-bold text-[#475569]">Runtime Prerequisite</div>
                <div className="text-xs font-bold text-[#111827] mt-0.5">.NET 8 Desktop Runtime</div>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
                <div className="text-[10px] uppercase font-bold text-[#475569]">Package Contents</div>
                <div className="text-xs font-bold text-[#111827] mt-0.5">Worker EXE, Scripts & SQLite</div>
              </div>
            </div>
          </div>

          {/* Action Column */}
          <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0 w-full lg:w-auto">
            <a
              href="/SOS-Print-Agent-Package.zip"
              download="SOS-Print-Agent-Package.zip"
              className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 text-center"
            >
              <Download className="w-4 h-4" />
              <span>Download SOS Print Windows Agent (ZIP)</span>
            </a>
            <div className="text-[11px] text-[#475569] text-center sm:text-right space-y-0.5">
              <p>Package: <span className="font-mono font-bold text-[#111827]">SOS-Print-Agent-Package.zip (5.0 MB)</span></p>
              <p className="text-[10px] font-mono text-slate-500 break-all">SHA-256: A3EDEF14FB66B25E894D2C933812C067E4A7B2032E17CF8BF5A2E113773BE507</p>
              <p className="text-[10px] text-emerald-700 font-semibold">Build: Release v1.0.0 (LTS) · Source Commit: 1068489</p>
            </div>
          </div>
        </div>

        {/* 10-Step Windows Agent Setup Checklist */}
        <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Standard 10-Step Agent Setup & Commissioning Procedure</span>
            </h3>
            <span className="text-[11px] text-[#475569] font-medium">Windows User Session</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span className="font-bold text-[#111827]">Driver Setup</span>
              </div>
              <p className="text-[11px] text-[#475569]">Install official Windows print driver for your physical printer.</p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span className="font-bold text-[#111827]">Test Page</span>
              </div>
              <p className="text-[11px] text-[#475569]">Confirm a Windows standard test page prints successfully.</p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                <span className="font-bold text-[#111827]">Extract Agent</span>
              </div>
              <p className="text-[11px] text-[#475569]">Download and unzip package to e.g. <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">C:\SOSPrint</code>.</p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                <span className="font-bold text-[#111827]">Hosted URL</span>
              </div>
              <p className="text-[11px] text-[#475569]">Configure <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">https://sos-print.vercel.app</code> in config if needed.</p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">5</span>
                <span className="font-bold text-[#111827]">Pairing Code</span>
              </div>
              <p className="text-[11px] text-[#475569]">Click "Pair New Windows PC" below to generate a single-use code.</p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">6</span>
                <span className="font-bold text-[#111827]">Enter Code</span>
              </div>
              <p className="text-[11px] text-[#475569]">Enter the 6-digit code in the Windows agent terminal.</p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">7</span>
                <span className="font-bold text-[#111827]">Review Printers</span>
              </div>
              <p className="text-[11px] text-[#475569]">Review detected local and network print queues reported by agent.</p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">8</span>
                <span className="font-bold text-[#111827]">Map Services</span>
              </div>
              <p className="text-[11px] text-[#475569]">Assign paper sizes, colour/mono profiles, and duplex settings.</p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">9</span>
                <span className="font-bold text-[#111827]">Authorized Test</span>
              </div>
              <p className="text-[11px] text-[#475569]">Trigger an authorized test print from the dashboard queue.</p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">10</span>
                <span className="font-bold text-[#111827]">Confirm Output</span>
              </div>
              <p className="text-[11px] text-[#475569]">Verify physical paper output before unpausing customer intake.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
            <PrinterIcon className="w-5 h-5 text-emerald-600" />
            <span>Connected Devices & Printers</span>
          </h2>
          <p className="text-xs text-[#475569] mt-0.5">
            Manage paired Windows PC print agents and discovered local print queues for {PRIMARY_PILOT_SHOP.name}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-[#475569] hover:text-[#111827] transition shrink-0"
            title="Refresh Devices"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          {isOwnerOrManager && (
            <button
              onClick={handleGeneratePairingCode}
              disabled={isGeneratingCode}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
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

      {/* Devices Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
            <Laptop className="w-4 h-4 text-emerald-600" />
            <span>Paired Windows PCs ({devices.length})</span>
          </h3>
          <span className="text-[11px] text-[#475569]">
            Active heartbeats report every 15-30s
          </span>
        </div>

        {devices.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#475569]">
              <Laptop className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#111827]">No Windows PC Paired Yet</h4>
              <p className="text-xs text-[#475569] max-w-sm mx-auto">
                Download the Windows Agent above, extract on your shop PC, and click "Pair New Windows PC" to register it with this dashboard.
              </p>
            </div>
            {isOwnerOrManager && (
              <button
                onClick={handleGeneratePairingCode}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Generate Pairing Code</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {devices.map((device) => {
              const lastSeenMs = device.lastSeen ? Date.now() - new Date(device.lastSeen).getTime() : Infinity;
              const isOnline = lastSeenMs < 90000; // 90 seconds threshold

              return (
                <div
                  key={device.id}
                  className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-[#475569]"
                      }`}>
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#111827]">
                            {device.name || "Shop Windows PC"}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOnline
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-slate-100 text-[#475569] border border-slate-300"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-600 animate-pulse" : "bg-slate-400"}`} />
                            {isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[#475569] mt-0.5">
                          ID: {device.id}
                        </p>
                      </div>
                    </div>

                    {isOwnerOrManager && (
                      <button
                        onClick={() => handleRevokeDevice(device.id)}
                        disabled={revokingDeviceId === device.id}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                        title="Revoke Device Credentials"
                      >
                        {revokingDeviceId === device.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                    <div>
                      <span className="text-[#475569]">Discovered Queues:</span>{" "}
                      <span className="font-bold text-[#111827]">{device.printerCount || 0} printers</span>
                    </div>
                    <div>
                      <span className="text-[#475569]">Agent Version:</span>{" "}
                      <span className="font-mono text-[#111827]">{device.version || "1.0.0 LTS"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[#475569]">Last Heartbeat:</span>{" "}
                      <span className="text-[#111827] font-medium">
                        {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : "Never"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Discovered Printers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
            <PrinterIcon className="w-4 h-4 text-emerald-600" />
            <span>Discovered Windows Spooler Queues ({printers.length})</span>
          </h3>
          <span className="text-[11px] text-[#475569]">
            Synced automatically from paired PC
          </span>
        </div>

        {printers.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center space-y-2">
            <PrinterIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-[#475569]">
              No local printers discovered. Make sure your paired agent is running and has access to Windows Spooler.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Printer Name</th>
                    <th className="py-3 px-4">Driver / Model</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Duplex</th>
                    <th className="py-3 px-4">Color</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {printers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-[#111827]">
                        {p.displayName || p.queueName}
                      </td>
                      <td className="py-3 px-4 text-[#475569]">
                        {p.driverName || "Standard Driver"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#475569]">
                          {p.connectionType || "USB / Network"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#475569]">
                        {p.capabilities?.duplexSupported ? "Supported" : "Single Only"}
                      </td>
                      <td className="py-3 px-4 text-[#475569]">
                        {p.capabilities?.colorSupported ? "Color & B&W" : "B&W Only"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pairing Code Modal */}
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
                className="text-[#475569] hover:text-[#111827] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed">
              Launch <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-bold">start-agent.bat</code> on your shop PC and type this single-use pairing code when prompted:
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
                className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-[#111827] font-bold text-xs transition flex items-center justify-center gap-2"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
              </button>
              <button
                onClick={() => setIsPairingModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
