"use client";

import React from "react";
import Link from "next/link";
import { UserPlus, QrCode, MonitorDown, Printer, ArrowRight, CheckCircle2 } from "lucide-react";
import { Language } from "./navbar";

interface LandingWorkflowProps {
  lang: Language;
}

export function LandingWorkflow({ lang }: LandingWorkflowProps) {
  const steps = [
    {
      num: "01",
      icon: UserPlus,
      title: lang === "hi" ? "दुकान रजिस्टर करें" : "Create Free Account",
      desc:
        lang === "hi"
          ? "दुकान का नाम दर्ज करें और तुरंत अपने डैशबोर्ड पर पहुँचें। कोई क्रेडिट कार्ड या फीस नहीं।"
          : "Sign up in 30 seconds with your shop name. Free access with zero fees or plans.",
    },
    {
      num: "02",
      icon: QrCode,
      title: lang === "hi" ? "QR पोस्टर प्रिंट करें" : "Print Shop Poster",
      desc:
        lang === "hi"
          ? "डैशबोर्ड से हाई-रेजोल्यूशन QR पोस्टर डाउनलोड करें और अपनी दुकान के काउंटर पर लगाएँ।"
          : "Download your unique shop poster with QR code and stick it on your counter.",
    },
    {
      num: "03",
      icon: MonitorDown,
      title: lang === "hi" ? "प्रिंट एजेंट चालू करें" : "Pair Windows Agent",
      desc:
        lang === "hi"
          ? "दुकान के PC पर सॉफ्टवेयर चलाएँ, 6-अंकों का कोड डालकर अपना प्रिंटर चुनें। डैशबोर्ड दिखाएगा 'Agent Online'।"
          : "Run the agent on your Windows PC, enter your 6-digit pair code, and select your printer.",
    },
    {
      num: "04",
      icon: Printer,
      title: lang === "hi" ? "स्कैन, अपलोड और प्रिंट" : "Scan, Upload & Print",
      desc:
        lang === "hi"
          ? "ग्राहक फोन से QR स्कैन करके फाइल अपलोड करता है। प्रिंटर से शीट तुरंत निकल आती है।"
          : "Customer scans QR, uploads PDF/images, and paper ejects automatically from your tray.",
    },
  ];

  return (
    <section id="workflow" className="py-20 bg-white border-y border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#FF2D78] block mb-2">
            SIMPLE 4-STEP PROCESS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E1035]">
            {lang === "hi" ? "दुकान पर कैसे काम करता है?" : "How the Free System Works"}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#1E1035]/70">
            {lang === "hi"
              ? "सिर्फ 2 मिनट में आपकी दुकान पूरी तरह ऑटोमैटिक QR प्रिंट शॉप बन जाएगी।"
              : "Set up your entire counter workflow in under 2 minutes with zero friction."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="bg-[#FDFDFD] border border-black/5 rounded-3xl p-6 sm:p-7 relative flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-2xl font-black text-[#1E1035]/20 group-hover:text-[#FF2D78] transition-colors">
                      {step.num}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-[#1E1035]/5 group-hover:bg-[#FF2D78]/10 text-[#1E1035] group-hover:text-[#FF2D78] flex items-center justify-center transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-lg font-extrabold text-[#1E1035] mb-2">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-[#1E1035]/70 leading-relaxed">{step.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-black/5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>100% Free & Automatic</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 bg-[#FF2D78] hover:bg-[#E0246A] text-white font-extrabold text-sm px-8 py-3.5 rounded-2xl shadow-md transition-all active:scale-95"
          >
            <span>{lang === "hi" ? "अभी अपनी दुकान का QR बनाएँ" : "Generate Your Shop QR Code Now"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
