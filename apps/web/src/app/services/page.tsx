"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Printer,
  FileText,
  Image as ImageIcon,
  UserCheck,
  CreditCard,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Camera,
  FileSpreadsheet,
  ArrowLeft
} from "lucide-react";

export default function ServicesPage() {
  const [lang, setLang] = useState<"en" | "hi">("en");

  const services = [
    {
      title: lang === "en" ? "Document Printing (A4)" : "दस्तावेज़ प्रिंटिंग (A4)",
      desc: lang === "en" 
        ? "B&W at ₹2/side, Duplex at ₹3/sheet, and vibrant Full Colour at ₹10/side. Direct PDF, Word (.docx) and PowerPoint (.pptx) support."
        : "काली-सफेद ₹2/साइड, दोनों तरफ ₹3/शीट, और कलर प्रिंट ₹10/साइड। PDF, Word और PPTX सपोर्ट।",
      badge: "₹2 / side onwards",
      icon: FileText,
      href: "/s/shakeel-online-services",
      actionText: lang === "en" ? "Print Documents" : "दस्तावेज़ प्रिंट करें"
    },
    {
      title: lang === "en" ? "Passport Photo Sets" : "पासपोर्ट फोटो सेट",
      desc: lang === "en"
        ? "Official 35×45 mm passport photo layout with instant cut-guides on glossy paper. Fixed rate ₹100 per configured set."
        : "ग्लॉसी फोटो पेपर पर कट गाइड्स के साथ 35×45 mm पासपोर्ट फोटो सेट। तय दर ₹100 प्रति सेट।",
      badge: "₹100 / set",
      icon: UserCheck,
      href: "/photo-studio",
      actionText: lang === "en" ? "Create Passport Photos" : "पासपोर्ट फोटो बनाएं"
    },
    {
      title: lang === "en" ? "Photo Studio & Sheets" : "फोटो स्टूडियो व शीट्स",
      desc: lang === "en"
        ? "Upload high-res photos, crop, adjust brightness and arrange into multi-photo grids or 4×6 photo stock."
        : "हाई-रेजोल्यूशन फोटो अपलोड, क्रॉप और ग्रिड अरेंजमेंट।",
      badge: "Custom layouts",
      icon: ImageIcon,
      href: "/photo-studio",
      actionText: lang === "en" ? "Open Photo Studio" : "फोटो स्टूडियो खोलें"
    },
    {
      title: lang === "en" ? "Professional Resume Maker" : "प्रोफेशनल रेज़्यूमे मेकर",
      desc: lang === "en"
        ? "6 ATS-friendly clean resume templates. Multi-page pagination, live preview, and instant A4 PDF compilation."
        : "6 मॉडर्न रेज़्यूमे टेम्प्लेट्स। लाइव प्रिव्यू और तत्काल A4 PDF एक्सपोर्ट।",
      badge: "6 Templates Free",
      icon: Sparkles,
      href: "/resume",
      actionText: lang === "en" ? "Build Resume" : "रेज़्यूमे बनाएं"
    },
    {
      title: lang === "en" ? "Camera Scan to PDF" : "कैमरा स्कैन से PDF",
      desc: lang === "en"
        ? "Use phone or webcam to snap physical papers, auto-enhance contrast, and compile into a multi-page searchable PDF."
        : "मोबाइल कैमरे से दस्तावेज स्कैन करें और तुरंत साफ PDF बनाएं।",
      badge: "Instant PDF",
      icon: Camera,
      href: "/scan",
      actionText: lang === "en" ? "Start Scanning" : "स्कैनिंग शुरू करें"
    },
    {
      title: lang === "en" ? "ID Card Front & Back (CR80)" : "आईडी कार्ड कॉपी (दोनों तरफ)",
      desc: lang === "en"
        ? "Place front and back of Aadhaar, PAN, Voter or Driving License side-by-side with exact physical card dimensions."
        : "आधार, पैन या वोटर कार्ड के दोनों हिस्से एक ही शीट पर सही माप में सेट करें।",
      badge: "Exact 1:1 Scale",
      icon: CreditCard,
      href: "/id-card",
      actionText: lang === "en" ? "Copy ID Card" : "आईडी कार्ड कॉपी करें"
    }
  ];

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
                Shakeel Online Services
              </Link>
              <p className="text-xs text-slate-500 font-medium">Guntur, Andhra Pradesh</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
              {lang === "en" ? "Home" : "होम"}
            </Link>
            <Link href="/services" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-emerald-800 bg-emerald-50 border border-emerald-200 transition">
              {lang === "en" ? "Services" : "सेवाएं"}
            </Link>
            <Link href="/rates" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
              {lang === "en" ? "Rates" : "रेट लिस्ट"}
            </Link>
            <Link href="/how-to-print" className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
              {lang === "en" ? "How to Print" : "प्रिंट कैसे करें"}
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
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 w-full space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === "en" ? "Comprehensive Printing Suite" : "दुकान की संपूर्ण सेवाएं"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {lang === "en" ? "All Printing Services in One Place" : "प्रिंटिंग की सभी सेवाएं एक ही जगह"}
          </h1>
          <p className="text-sm text-slate-600">
            {lang === "en"
              ? "Accurate laser printing, passport photos, and instant document processing at Shakeel Online Services, Guntur."
              : "शकील ऑनलाइन सर्विसेज, गुंटूर पर हाई-स्पीड लेजर प्रिंटिंग, फोटो और दस्तावेज सेवाएं।"}
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
                      {s.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{s.title}</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{s.desc}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    href={s.href}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-emerald-600 text-slate-700 hover:text-white font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 group"
                  >
                    <span>{s.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Shakeel Online Services</span>
            <span>· Guntur, Andhra Pradesh</span>
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
