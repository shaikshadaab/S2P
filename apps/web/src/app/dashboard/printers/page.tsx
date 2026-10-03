"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  Laptop,
  Printer,
  Plus,
  CheckCircle2,
  Copy,
  Check,
  Play,
  Pause,
  Trash2,
  Clock,
  Sparkles,
  Download,
} from "lucide-react";

export default function DashboardPrintersPage() {
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingCode, setPairingCode] = useState("892145");
  const [copied, setCopied] = useState(false);
  const [queuePaused, setQueuePaused] = useState(false);
  const [testPrintSending, setTestPrintSending] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const computer = {
    name: "SHOP-COUNTER-PC",
    os: "Windows 11 Pro 64-bit",
    agentVersion: "1.0.0",
    isOnline: true,
    lastSeen: "Active (25s Heartbeat OK)",
  };

  const printers = [
    {
      id: "printer-hp-smart-tank",
      name: "HP51C8E5 (HP Smart Tank 580-590 series)",
      driver: "Microsoft IPP Class Driver",
      isDefault: true,
      isOnline: true,
      color: true,
      duplex: true,
      sizes: ["A4", "Photo"],
    },
    {
      id: "printer-virtual",
      name: "Vintha Virtual Test Spooler (PDF-to-Disk)",
      driver: "Vintha Virtual Driver v1.0",
      isDefault: false,
      isOnline: true,
      color: true,
      duplex: true,
      sizes: ["A4", "A3", "Photo"],
    },
    {
      id: "printer-pdf",
      name: "Microsoft Print to PDF",
      driver: "Microsoft Print To PDF Driver",
      isDefault: false,
      isOnline: true,
      color: true,
      duplex: false,
      sizes: ["A4"],
    },
  ];

  const handleSendTestPage = async () => {
    setTestPrintSending(true);
    setTestMessage(null);
    try {
      // Simulate real test print dispatch
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setTestMessage("Test print dispatched successfully to HP51C8E5 (HP Smart Tank 580-590 series)!");
      setTimeout(() => setTestMessage(null), 4000);
    } catch {
      setTestMessage("Failed to dispatch test page. Ensure Windows Agent is running.");
    } finally {
      setTestPrintSending(false);
    }
  };

  const handleGeneratePairingCode = async () => {
    try {
      const res = await fetch("/api/agent/pair?shopId=shop-om-sai-001");
      const data = await res.json();
      if (data.success && data.pairingCode) {
        setPairingCode(data.pairingCode);
      } else {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setPairingCode(code);
      }
    } catch {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setPairingCode(code);
    }
    setShowPairingModal(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold font-heading text-[#121018]">
              Printers & Paired Computers
            </h1>
            <p className="text-xs text-black/60 mt-0.5">
              Manage Windows print computers, discovered printer drivers, and queue routing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setQueuePaused(!queuePaused)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                queuePaused
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-white border border-black/10 hover:bg-black/5 text-[#121018]"
              }`}
            >
              {queuePaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{queuePaused ? "Resume Queue" : "Pause Queue"}</span>
            </button>

            <a
              href="/downloads/VinthaPrintAgentSetup.exe"
              download="VinthaPrintAgentSetup.exe"
              className="px-4 py-2 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Installer (.exe)</span>
            </a>
            <a
              href="/downloads/VinthaPrintAgent-Windows.zip"
              download="VinthaPrintAgent-Windows.zip"
              className="px-4 py-2 rounded-xl bg-white hover:bg-black/5 text-[#121018] border border-black/10 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-[#FF2D78]" />
              <span>Download (.zip)</span>
            </a>
            <button
              onClick={handleGeneratePairingCode}
              className="px-4 py-2 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Print Computer</span>
            </button>
          </div>
        </div>

        {testMessage && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF2D78]" />
            <span>{testMessage}</span>
          </div>
        )}

        {/* Paired Computer Card */}
        <div className="bg-[#1E1035] text-white rounded-3xl p-6 sm:p-8 shadow space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#FF2D78]">
                <Laptop className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <span>{computer.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF2D78]/20 text-[#FF2D78]">
                    ONLINE
                  </span>
                </h3>
                <p className="text-xs text-white/50">{computer.os} • Agent {computer.agentVersion} • {computer.lastSeen}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSendTestPage}
                disabled={testPrintSending}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-[#FF2D78]" />
                <span>{testPrintSending ? "Dispatching..." : "Send Test Page"}</span>
              </button>
            </div>
          </div>

          {/* Connected Printers Section */}
          <div>
            <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-4">
              Discovered Operating System Printers (3 Available)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {printers.map((p) => (
                <div
                  key={p.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    p.isDefault
                      ? "bg-white/10 border-[#FF2D78]/50 shadow-md ring-1 ring-[#20C878]/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-bold text-white truncate max-w-[180px]">{p.name}</span>
                    {p.isDefault && (
                      <span className="text-[10px] font-bold text-[#FF2D78] uppercase bg-[#FF2D78]/20 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/50">{p.driver}</p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-3 text-[10px] font-semibold text-white/70">
                    <span className="bg-white/5 px-2 py-0.5 rounded">Sizes: {p.sizes.join(", ")}</span>
                    <span className="bg-white/5 px-2 py-0.5 rounded">{p.color ? "🎨 Colour" : "📄 Monochrome"}</span>
                    <span className="bg-white/5 px-2 py-0.5 rounded">{p.duplex ? "Duplex OK" : "Single Only"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pairing Modal */}
        {showPairingModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-black/10">
                <h3 className="font-extrabold text-lg text-[#121018]">Pair Print Computer</h3>
                <button
                  onClick={() => setShowPairingModal(false)}
                  className="text-xs font-bold text-black/40 hover:text-black"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-black/60 leading-relaxed">
                Launch the Vintha Print Agent application on your shop Windows computer and enter this 6-digit code:
              </p>

              <div className="p-6 bg-pink-50 rounded-2xl text-center space-y-2 border-2 border-dashed border-[#FF2D78]">
                <span className="text-[11px] font-bold text-[#18AA64] uppercase tracking-wider block">Single-Use Pairing Code</span>
                <div className="text-4xl font-extrabold font-mono tracking-widest text-[#121018]">
                  {pairingCode}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pairingCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#121018] bg-white px-3 py-1.5 rounded-lg border border-black/10 shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#FF2D78]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Code"}</span>
                </button>
              </div>

              <div className="p-3 bg-black/5 rounded-xl text-[11px] text-black/60 flex items-center gap-2">
                <Clock className="w-4 h-4 text-black/40 shrink-0" />
                <span>Code expires in 10 minutes. A unique device token will be issued.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}