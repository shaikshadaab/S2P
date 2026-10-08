"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Printer,
  FileText,
  Images,
  UserCheck,
  CreditCard,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ArrowLeft,
  FileBadge,
  ScanLine,
  Layers,
  FileType,
  Copy,
  Maximize2
} from "lucide-react";

export default function ServicesPage() {
  const [lang, setLang] = useState<"en" | "hi">("en");

  const services = [
    {
      id: "doc",
      title: lang === "en" ? "Document Printing (A4)" : "दस्तावेज़ प्रिंटिंग (A4)",
      desc: lang === "en" 
        ? "B&W at ₹2/side, Duplex at ₹3/sheet, and vibrant Full Colour at ₹10/side. Direct PDF, Word (.docx) and PowerPoint (.pptx) support."
        : "काली-सफेद ₹2/साइड, दोनों तरफ ₹3/शीट, और कलर प्रिंट ₹10/साइड। PDF, Word और PPTX सपोर्ट।",
      badge: "₹2 / side onwards",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: FileText,
      href: "/s/shakeel-online-services",
      actionText: lang === "en" ? "Print Documents" : "दस्तावेज़ प्रिंट करें"
    },
    {
      id: "photo",
      title: lang === "en" ? "Photo Prints & Grids" : "फोटो प्रिंट और ग्रिड",
      desc: lang === "en"
        ? "Upload high-res JPG/PNG. Crop, rotate, brightness & zoom. 1, 2, 4, 6, 9, or 12 photos per sheet on 4×6 or A4 photo stock."
        : "फ़ोटो अपलोड, क्रॉप, ज़ूम और रोटेट करें। 4×6 या A4 ग्लॉसी पेपर पर 1 से 12 फ़ोटो की ग्रिड बनाएं।",
      badge: "High Gloss",
      badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
      icon: Images,
      href: "/photo-studio",
      actionText: lang === "en" ? "Open Photo Studio" : "फोटो स्टूडियो खोलें"
    },
    {
      id: "passport",
      title: lang === "en" ? "Passport Photo Sets" : "पासपोर्ट फोटो सेट",
      desc: lang === "en"
        ? "Official 35×45 mm passport photo layout with instant cut-guides on glossy paper. Fixed rate ₹100 per configured set."
        : "ग्लॉसी फोटो पेपर पर कट गाइड्स के साथ 35×45 mm पासपोर्ट फोटो सेट। तय दर ₹100 प्रति सेट।",
      badge: "₹100 / set",
      badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
      icon: UserCheck,
      href: "/photo-studio?mode=passport",
      actionText: lang === "en" ? "Create Passport Photos" : "पासपोर्ट फोटो बनाएं"
    },
    {
      id: "resume",
      title: lang === "en" ? "Professional Resume Maker" : "प्रोफेशनल रेज़्यूमे मेकर",
      desc: lang === "en"
        ? "6 ATS-friendly clean resume templates. Multi-page pagination, live preview, and instant A4 PDF compilation."
        : "6 मॉडर्न रेज़्यूमे टेम्प्लेट्स। लाइव प्रिव्यू और तत्काल A4 PDF एक्सपोर्ट।",
      badge: "6 Templates Free",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: FileBadge,
      href: "/resume",
      actionText: lang === "en" ? "Build Resume" : "रेज़्यूमे बनाएं"
    },
    {
      id: "scan",
      title: lang === "en" ? "Camera Scan to PDF" : "कैमरा स्कैन से PDF",
      desc: lang === "en"
        ? "Use phone or webcam to snap physical papers, auto-enhance contrast, and compile into a multi-page searchable PDF."
        : "मोबाइल कैमरे से दस्तावेज स्कैन करें, परिप्रेक्ष्य सीधा करें और साफ PDF बनाएं।",
      badge: "Instant PDF",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      icon: ScanLine,
      href: "/scan",
      actionText: lang === "en" ? "Start Scanning" : "स्कैनिंग शुरू करें"
    },
    {
      id: "idcard",
      title: lang === "en" ? "ID Card Front & Back (CR80)" : "आईडी कार्ड कॉपी (दोनों तरफ)",
      desc: lang === "en"
        ? "Place front and back of Aadhaar, PAN, Voter or Driving License side-by-side with exact physical card dimensions."
        : "आधार, पैन या वोटर कार्ड के दोनों हिस्से एक ही शीट पर सही माप में सेट करें।",
      badge: "Exact 1:1 Scale",
      badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
      icon: CreditCard,
      href: "/id-card",
      actionText: lang === "en" ? "Copy ID Card" : "आईडी कार्ड कॉपी करें"
    },
    {
      id: "nup",
      title: lang === "en" ? "Mini / N-up Printing (2/4-up)" : "शीट बचत प्रिंट (2/4-up)",
      desc: lang === "en"
        ? "Fit 2 or 4 pages per sheet to save paper for study notes and handouts. Priced strictly by physical output sheets."
        : "पन्ने बचाने के लिए 2 या 4 पेज प्रति शीट सेट करें। स्टडी नोट्स के लिए सबसे उत्तम।",
      badge: "Paper Saver",
      badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
      icon: Layers,
      href: "/s/shakeel-online-services?feature=nup",
      actionText: lang === "en" ? "Print N-up" : "N-up प्रिंट करें"
    },
    {
      id: "office",
      title: lang === "en" ? "Word / PowerPoint Printing" : "Word / PPT प्रिंटिंग",
      desc: lang === "en"
        ? "Direct DOCX/PPTX upload converted via OpenXML parser. (Macros rejected; XLSX disabled for safety)." : "DOCX और PPTX फ़ाइलों का सीधा अपलोड और PDF रूपांतरण।",
      badge: "Auto Convert",
      badgeColor: "bg-orange-50 text-orange-800 border-orange-200",
      icon: FileType,
      href: "/s/shakeel-online-services?feature=office",
      actionText: lang === "en" ? "Print Office File" : "Office फ़ाइल प्रिंट करें"
    },
    {
      id: "xerox",
      title: lang === "en" ? "Xerox & Counter Copy Assistance" : "ज़ेरॉक्स व स्कैन सहायता",
      desc: lang === "en"
        ? "Physical originals require counter operator assistance. Hand your documents to the operator or use camera scan fallback." : "भौतिक मूल प्रतियों के लिए काउंटर ऑपरेटर सहायता उपलब्ध है।",
      badge: "Counter Assisted",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
      icon: Copy,
      href: "/how-to-print#xerox",
      actionText: lang === "en" ? "View Instructions" : "तरीका देखें"
    },
    {
      id: "large",
      title: lang === "en" ? "Large Format Printing (A3)" : "बड़ा साइज़ (A3) प्रिंट",
      desc: lang === "en"
        ? "A3 black & white or color documents printed on our wide-tray printer. (A2/A1 awaiting specialized plotters)." : "वाइड-ट्रे प्रिंटर पर A3 ब्लैक एंड व्हाइट या कलर प्रिंट।",
      badge: "A3 Supported",
      badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
      icon: Maximize2,
      href: "/rates#large-format",
      actionText: lang === "en" ? "View A3 Rates" : "A3 रेट देखें"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-xl text-white shadow-xs">
              <Printer className="w-5 h-5 text-white" />
            </Link>
            <div>
              <Link href="/" className="font-extrabold tracking-tight text-[#111827] text-lg hover:text-emerald-700 transition">
                Shakeel Online Services
              </Link>
              <p className="text-xs text-[#475569] font-medium leading-none mt-0.5">Guntur, Andhra Pradesh</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition">
              {lang === "en" ? "Home" : "होम"}
            </Link>
            <Link href="/services" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-emerald-800 bg-emerald-50 border border-emerald-200 transition">
              {lang === "en" ? "Services" : "सेवाएं"}
            </Link>
            <Link href="/rates" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition">
              {lang === "en" ? "Rates" : "रेट लिस्ट"}
            </Link>
            <Link href="/how-to-print" className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition">
              {lang === "en" ? "How to Print" : "प्रिंट कैसे करें"}
            </Link>
            <Link href="/contact" className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition">
              {lang === "en" ? "Contact" : "संपर्क"}
            </Link>
            <button
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="text-xs font-bold px-2.5 py-1 rounded-md border border-[#E2E8F0] text-[#475569] hover:text-[#111827] bg-white transition"
            >
              {lang === "en" ? "हिंदी" : "English"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-1">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === "en" ? "Authentic Pilot Shop Catalog" : "दुकान की असली सेवाएं"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight">
            {lang === "en" ? "Available Printing Services" : "उपलब्ध प्रिंटिंग सेवाएं"}
          </h1>
          <p className="text-sm text-[#475569] mt-2">
            {lang === "en"
              ? "All services processed at our physical shop in Guntur with verified pricing, calibrated spooler queues, and immediate output."
              : "गुंटूर की हमारी दुकान में सभी सेवाएं सत्यापित दरों और प्रिंटर स्पूलर के साथ तुरंत उपलब्ध हैं।"}
          </p>
        </div>

        {/* 10 Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc) => {
            const Icon = svc.icon;
            return (
              <div
                key={svc.id}
                className="bg-white border border-[#E2E8F0] hover:border-emerald-500 rounded-2xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${svc.badgeColor}`}>
                      {svc.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#111827] mb-2">
                    {svc.title}
                  </h3>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    {svc.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#475569]">
                    {lang === "en" ? "Active Service" : "सक्रिय सेवा"}
                  </span>
                  <Link
                    href={svc.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
                  >
                    <span>{svc.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-8 px-6 text-center text-xs text-[#475569]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Shakeel Online Services · Guntur, AP</p>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/rates" className="hover:text-[#111827]">Rates</Link>
            <Link href="/how-to-print" className="hover:text-[#111827]">How to Print</Link>
            <Link href="/about" className="hover:text-[#111827]">About</Link>
            <Link href="/privacy" className="hover:text-[#111827]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#111827]">Terms &amp; Refund</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
