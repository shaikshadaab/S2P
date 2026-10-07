"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, AlertTriangle, Wifi, Globe } from "lucide-react";
import { BRAND_NAME, BRAND_FULL_NAME, PRIMARY_PILOT_SHOP, UpiPaymentUtils } from "@s2p/shared";

export default function StandeePage() {
  const [mode, setMode] = useState<"LOCAL_LAN" | "PRODUCTION">("LOCAL_LAN");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Dynamically detected local PC IP on Wi-Fi
  const localLanUrl = "http://192.168.1.123:3000/s/shakeel-online-services";
  const productionUrl = "https://s2p-shakeel.web.app/s/shakeel-online-services";

  const activeUrl = mode === "LOCAL_LAN" ? localLanUrl : productionUrl;

  useEffect(() => {
    let isMounted = true;
    UpiPaymentUtils.generateUpiQrDataUrl(activeUrl)
      .then((dataUrl) => {
        if (isMounted) setQrDataUrl(dataUrl);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [activeUrl]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Mode Switcher & Action Bar (Hidden when printing) */}
      <div className="print:hidden space-y-3">
        <div className="flex items-center justify-between bg-[#111827] border border-[#1f2937] p-4 rounded-xl">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Standee / Poster</span>
          </button>
        </div>

        {/* Development vs Production Selector */}
        <div className="bg-[#16202c] border border-blue-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="font-bold text-white">QR Mode:</span>
            <button
              onClick={() => setMode("LOCAL_LAN")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                mode === "LOCAL_LAN"
                  ? "bg-amber-600 text-white shadow"
                  : "bg-[#111827] text-slate-400 hover:text-white"
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>Development Wi-Fi (LAN IP)</span>
            </button>
            <button
              onClick={() => setMode("PRODUCTION")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                mode === "PRODUCTION"
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-[#111827] text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Production Domain (Phase 22+)</span>
            </button>
          </div>
          <span className="text-[10px] text-amber-300 font-mono">
            {mode === "LOCAL_LAN" ? "Active: Local Subnet Phone Testing" : "Active: Public Production"}
          </span>
        </div>
      </div>

      {/* Printable Physical Counter Standee Card */}
      <div className="bg-white text-slate-900 border-4 border-slate-900 rounded-2xl p-10 text-center shadow-2xl space-y-6 print:border-4 print:shadow-none print:m-0 print:p-8">
        {mode === "LOCAL_LAN" && (
          <div className="bg-amber-500 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>DEVELOPMENT QR — FOR LOCAL WI-FI TESTING ONLY</span>
          </div>
        )}

        {/* Standee Header */}
        <div className="space-y-2 border-b-2 border-slate-900 pb-5">
          <div className="inline-block bg-slate-900 text-white text-3xl font-black px-6 py-2 rounded-xl tracking-wider">
            {BRAND_NAME}
          </div>
          <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900">
            {BRAND_FULL_NAME}
          </h1>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
            Self-Service Cloud Print Station
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-6 max-w-xs mx-auto space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Shop QR Code" className="w-48 h-48 object-contain" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs font-semibold">
                Generating QR...
              </div>
            )}
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-700 block break-all">
            {activeUrl}
          </span>
        </div>

        {/* 5-Step Clear Instructions */}
        <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-6 text-left max-w-md mx-auto space-y-3.5">
          <div className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-300 pb-1.5 text-center">
            How to Print in 5 Simple Steps
          </div>
          <ol className="space-y-2.5 text-sm font-bold text-slate-900">
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">1</span>
              <span>Scan QR Code with your phone</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">2</span>
              <span>Upload Document (PDF or Photo)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">3</span>
              <span>Select Printing (B&amp;W / Color / Duplex)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">4</span>
              <span>Pay via PhonePe / UPI or Cash</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0">5</span>
              <span className="text-emerald-800">Collect Print when ready!</span>
            </li>
          </ol>
        </div>

        {/* Standee Shop Footer */}
        <div className="border-t-2 border-slate-900 pt-5">
          <div className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            {PRIMARY_PILOT_SHOP.name}
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-1">
            Fast • Affordable • Safe &amp; Private
          </p>
        </div>
      </div>
    </div>
  );
}