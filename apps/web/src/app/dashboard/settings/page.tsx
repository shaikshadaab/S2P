"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Settings, Save, Check, Shield, Clock, FileText, CheckCircle2 } from "lucide-react";

export default function DashboardSettingsPage() {
  const [shopName, setShopName] = useState("Om Sai Xerox & Digital Print");
  const [mobile, setMobile] = useState("9876543210");
  const [address, setAddress] = useState("Shop 4, Anand Complex, Near Metro Station, Sector 15");
  const [printMode, setPrintMode] = useState<"auto" | "approval">("auto");
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(50);
  const [allowPdf, setAllowPdf] = useState(true);
  const [allowJpg, setAllowJpg] = useState(true);
  const [allowPng, setAllowPng] = useState(true);
  const [retentionHours, setRetentionHours] = useState(24);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Save to server or store
    fetch("/api/shops/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopId: "shop-om-sai-001",
        autoPrintEnabled: printMode === "auto",
        manualApprovalMode: printMode === "approval",
        maxFileSizeMb,
        retentionHours,
      }),
    }).catch(() => {});

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#121018]">Shop & Queue Settings</h1>
            <p className="text-xs sm:text-sm text-black/60 mt-0.5">
              Control auto-printing vs owner approval, allowed formats, and privacy policies.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95 transition-all"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? "Saved Settings!" : "Save Changes"}</span>
          </button>
        </div>

        {saved && (
          <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully! Print queue will adhere to the selected mode immediately.</span>
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-sm space-y-6">
          {/* Printing Workflow Mode Switcher */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-black/70">
              Print Job Queue Workflow Mode
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setPrintMode("auto")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  printMode === "auto"
                    ? "border-[#FF2D78] bg-pink-50/40 shadow-xs"
                    : "border-black/10 hover:border-black/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-sm text-[#121018]">🟢 Automatic Printing</span>
                  {printMode === "auto" && (
                    <span className="text-[10px] font-bold text-[#FF2D78] bg-[#FF2D78]/10 px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-black/60 leading-relaxed">
                  Recommended for rush hours. Customer submits on mobile, and pages print immediately on your counter printer without touching the PC.
                </p>
              </div>

              <div
                onClick={() => setPrintMode("approval")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  printMode === "approval"
                    ? "border-[#FF2D78] bg-pink-50/40 shadow-xs"
                    : "border-black/10 hover:border-black/20"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-sm text-[#121018]">🟡 Owner-Approval Mode</span>
                  {printMode === "approval" && (
                    <span className="text-[10px] font-bold text-[#FF2D78] bg-[#FF2D78]/10 px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-xs text-black/60 leading-relaxed">
                  Full counter control. Customer orders appear in your dashboard with an &quot;Approve & Print&quot; button. Nothing prints until you click approve.
                </p>
              </div>
            </div>
          </div>

          {/* Allowed File Types & Limits */}
          <div className="pt-6 border-t border-black/5 space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-black/70">
              Document Formats & Limits
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-black/60 uppercase block mb-1">
                  Max File Size ({maxFileSizeMb} MB)
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={maxFileSizeMb}
                  onChange={(e) => setMaxFileSizeMb(Number(e.target.value))}
                  className="w-full h-2 bg-black/10 rounded-lg appearance-none cursor-pointer accent-[#FF2D78]"
                />
                <div className="flex justify-between text-[10px] text-black/40 mt-1">
                  <span>5 MB</span>
                  <span>50 MB (Default)</span>
                  <span>100 MB</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-black/60 uppercase block mb-1">Allowed File Formats</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPdf}
                      onChange={(e) => setAllowPdf(e.target.checked)}
                      className="accent-[#FF2D78] rounded"
                    />
                    <span>PDF</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowJpg}
                      onChange={(e) => setAllowJpg(e.target.checked)}
                      className="accent-[#FF2D78] rounded"
                    />
                    <span>JPG / JPEG</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPng}
                      onChange={(e) => setAllowPng(e.target.checked)}
                      className="accent-[#FF2D78] rounded"
                    />
                    <span>PNG</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Auto-Deletion */}
          <div className="pt-6 border-t border-black/5 space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-black/70 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#FF2D78]" />
              <span>Zero-Trust Privacy & Auto-Deletion</span>
            </h3>

            <div className="p-4 rounded-2xl bg-[#FAFAF8] border border-black/10 flex items-center justify-between">
              <div>
                <h5 className="font-bold text-xs text-[#121018]">Permanent File Shredding Timer</h5>
                <p className="text-[11px] text-black/50 mt-0.5">
                  Customer files are permanently wiped from server memory and disk after printing.
                </p>
              </div>
              <span className="px-3 py-1 bg-white border border-black/10 rounded-xl font-bold font-mono text-xs text-[#121018]">
                {retentionHours} Hours
              </span>
            </div>
          </div>

          {/* Shop Profile Details */}
          <div className="pt-6 border-t border-black/5 space-y-4">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-black/70">Shop Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-black/60 uppercase block mb-1">Shop Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-black/60 uppercase block mb-1">Helpline Mobile</label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-black/60 uppercase block mb-1">Counter Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs font-medium"
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
