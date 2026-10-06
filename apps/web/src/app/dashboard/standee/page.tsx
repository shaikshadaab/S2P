"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Printer, QrCode } from "lucide-react";
import { BRAND_NAME, BRAND_FULL_NAME, PRIMARY_PILOT_SHOP } from "@s2p/shared";

export default function StandeePage() {
  const qrUrl = "https://s2p-shakeel.web.app/s/shakeel-online-services";

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Action Bar (Hidden when printing) */}
      <div className="print:hidden flex items-center justify-between bg-[#111827] border border-[#1f2937] p-4 rounded-xl">
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

      {/* Printable Physical Counter Standee Card */}
      <div className="bg-white text-slate-900 border-4 border-slate-900 rounded-2xl p-10 text-center shadow-2xl space-y-8 print:border-4 print:shadow-none print:m-0 print:p-8">
        {/* Standee Header */}
        <div className="space-y-2 border-b-2 border-slate-900 pb-6">
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
          <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex items-center justify-center">
            {/* Crisp QR Code Graphic using SVG */}
            <svg
              className="w-48 h-48"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="100" height="100" fill="white" />
              {/* Corner position markers */}
              <rect x="5" y="5" width="26" height="26" fill="black" />
              <rect x="8" y="8" width="20" height="20" fill="white" />
              <rect x="11" y="11" width="14" height="14" fill="black" />

              <rect x="69" y="5" width="26" height="26" fill="black" />
              <rect x="72" y="8" width="20" height="20" fill="white" />
              <rect x="75" y="11" width="14" height="14" fill="black" />

              <rect x="5" y="69" width="26" height="26" fill="black" />
              <rect x="8" y="72" width="20" height="20" fill="white" />
              <rect x="11" y="75" width="14" height="14" fill="black" />

              {/* Data pattern modules */}
              <rect x="36" y="8" width="5" height="5" fill="black" />
              <rect x="46" y="8" width="5" height="5" fill="black" />
              <rect x="56" y="8" width="5" height="5" fill="black" />
              <rect x="36" y="18" width="5" height="5" fill="black" />
              <rect x="56" y="18" width="5" height="5" fill="black" />
              <rect x="36" y="28" width="25" height="4" fill="black" />

              <rect x="8" y="36" width="5" height="5" fill="black" />
              <rect x="18" y="36" width="5" height="5" fill="black" />
              <rect x="8" y="46" width="5" height="5" fill="black" />
              <rect x="18" y="56" width="5" height="5" fill="black" />

              <rect x="69" y="36" width="5" height="5" fill="black" />
              <rect x="79" y="36" width="5" height="5" fill="black" />
              <rect x="89" y="46" width="5" height="5" fill="black" />
              <rect x="69" y="56" width="5" height="5" fill="black" />

              <rect x="36" y="40" width="28" height="20" fill="black" rx="2" />
              <text x="50" y="54" fill="white" fontSize="9" fontWeight="900" textAnchor="middle">S2P</text>

              <rect x="36" y="69" width="5" height="5" fill="black" />
              <rect x="46" y="79" width="5" height="5" fill="black" />
              <rect x="56" y="69" width="5" height="5" fill="black" />
              <rect x="36" y="89" width="15" height="5" fill="black" />
              <rect x="56" y="89" width="10" height="5" fill="black" />
              <rect x="69" y="79" width="25" height="5" fill="black" />
              <rect x="79" y="89" width="15" height="5" fill="black" />
            </svg>
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-700 block break-all">
            {qrUrl}
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
              <span>Select Printing (B&W / Color / Duplex)</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shrink-0">4</span>
              <span>Pay via Cash or UPI at Counter</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0">5</span>
              <span className="text-emerald-800">Collect Print when ready!</span>
            </li>
          </ol>
        </div>

        {/* Standee Shop Footer */}
        <div className="border-t-2 border-slate-900 pt-6">
          <div className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            {PRIMARY_PILOT_SHOP.name}
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-1">
            Fast • Affordable • Safe & Private
          </p>
        </div>
      </div>
    </div>
  );
}
