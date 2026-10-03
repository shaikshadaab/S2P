"use client";

import React, { useState } from "react";
import { Laptop, Download, Copy, Check } from "lucide-react";

interface StepPrinterProps {
  formData: any;
  updateField: (field: string, value: any) => void;
  pairingSuccess: boolean;
  setPairingSuccess: (val: boolean) => void;
}

export function StepPrinter({
  formData,
  updateField,
  pairingSuccess,
  setPairingSuccess,
}: StepPrinterProps) {
  const [copiedCode, setCopiedCode] = useState(false);

  const handleGenerateNewCode = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    updateField("pairingCode", newCode);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold font-heading">Step 6: Pair Shop Counter Computer</h2>
        <p className="text-sm text-black/60 mt-1">
          Connect your Windows computer and USB/Network printer to enable silent automatic printing.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-[#121018] text-white space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-[#20C878]" />
            <span className="font-bold text-sm">Vintha Print Agent for Windows (64-bit)</span>
          </div>
          <span className="text-xs bg-[#20C878]/20 text-[#20C878] font-mono px-2.5 py-0.5 rounded-full">
            v1.0.0 Ready
          </span>
        </div>

        <div className="text-xs text-white/70 space-y-1.5 leading-relaxed">
          <p>1. Download and run <strong>VinthaPrintAgentSetup.exe</strong> on your shop Windows 10/11 PC.</p>
          <p>2. Enter the temporary 6-digit pairing code below when prompted.</p>
          <p>3. The agent will discover your printers and automatically begin listening for paid orders.</p>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <a
            href="/downloads/VinthaPrintAgent-Windows.zip"
            download="VinthaPrintAgent-Windows.zip"
            className="inline-flex items-center gap-2 bg-[#20C878] hover:bg-[#18AA64] text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Windows Print Agent (.zip)</span>
          </a>
          <a
            href="/downloads/Start-VinthaPrintAgent.bat"
            download="Start-VinthaPrintAgent.bat"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg border border-white/20 transition-all"
          >
            <span>One-Click Batch Launcher</span>
          </a>
        </div>
      </div>

      <div className="p-6 rounded-2xl border-2 border-dashed border-[#20C878] bg-[#E8FAF1]/30 text-center space-y-3">
        <span className="text-xs font-bold text-[#18AA64] uppercase tracking-wider block">
          Your 6-Digit Computer Pairing Code
        </span>
        <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-widest text-[#121018]">
          {formData.pairingCode}
        </div>
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(formData.pairingCode);
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2000);
            }}
            className="text-xs font-bold text-black/70 hover:text-black flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-black/10"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-[#20C878]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
          </button>
          <button
            type="button"
            onClick={handleGenerateNewCode}
            className="text-xs font-bold text-[#6D3AE8] hover:underline"
          >
            Generate New Code
          </button>
        </div>
        <p className="text-[11px] text-black/50">Valid for 10 minutes • Single-use cryptographic token</p>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-black/10 bg-white">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              pairingSuccess ? "bg-[#20C878]" : "bg-amber-400 animate-pulse"
            }`}
          />
          <div>
            <p className="text-xs font-bold">
              {pairingSuccess ? "Shop Computer Paired Successfully!" : "Waiting for Windows Print Agent connection..."}
            </p>
            <p className="text-[11px] text-black/50">
              {pairingSuccess
                ? "Printer: Canon imageRUNNER 2525 • Status: Online & Ready"
                : "Enter the code on your shop PC, or click simulate to test right away"}
            </p>
          </div>
        </div>

        {!pairingSuccess && (
          <button
            type="button"
            onClick={() => setPairingSuccess(true)}
            className="text-xs font-bold text-[#20C878] hover:underline px-3 py-1.5 bg-[#E8FAF1] rounded-lg"
          >
            Simulate Agent Connect
          </button>
        )}
      </div>
    </div>
  );
}
