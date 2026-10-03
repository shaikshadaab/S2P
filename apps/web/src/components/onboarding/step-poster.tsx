"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, QrCode, ShieldCheck, Download, ExternalLink } from "lucide-react";

interface StepPosterProps {
  formData: any;
}

export function StepPoster({ formData }: StepPosterProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold font-heading text-[#121018]">Your Official Shop QR Poster</h2>
        <p className="text-xs sm:text-sm text-black/60 mt-1">
          High-resolution printable posters for your counter and entrance wall are ready.
        </p>
      </div>

      <div className="p-8 rounded-3xl bg-gradient-to-b from-[#1E1035] via-[#2A1448] to-[#121018] text-white max-w-sm mx-auto shadow-2xl text-center space-y-4 border border-white/10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold text-[#FF2D78]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>VINTHA 100% FREE AUTOMATIC PRINT</span>
        </div>

        <div className="text-2xl font-black font-heading text-white tracking-tight">
          SCAN • UPLOAD • PRINT
        </div>

        <div className="p-5 bg-white rounded-3xl inline-block shadow-md">
          <div className="w-44 h-44 bg-white flex flex-col items-center justify-center text-black rounded-xl p-2 relative border border-black/10">
            <QrCode className="w-36 h-36 text-black" />
            <span className="text-[9px] font-mono tracking-tighter bg-[#121018] text-white px-2 py-0.5 rounded font-bold mt-1">
              /shop/{formData.slug}
            </span>
          </div>
        </div>

        <div>
          <h4 className="font-extrabold text-base text-[#FF2D78] font-heading">{formData.shopName}</h4>
          <p className="text-xs text-white/70 mt-0.5">{formData.address}, {formData.city}</p>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-center gap-2 text-xs text-white/80 font-bold">
          <ShieldCheck className="w-4 h-4 text-[#FF2D78]" />
          <span>100% Free · No Payment Gateway Required</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard/qr-posters"
          className="px-5 py-2.5 rounded-xl bg-[#FF2D78] text-white font-bold text-xs hover:bg-[#E0246A] flex items-center gap-2 shadow-md shadow-pink-500/20 transition-all active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Open QR & Poster Studio (PDF Download)</span>
        </Link>
      </div>
    </div>
  );
}
