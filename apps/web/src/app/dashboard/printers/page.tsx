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
  Network
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
      {/* Top Header Card */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <PrinterIcon className="w-5 h-5 text-emerald-400" />
            <span>Windows Printer Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage connected Windows PC print agents and discovered local print queues for {PRIMARY_PILOT_SHOP.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            className="p-2 rounded-lg bg-[#1f2937] hover:bg-[#374151] text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isOwnerOrManager && (
            <button
              type="button"
              disabled={isGeneratingCode}
              onClick={handleGeneratePairingCode}
              className="py-2 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow"
            >
              {isGeneratingCode ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Connect S2P Agent</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Connected Devices Section */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden shadow">
        <div className="p-4 border-b border-[#1f2937] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Connected Windows Agents</h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-slate-300">
            {devices.length} {devices.length === 1 ? "device" : "devices"}
          </span>
        </div>

        {devices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs space-y-2">
            <Laptop className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-300">No Windows Agents Connected Yet</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Click &quot;Connect S2P Agent&quot; above to generate a 5-minute pairing code, then run the S2P Windows Agent on the shop PC.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1f2937]">
            {devices.map((dev) => (
              <div key={dev.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{dev.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                        dev.status === "ONLINE"
                          ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                          : dev.status === "OFFLINE"
                          ? "bg-slate-800 text-slate-400 border border-slate-700"
                          : "bg-red-950/60 text-red-400 border border-red-500/30"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          dev.status === "ONLINE"
                            ? "bg-emerald-400 animate-pulse"
                            : dev.status === "OFFLINE"
                            ? "bg-slate-400"
                            : "bg-red-400"
                        }`}
                      />
                      <span>{dev.status}</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                    <span>Host: <strong className="text-slate-300">{dev.hostname}</strong></span>
                    <span>OS: <strong className="text-slate-300">{dev.windowsVersion}</strong></span>
                    <span>Agent: <strong className="text-slate-300">v{dev.agentVersion}</strong></span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Last heartbeat: {new Date(dev.lastHeartbeatAt).toLocaleTimeString()} ({new Date(dev.lastHeartbeatAt).toLocaleDateString()})</span>
                  </div>
                </div>

                {isOwnerOrManager && dev.status !== "REVOKED" && (
                  <button
                    type="button"
                    disabled={revokingDeviceId === dev.id}
                    onClick={() => handleRevokeDevice(dev.id)}
                    className="py-1.5 px-3 rounded bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-[11px] font-semibold transition flex items-center gap-1.5 self-start sm:self-center"
                  >
                    {revokingDeviceId === dev.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Revoke</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discovered Windows Printers Section */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden shadow">
        <div className="p-4 border-b border-[#1f2937] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PrinterIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Discovered Installed Windows Print Queues</h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1e293b] text-slate-300">
            {printers.length} {printers.length === 1 ? "queue" : "queues"}
          </span>
        </div>

        {printers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs space-y-2">
            <PrinterIcon className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-300">No Windows Printer Queues Discovered</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Once an S2P Windows Agent connects, it automatically reads installed Windows spooler queues and syncs them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
            {printers.map((p) => (
              <div
                key={p.id}
                className="bg-[#0b0f0e] border border-[#1f2937] rounded-lg p-4 space-y-2.5 text-xs hover:border-[#374151] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                      <span>{p.displayName}</span>
                      {p.isDefault && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/30">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">{p.queueName}</div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      p.isOnline
                        ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {p.isOnline ? "Online" : "Offline"}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <div>Driver: <strong className="text-slate-300">{p.driverName}</strong></div>
                  <div>Port: <strong className="text-slate-300">{p.portName}</strong></div>
                  <div className="flex items-center gap-1">
                    <span>Connection:</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#1e293b] text-emerald-400 font-bold text-[10px]">
                      {p.connectionType}
                    </span>
                  </div>
                </div>

                {p.capabilities && (
                  <div className="border-t border-[#1f2937] pt-2 flex flex-wrap gap-2 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-[#141d18] text-slate-300">
                      Sizes: {p.capabilities.paperSizes?.join(", ") || "A4"}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${p.capabilities.colorSupported ? "bg-emerald-950/40 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                      Color: {p.capabilities.colorSupported ? "Yes" : "B&W Only"}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded ${p.capabilities.duplexSupported ? "bg-emerald-950/40 text-emerald-400" : "bg-slate-800 text-slate-400"}`}>
                      Duplex: {p.capabilities.duplexSupported ? "Yes" : "Single"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pairing Code Modal */}
      {isPairingModalOpen && pairingCodeData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#111827] border border-[#1f2937] rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Laptop className="w-5 h-5 text-emerald-400" />
                <span>Connect Windows Agent</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPairingModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Run the S2P Windows Agent on your shop computer. Enter this short-lived pairing code when prompted.
            </p>

            {/* Code Box */}
            <div className="bg-[#0b0f0e] border border-emerald-500/30 rounded-xl p-6 text-center space-y-3">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Single-Use Pairing Code</div>
              <div className="font-mono text-4xl font-extrabold text-white tracking-widest selection:bg-emerald-500">
                {pairingCodeData.code}
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyCodeToClipboard}
                className="flex-1 py-2.5 rounded-lg bg-[#1f2937] hover:bg-[#374151] text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPairingModalOpen(false)}
                className="py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
              >
                Done
              </button>
            </div>

            <div className="bg-[#161e1b] border border-[#24322c] p-3 rounded-lg text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-emerald-400">Next Steps on Shop PC:</div>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Open PowerShell in <code className="text-slate-200">apps/agent</code></li>
                <li>Run: <code className="text-emerald-300 font-mono">dotnet run</code></li>
                <li>Paste code <strong className="text-white font-mono">{pairingCodeData.code}</strong></li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
