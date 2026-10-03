"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Smartphone, CheckCircle2, ShieldCheck, Download, Printer, Zap } from "lucide-react";
import { Language } from "./navbar";

interface LandingHeroProps {
  lang: Language;
}

export function LandingHero({ lang }: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 bg-[#FDFDFD]">
      {/* Background subtle radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#FF2D78]/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Free Announcement Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1E1035] text-white text-xs font-bold mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#FF2D78] animate-ping" />
          <span className="text-[#FF2D78]">100% FREE:</span>
          <span>{lang === "hi" ? "कोई शुल्क नहीं • अनलिमिटेड प्रिंट्स • बिना किसी प्लान के" : "Zero Cost • Unlimited Prints • 100% Free Forever"}</span>
        </div>

        {/* Product Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#1E1035] max-w-5xl mx-auto leading-[1.12]">
          {lang === "hi" ? (
            <>
              दुकान का अपना <span className="text-[#FF2D78]">Free QR Print</span> सिस्टम
            </>
          ) : (
            <>
              Completely Free <span className="text-[#FF2D78]">QR-Based Printing</span> System
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg sm:text-2xl text-[#1E1035]/75 max-w-3xl mx-auto font-medium leading-relaxed">
          {lang === "hi"
            ? "ग्राहक काउंटर पर लगा QR स्कैन करके फाइल अपलोड करे, और आपकी दुकान के प्रिंटर से तुरंत प्रिंट निकले — बिना WhatsApp पर फाइल मँगाए, बिना पेनड्राइव लगाए!"
            : "Customers scan your shop QR with their phone, upload documents, and print ejects on your shop printer instantly — zero cables, zero virus pen-drives, zero WhatsApp congestion."}
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/onboarding"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#FF2D78] hover:bg-[#E0246A] text-white font-extrabold text-base px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <span>{lang === "hi" ? "🚀 फ्री में दुकान रजिस्टर करें" : "🚀 Create Free Shop Account"}</span>
            <ArrowRight className="w-5 h-5" />
          </Link>

          <a
            href="/downloads/VinthaPrintAgentSetup.exe"
            download="VinthaPrintAgentSetup.exe"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-[#1E1035] hover:bg-[#2D194F] text-white font-extrabold text-base px-7 py-4 rounded-2xl shadow-sm transition-all active:scale-95"
          >
            <Download className="w-5 h-5 text-[#FF2D78]" />
            <span>{lang === "hi" ? "💻 Windows एजेंट (.exe) डाउनलोड" : "💻 Download Agent (.exe)"}</span>
          </a>

          <Link
            href="/shop/om-sai-print"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white hover:bg-gray-50 text-[#1E1035] border border-black/10 font-extrabold text-base px-6 py-4 rounded-2xl shadow-sm transition-all active:scale-95"
          >
            <Smartphone className="w-5 h-5 text-[#FF2D78]" />
            <span>{lang === "hi" ? "📱 कस्टमर पेज देखें" : "📱 Customer Upload Demo"}</span>
          </Link>
        </div>

        {/* Feature Highlights Trust Strip */}
        <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-4 sm:gap-8 p-4 bg-white rounded-3xl border border-black/5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1E1035]">
            <CheckCircle2 className="w-4 h-4 text-[#FF2D78]" />
            <span>No Fees or Pricing Ever</span>
          </div>

          <div className="h-4 w-px bg-black/10 hidden sm:block" />

          <div className="flex items-center gap-2 text-xs font-bold text-[#1E1035]">
            <Printer className="w-4 h-4 text-[#FF2D78]" />
            <span>Supports All Windows Printers</span>
          </div>

          <div className="h-4 w-px bg-black/10 hidden sm:block" />

          <div className="flex items-center gap-2 text-xs font-bold text-[#1E1035]">
            <ShieldCheck className="w-4 h-4 text-[#FF2D78]" />
            <span>Outward Connection (No Router Port Config)</span>
          </div>

          <div className="h-4 w-px bg-black/10 hidden sm:block" />

          <div className="flex items-center gap-2 text-xs font-bold text-[#1E1035]">
            <Zap className="w-4 h-4 text-[#FF2D78]" />
            <span>Auto-Print & Owner-Approval Modes</span>
          </div>
        </div>
      </div>
    </section>
  );
}
