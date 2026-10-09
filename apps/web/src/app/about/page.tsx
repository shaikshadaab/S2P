"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Printer,
  FileText,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  QrCode,
  Building,
  UserCheck
} from "lucide-react";

export default function AboutPage() {
  const [lang, setLang] = useState<"en" | "hi">("en");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur px-6 py-4 sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-xl text-white shadow-xs">
              <Printer className="w-5 h-5 text-white" />
            </Link>
            <div>
              <Link href="/" className="font-extrabold tracking-tight text-slate-900 text-lg hover:text-emerald-700 transition">
                SOS Print
              </Link>
              <p className="text-xs text-slate-500 font-medium">Printing at Shakeel Online Services</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
              {lang === "en" ? "Home" : "होम"}
            </Link>
            <Link href="/services" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
              {lang === "en" ? "Services" : "सेवाएं"}
            </Link>
            <Link href="/rates" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
              {lang === "en" ? "Rates" : "रेट लिस्ट"}
            </Link>
            <Link href="/about" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-emerald-800 bg-emerald-50 border border-emerald-200 transition">
              {lang === "en" ? "About Us" : "हमारे बारे में"}
            </Link>
            <Link href="/contact" className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
              {lang === "en" ? "Contact" : "संपर्क"}
            </Link>
            <Link
              href="/s/shakeel-online-services"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{lang === "en" ? "Start Printing" : "प्रिंट शुरू करें"}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === "en" ? "Serving Guntur" : "गुंटूर की विश्वसनीय दुकान"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {lang === "en" ? "About Shakeel Online Services" : "शकील ऑनलाइन सर्विसेज के बारे में"}
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            {lang === "en"
              ? "We are an established printing and cyber services shop located in Guntur, Andhra Pradesh, committed to fast, transparent, and private digital document services."
              : "हम गुंटूर, आंध्र प्रदेश में स्थित एक स्थापित प्रिंटिंग व साइबर सेवा केंद्र हैं, जो पारदर्शी और सुरक्षित प्रिंटिंग सेवाएं प्रदान करते हैं।"}
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {lang === "en" ? "Document Privacy" : "दस्तावेज़ गोपनीयता"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === "en"
                ? "Customer files are private to each session and never publicly accessible. Only the shop owner can queue authorized print jobs."
                : "ग्राहक की फाइलें पूरी तरह सुरक्षित हैं और अनाधिकृत लोगों के लिए कभी उपलब्ध नहीं होतीं।"}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {lang === "en" ? "Transparent Pricing" : "पारदर्शी रेट्स"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === "en"
                ? "All printing is calculated in exact integer paise: B&W single ₹2, duplex ₹3/sheet, colour ₹10. Zero hidden charges."
                : "काली-सफेद ₹2/साइड, दोनों तरफ ₹3/शीट, कलर ₹10। कोई छुपा हुआ शुल्क नहीं।"}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {lang === "en" ? "No App Required" : "कोई ऐप ज़रूरी नहीं"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === "en"
                ? "Simply scan the counter QR or open the web link on any phone or PC to upload, review preview and collect prints."
                : "बिना किसी ऐप डाउनलोड के सीधे ब्राउज़र से फ़ाइल अपलोड करें और प्रिंट प्राप्त करें।"}
            </p>
          </div>
        </div>

        {/* Confirmed Shop Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>{lang === "en" ? "Shop Location & Contact" : "दुकान का पता व संपर्क"}</span>
          </h2>

          <div className="grid sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Shop Address</span>
              <p className="font-bold text-slate-900 text-sm">Shakeel Online Services</p>
              <p className="text-slate-600">Guntur, Andhra Pradesh, India</p>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Contact Phone</span>
              <p className="font-bold text-slate-900 text-sm font-mono">+91 9581529381</p>
              <p className="text-slate-600">Available during shop operating hours</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Shakeel Online Services</span>
            <span>· Powered by SOS Print</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-900 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900 transition">Terms &amp; Refund</Link>
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-700 transition">Owner Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
