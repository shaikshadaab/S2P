"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Download, Wifi, Globe, Smartphone, QrCode } from "lucide-react";
import { BRAND_NAME, BRAND_FULL_NAME, PRIMARY_PILOT_SHOP, UpiPaymentUtils } from "@s2p/shared";

export default function StandeePage() {
  const [size, setSize] = useState<"A4" | "A5">("A4");
  const [customOrigin, setCustomOrigin] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCustomOrigin(window.location.origin);
    }
  }, []);

  const activeUrl = customOrigin
    ? `${customOrigin}/s/shakeel-online-services`
    : `https://shakeel-online-services.web.app/s/shakeel-online-services`;

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
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
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
          <div className="flex items-center gap-2">
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download="Shakeel-Online-Services-QR.png"
                className="px-3.5 py-2 bg-[#1f2937] hover:bg-[#374151] border border-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download PNG</span>
              </a>
            )}
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print {size} Poster</span>
            </button>
          </div>
        </div>

        {/* Poster Size Selector & URL Bar */}
        <div className="bg-[#16202c] border border-emerald-500/30 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Poster Size:</span>
            <button
              onClick={() => setSize("A4")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                size === "A4"
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-[#111827] text-slate-400 hover:text-white"
              }`}
            >
              A4 Standard
            </button>
            <button
              onClick={() => setSize("A5")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                size === "A5"
                  ? "bg-emerald-600 text-white shadow"
                  : "bg-[#111827] text-slate-400 hover:text-white"
              }`}
            >
              A5 Compact Desk
            </button>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 truncate max-w-sm">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{activeUrl}</span>
          </div>
        </div>
      </div>

      {/* Printable Counter Standee Poster */}
      <div
        className={`bg-white text-slate-900 border-4 border-slate-900 rounded-2xl ${
          size === "A5" ? "p-6" : "p-10"
        } text-center shadow-2xl space-y-6 print:border-4 print:shadow-none print:m-0 ${
          size === "A5" ? "print:p-6" : "print:p-8"
        }`}
      >
        {/* Standee Header */}
        <div className="space-y-1.5 border-b-2 border-slate-900 pb-4">
          <div className="inline-block bg-slate-900 text-white text-2xl sm:text-3xl font-black px-6 py-2 rounded-xl tracking-wider">
            {BRAND_NAME}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-slate-900 mt-2">
            {PRIMARY_PILOT_SHOP.name}
          </h1>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
            Self-Service Mobile Print Station &bull; Guntur, AP
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-slate-50 border-2 border-slate-900 rounded-2xl p-5 max-w-xs mx-auto space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Shop QR Code" className="w-48 h-48 object-contain" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs font-semibold">
                Generating QR...
              </div>
            )}
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-900 block flex items-center justify-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              Scan with Any Phone Camera / UPI App
            </span>
            <span className="text-[10px] font-mono text-slate-500 block break-all">
              {activeUrl}
            </span>
          </div>
        </div>

        {/* 4-Step Simple Customer Flow */}
        <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-5 text-left max-w-md mx-auto space-y-2.5">
          <div className="text-xs font-black uppercase tracking-wider text-slate-600 border-b border-slate-300 pb-1.5 text-center">
            Print in 4 Simple Steps &bull; No App Needed
          </div>
          <ol className="space-y-2 text-xs sm:text-sm font-bold text-slate-900">
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">1</span>
              <span>Scan QR Code with your phone</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">2</span>
              <span>Upload Document (PDF / Photo / ID Card)</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">3</span>
              <span>Choose B&amp;W or Color &bull; Pay via PhonePe / Cash</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0">4</span>
              <span className="text-emerald-800">Collect freshly printed pages!</span>
            </li>
          </ol>
        </div>

        {/* Standee Shop Footer */}
        <div className="border-t-2 border-slate-900 pt-4 space-y-1">
          <div className="text-lg font-black tracking-tight text-slate-900 uppercase">
            {PRIMARY_PILOT_SHOP.name}
          </div>
          <p className="text-xs font-semibold text-slate-600">
            PhonePe / Mobile: 9581529381 &bull; Guntur, Andhra Pradesh
          </p>
          <p className="text-[10px] text-slate-500 font-medium">
            Zero-Trace Privacy &bull; Files automatically deleted after printing
          </p>
        </div>
      </div>
    </div>
  );
}
