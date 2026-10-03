"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Cpu, ArrowRight, FileText, Printer, Sparkles, Zap, Clock } from "lucide-react";
import { Language } from "./navbar";

interface LandingFeaturesProps {
  lang: Language;
}

export function LandingFeatures({ lang }: LandingFeaturesProps) {
  return (
    <>
      {/* Interactive Demonstration Section */}
      <section className="py-20 bg-[#121018] text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#20C878] text-xs font-bold mb-4">
                <Cpu className="w-3.5 h-3.5" />
                <span>REALTIME ARCHITECTURE</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold font-heading tracking-tight leading-tight">
                {lang === "hi"
                  ? "दुकानदार को माउस छूने की भी ज़रूरत नहीं"
                  : "Shop Owners Never Touch The Mouse"}
              </h2>
              <p className="mt-5 text-white/70 text-base leading-relaxed">
                {lang === "hi"
                  ? "पारंपरिक दुकानों में ग्राहक व्हाट्सएप पर फाइल भेजता है, दुकानदार डाउनलोड करता है, प्रिंट डायलॉग खोलता है, फिर कैश मांगता है। Vintha Print इस 5 मिनट के झंझट को 10 सेकंड के ऑटोमैटिक फ्लो में बदल देता है।"
                  : "Eliminate the painful 5-minute cycle of WhatsApp downloads, virus-infected pen-drives, manual print settings, and awkward payment chasing. Everything happens automatically."}
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#20C878]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#20C878]" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm">Cryptographic PhonePe Payment Verification</h5>
                    <p className="text-xs text-white/60">Jobs enter the spooler only after signed webhook confirms payment in paise.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#20C878]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#20C878]" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm">Windows Silent Print Agent</h5>
                    <p className="text-xs text-white/60">Lightweight tray daemon detects Canon, HP, Epson, Brother drivers and prints silently.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#20C878]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-[#20C878]" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm">Auto File Shredding</h5>
                    <p className="text-xs text-white/60">All customer PDFs and photos are automatically wiped from cloud and local disks.</p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <Link
                  href="/shop/om-sai-print"
                  className="inline-flex items-center gap-2 bg-[#20C878] hover:bg-[#18AA64] text-white font-bold px-6 py-3.5 rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  <span>Experience Customer Mobile View</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="bg-[#1C1827] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-white/50 ml-2 font-mono">Vintha Print Agent - Windows 11</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#20C878]/20 text-[#20C878] border border-[#20C878]/30">
                    Agent Online • 25ms
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[#20C878] font-semibold">[ORDER #VNT-8942] PAID VIA PHONEPE</p>
                      <p className="text-white/60">Aadhaar_Card.pdf • 2 Sides • B&W Duplex</p>
                    </div>
                    <span className="text-white/80 font-bold">₹3.50</span>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[#6D3AE8] font-semibold">[SPOOLING] CANON IR2525 UFRII</p>
                      <p className="text-white/60">Silent Print • Driver OK • 0 Errors</p>
                    </div>
                    <span className="text-[#20C878] font-bold">COMPLETED</span>
                  </div>

                  <div className="p-3 bg-[#20C878]/10 rounded-lg border border-[#20C878]/30 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#20C878]" />
                    <span className="text-white font-medium">Customer saw live status: &quot;Printed Successfully&quot;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Print Settings Grid */}
      <section id="features" className="py-20 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs uppercase tracking-widest text-[#20C878] font-bold mb-2">
              COMPREHENSIVE SETTINGS
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold font-heading text-[#121018]">
              {lang === "hi" ? "दुकानदार के मनपसंद सभी प्रिंट ऑप्शन्स" : "Every Print Configuration Supported"}
            </h3>
            <p className="mt-3 text-base text-[#121018]/70">
              Only options supported by your active printer driver are presented to customers.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="vintha-card p-5 text-center hover:scale-105 transition-transform">
              <div className="w-10 h-10 mx-auto rounded-xl bg-black/5 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-[#121018]" />
              </div>
              <h5 className="font-bold text-sm">B&W & Colour</h5>
              <p className="text-xs text-black/60 mt-1">Automatic driver switching</p>
            </div>

            <div className="vintha-card p-5 text-center hover:scale-105 transition-transform">
              <div className="w-10 h-10 mx-auto rounded-xl bg-black/5 flex items-center justify-center mb-3">
                <Printer className="w-5 h-5 text-[#20C878]" />
              </div>
              <h5 className="font-bold text-sm">Single & Duplex</h5>
              <p className="text-xs text-black/60 mt-1">Long-edge & short-edge</p>
            </div>

            <div className="vintha-card p-5 text-center hover:scale-105 transition-transform">
              <div className="w-10 h-10 mx-auto rounded-xl bg-black/5 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-[#6D3AE8]" />
              </div>
              <h5 className="font-bold text-sm">A4, A3 & Photo</h5>
              <p className="text-xs text-black/60 mt-1">All standard tray sizes</p>
            </div>

            <div className="vintha-card p-5 text-center hover:scale-105 transition-transform">
              <div className="w-10 h-10 mx-auto rounded-xl bg-black/5 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-[#F23868]" />
              </div>
              <h5 className="font-bold text-sm">Custom Ranges</h5>
              <p className="text-xs text-black/60 mt-1">1-3, 5, 8-10, odd/even</p>
            </div>

            <div className="vintha-card p-5 text-center hover:scale-105 transition-transform">
              <div className="w-10 h-10 mx-auto rounded-xl bg-black/5 flex items-center justify-center mb-3">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <h5 className="font-bold text-sm">1, 2, 4 Per Sheet</h5>
              <p className="text-xs text-black/60 mt-1">N-up page economics</p>
            </div>

            <div className="vintha-card p-5 text-center hover:scale-105 transition-transform">
              <div className="w-10 h-10 mx-auto rounded-xl bg-black/5 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5 text-teal-600" />
              </div>
              <h5 className="font-bold text-sm">Auto Shred 24h</h5>
              <p className="text-xs text-black/60 mt-1">Complete privacy</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
