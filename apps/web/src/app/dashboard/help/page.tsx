"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { HelpCircle, Laptop, Printer, QrCode, Download, MessageCircle, ChevronDown, Check, Sparkles } from "lucide-react";

export default function DashboardHelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const steps = [
    {
      step: "01",
      title: "Print Poster & Display on Counter",
      desc: "Open QR & Poster in dashboard, print the A4 sheet or stick the QR code on your acrylic counter standee. Walk-in customers scan this with their smartphone camera.",
    },
    {
      step: "02",
      title: "Download & Install Windows Print Agent",
      desc: "Click 'Download Agent' on your shop computer. Extract and run Start-VinthaPrintAgent.bat. The agent runs in high-availability mode and connects outward via secure HTTP.",
    },
    {
      step: "03",
      title: "Pair Computer with 6-Digit Code",
      desc: "In Printers & Agent, click 'Add Print Computer' to generate a 6-digit code. Enter it in the agent window. Your shop name and device token pair instantly.",
    },
    {
      step: "04",
      title: "Select Installed Printer & Test Print",
      desc: "The agent auto-discovers all USB/Network printers (HP Smart Tank, Canon, Epson, Brother). Select your primary printer and click 'Send Test Page' to verify.",
    },
  ];

  const faqs = [
    {
      q: "क्या इसके लिए कोई चार्ज या सब्सक्रिप्शन फीस है?",
      a: "नहीं! Vintha Print 100% मुफ्त (Free) है। कोई सब्सक्रिप्शन, बिलिंग, या पेमेंट गेटवे की ज़रूरत नहीं है। आप जितने चाहें उतने डॉक्यूमेंट्स प्रिंट कर सकते हैं।",
    },
    {
      q: "अगर एजेंट 'Offline' दिखे तो क्या करें?",
      a: "अपने काउंटर कंप्यूटर पर Vintha Print Agent चलाएं। अगर कंप्यूटर रीस्टार्ट हुआ है, तो Start-VinthaPrintAgent.bat पर डबल-क्लिक करें या Install-VinthaService.ps1 रन करके ऑटो-स्टार्ट ऑन बूट ऑन कर लें।",
    },
    {
      q: "Automatic Printing और Owner-Approval Mode में क्या अंतर है?",
      a: "Automatic Printing में ग्राहक के सबमिट करते ही प्रिंटर से पेज खुद निकल जाता है। Owner-Approval Mode में जॉब 'Pending Approval' में रहती है और जब आप डैशबोर्ड में 'Approve & Print' क्लिक करेंगे, तभी प्रिंट होगी।",
    },
    {
      q: "गलती से दो बार प्रिंट (Duplicate Print) होने से कैसे बचते हैं?",
      a: "सिस्टम में ऑटोमैटिक Idempotency Lock और Print Lease है। जब कोई जॉब प्रिंट हो रही होती है या पूरी हो चुकी होती है, तो 'Retry' बटन उसे दोबारा प्रिंट होने से रोकता है।",
    },
    {
      q: "क्या ग्राहक को कोई ऐप डाउनलोड करनी होगी?",
      a: "बिल्कुल नहीं! ग्राहक सिर्फ अपने मोबाइल कैमरे से QR स्कैन करता है, क्रोम या सफारी में पेज खुलता है, फाइल चुनकर सबमिट कर देता है।",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#121018]">Help & Setup Guide</h1>
            <p className="text-xs sm:text-sm text-black/60 mt-0.5">
              Step-by-step Hindi/English instructions and printer troubleshooting.
            </p>
          </div>

          <a
            href="https://wa.me/919581529381?text=Hello%20Vintha%20Print%20Help"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-pink-500/20 active:scale-95 transition-all"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>WhatsApp Support</span>
          </a>
        </div>

        {/* 4-Step Setup Walkthrough */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FF2D78]" />
            <h2 className="text-lg font-extrabold text-[#121018]">Setup Guide: Zero to First Print</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {steps.map((st) => (
              <div key={st.step} className="p-4 rounded-2xl bg-[#FAFAF8] border border-black/10 space-y-2">
                <span className="text-xs font-mono font-bold text-[#FF2D78]">Step {st.step}</span>
                <h4 className="font-extrabold text-sm text-[#121018]">{st.title}</h4>
                <p className="text-xs text-black/60 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Download Agent Reminder */}
        <div className="bg-[#1E1035] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="font-extrabold text-lg text-white">Need the Windows Print Agent Software?</h3>
            <p className="text-xs text-white/70 max-w-lg leading-relaxed">
              Download the portable Windows agent package containing Start-VinthaPrintAgent.bat and the background service installer.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href="/downloads/VinthaPrintAgentSetup.exe"
              download="VinthaPrintAgentSetup.exe"
              className="px-6 py-3.5 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] text-white text-xs font-extrabold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download .exe Installer</span>
            </a>
            <a
              href="/downloads/VinthaPrintAgent-Windows.zip"
              download="VinthaPrintAgent-Windows.zip"
              className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold flex items-center gap-2 border border-white/20 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 text-[#FF2D78]" />
              <span>Portable (.zip)</span>
            </a>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/10 shadow-sm space-y-4">
          <h2 className="text-lg font-extrabold text-[#121018] mb-2">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="border border-black/10 rounded-2xl overflow-hidden bg-[#FAFAF8]">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-bold text-xs sm:text-sm text-[#121018] flex items-center justify-between gap-3"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-black/40 transition-transform ${isOpen ? "rotate-180 text-[#FF2D78]" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-black/70 leading-relaxed border-t border-black/5 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
