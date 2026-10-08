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
  HelpCircle,
  FileBadge,
  ScanLine,
  Layers,
  FileType,
  Copy,
  Maximize2
} from "lucide-react";

export default function HomePage() {
  const [lang, setLang] = useState<"en" | "hi">("en");

  const services = [
    {
      id: "doc",
      title: lang === "en" ? "Print Documents" : "दस्तावेज़ प्रिंटिंग",
      desc: lang === "en"
        ? "Upload PDF or image files. Black & White and Full Color on A4/A3 with single or double-sided duplex."
        : "PDF या इमेज फाइलें अपलोड करें। A4/A3 पर ब्लैक एंड व्हाइट या कलर, सिंगल या दोनों तरफ़।",
      badge: "₹2 / side onwards",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: FileText,
      href: "/s/shakeel-online-services"
    },
    {
      id: "photo",
      title: lang === "en" ? "Photo Prints & Grids" : "फोटो प्रिंट और ग्रिड",
      desc: lang === "en"
        ? "JPG/PNG preview, crop, rotate, brightness & zoom. 1, 2, 4, 6, 9, or 12 photos per sheet on 4×6 or A4 glossy paper."
        : "फ़ोटो अपलोड, क्रॉप, ज़ूम और रोटेट करें। 4×6 या A4 ग्लॉसी पेपर पर 1 से 12 फ़ोटो की ग्रिड बनाएं।",
      badge: "High Gloss",
      badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
      icon: Images,
      href: "/photo-studio"
    },
    {
      id: "passport",
      title: lang === "en" ? "Passport Photos" : "पासपोर्ट साइज़ फ़ोटो",
      desc: lang === "en"
        ? "Standard physical 35×45 mm dimensions repeated 8 or 16 times per sheet with clean cutting guides."
        : "मानक 35×45 mm साइज के साथ 4×6 फोटो शीट या A4 पन्नों पर कटिंग गाइड के साथ तैयार शीट।",
      badge: "₹100 / Set",
      badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
      icon: UserCheck,
      href: "/photo-studio?mode=passport"
    },
    {
      id: "resume",
      title: lang === "en" ? "Resume Builder" : "बायोडाटा / रेज़्यूमे",
      desc: lang === "en"
        ? "6 professionally crafted, ATS-friendly templates. Live preview with multi-page searchable PDF export."
        : "6 आधुनिक रेज़्यूमे टेम्प्लेट्स। लाइव प्रिव्यू और तत्काल A4 PDF एक्सपोर्ट।",
      badge: "6 Templates Free",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: FileBadge,
      href: "/resume"
    },
    {
      id: "scan",
      title: lang === "en" ? "Scan to PDF" : "कैमरा स्कैन से PDF",
      desc: lang === "en"
        ? "Snap documents with phone camera or upload photos. Perspective correction and auto contrast boost."
        : "मोबाइल कैमरे से दस्तावेज स्कैन करें, परिप्रेक्ष्य सीधा करें और साफ PDF बनाएं।",
      badge: "Camera Ready",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      icon: ScanLine,
      href: "/scan"
    },
    {
      id: "idcard",
      title: lang === "en" ? "ID Front / Back Copy" : "पहचान पत्र (ID कार्ड) कॉपी",
      desc: lang === "en"
        ? "Aadhaar, PAN, Voter ID, or Driving License front & back positioned side-by-side on one sheet at 1:1 scale."
        : "आधार, पैन या वोटर कार्ड के दोनों हिस्से एक ही शीट पर सही 1:1 माप में सेट करें।",
      badge: "Standard CR80",
      badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
      icon: CreditCard,
      href: "/id-card"
    },
    {
      id: "nup",
      title: lang === "en" ? "Mini / N-up Printing" : "शीट बचत प्रिंट (2/4-up)",
      desc: lang === "en"
        ? "Fit 2 or 4 pages per sheet to save paper for study notes and handouts. Priced by physical output sheets."
        : "पन्ने बचाने के लिए 2 या 4 पेज प्रति शीट सेट करें। स्टडी नोट्स के लिए सबसे उत्तम।",
      badge: "Paper Saver",
      badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
      icon: Layers,
      href: "/s/shakeel-online-services?feature=nup"
    },
    {
      id: "office",
      title: lang === "en" ? "Word / PowerPoint Printing" : "Word / PPT प्रिंटिंग",
      desc: lang === "en"
        ? "Direct DOCX/PPTX upload converted via OpenXML parser. (Macros rejected; XLSX disabled for safety)." : "DOCX और PPTX फ़ाइलों का सीधा अपलोड और PDF रूपांतरण।",
      badge: "Auto Convert",
      badgeColor: "bg-orange-50 text-orange-800 border-orange-200",
      icon: FileType,
      href: "/s/shakeel-online-services?feature=office"
    },
    {
      id: "xerox",
      title: lang === "en" ? "Xerox & Scan Assistance" : "ज़ेरॉक्स व स्कैन सहायता",
      desc: lang === "en"
        ? "Physical originals require counter assistance. Hand your documents to the operator or use camera scan." : "भौतिक मूल प्रतियों के लिए काउंटर ऑपरेटर सहायता उपलब्ध है।",
      badge: "Counter Assisted",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
      icon: Copy,
      href: "/how-to-print#xerox"
    },
    {
      id: "large",
      title: lang === "en" ? "Large Format (A3)" : "बड़ा साइज़ (A3) प्रिंट",
      desc: lang === "en"
        ? "A3 black & white or color documents printed on our wide-tray printer. (A2/A1 awaiting specialized plotters)." : "वाइड-ट्रे प्रिंटर पर A3 ब्लैक एंड व्हाइट या कलर प्रिंट।",
      badge: "A3 Supported",
      badgeColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
      icon: Maximize2,
      href: "/rates#large-format"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      {/* Top Bar with Language Toggle & Shop Tag */}
      <div className="bg-emerald-900 text-emerald-100 text-xs px-6 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-300" />
            <span>Guntur, Andhra Pradesh · Shakeel Online Services</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-300">Language:</span>
            <button
              onClick={() => setLang("en")}
              className={`px-2 py-0.5 rounded ${lang === "en" ? "bg-emerald-700 text-white font-bold" : "text-emerald-200 hover:text-white"}`}
            >
              English
            </button>
            <button
              onClick={() => setLang("hi")}
              className={`px-2 py-0.5 rounded ${lang === "hi" ? "bg-emerald-700 text-white font-bold" : "text-emerald-200 hover:text-white"}`}
            >
              हिंदी
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-xl text-white shadow-xs">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-[#111827] text-lg">
                  Shakeel Online Services
                </span>
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  SOS Print
                </span>
              </div>
              <p className="text-xs text-[#475569] font-medium leading-none mt-0.5">
                {lang === "en" ? "Print Documents, Photos & ID Cards" : "दस्तावेज़, फ़ोटो और आईडी कार्ड प्रिंट सेवा"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/print"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition"
            >
              {lang === "en" ? "Print Hub" : "प्रिंट हब"}
            </Link>
            <Link
              href="/services"
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition"
            >
              {lang === "en" ? "Services" : "सेवाएं"}
            </Link>
            <Link
              href="/rates"
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition"
            >
              {lang === "en" ? "Rates" : "रेट लिस्ट"}
            </Link>
            <Link
              href="/how-to-print"
              className="hidden md:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition"
            >
              {lang === "en" ? "How to Print" : "प्रिंट कैसे करें"}
            </Link>
            <Link
              href="/about"
              className="hidden lg:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition"
            >
              {lang === "en" ? "About" : "हमारे बारे में"}
            </Link>
            <Link
              href="/contact"
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition"
            >
              {lang === "en" ? "Contact" : "संपर्क"}
            </Link>
            <Link
              href="/s/shakeel-online-services"
              className="text-xs font-bold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{lang === "en" ? "Start Printing" : "प्रिंट शुरू करें"}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-[#E2E8F0] py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {lang === "en"
                ? "Self-Service Mobile Upload · Direct Windows PC Printing"
                : "मोबाइल से फ़ाइल अपलोड करें · सीधे दुकान के प्रिंटर से प्रिंट पाएं"}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-[#111827] tracking-tight leading-tight mb-4">
            {lang === "en" ? (
              <>
                Fast, High Quality Printing at <br />
                <span className="text-emerald-700">Shakeel Online Services</span>
              </>
            ) : (
              <>
                शकील ऑनलाइन सर्विसेज पर <br />
                <span className="text-emerald-700">तेज़ और उच्च गुणवत्ता वाली प्रिंटिंग</span>
              </>
            )}
          </h1>

          <p className="text-base text-[#475569] max-w-2xl mx-auto mb-8 leading-relaxed">
            {lang === "en"
              ? "Scan our counter QR code or upload files directly from your smartphone. Set your copies, color, and duplex preferences, pay instantly via Cash or UPI, and get your prints ready immediately."
              : "काउंटर पर लगा QR कोड स्कैन करें या अपने फोन से सीधे फाइल अपलोड करें। कलर, कॉपी और साइड चुनें, कैश या UPI से भुगतान करें और तुरंत प्रिंट प्राप्त करें।"}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/s/shakeel-online-services"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-xs transition"
            >
              <QrCode className="w-5 h-5" />
              <span>{lang === "en" ? "Start Printing (Upload)" : "प्रिंट शुरू करें (फ़ाइल अपलोड)"}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link
              href="/rates"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-[#E2E8F0] text-[#111827] hover:bg-slate-50 font-semibold text-base transition"
            >
              <span>{lang === "en" ? "View Rates" : "रेट लिस्ट देखें"}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Prominent "What would you like to print?" Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
            <Printer className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === "en" ? "Choose from 10 Services" : "10 प्रिंटिंग सेवाओं में से चुनें"}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] mb-2">
            {lang === "en" ? "What would you like to print?" : "आप क्या प्रिंट करना चाहते हैं?"}
          </h2>
          <p className="text-sm text-[#475569]">
            {lang === "en"
              ? "Select any service below to open its dedicated workspace. Every order is verified with authentic shop rates."
              : "नीचे दी गई सेवा में से चुनें और तुरंत काम शुरू करें।"}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((svc) => {
            const Icon = svc.icon;
            return (
              <Link
                key={svc.id}
                href={svc.href}
                className="group bg-white border border-[#E2E8F0] hover:border-emerald-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${svc.badgeColor}`}>
                      {svc.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#111827] group-hover:text-emerald-700 transition">
                    {svc.title}
                  </h3>
                  <p className="text-xs text-[#475569] leading-relaxed mt-1">
                    {svc.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span className="text-[11px] text-[#475569] font-medium">
                    {lang === "en" ? "Open Tool" : "खोलें"}
                  </span>
                  <div className="flex items-center gap-1 group-hover:translate-x-1 transition">
                    <span>{lang === "en" ? "Start" : "शुरू करें"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How to Print in 4 Steps */}
      <section className="bg-white border-y border-[#E2E8F0] py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] mb-2">
              {lang === "en" ? "How to Print at Shakeel Online Services" : "प्रिंट करने का आसान तरीका"}
            </h2>
            <p className="text-sm text-[#475569]">
              {lang === "en"
                ? "No app download or account creation needed. Quick 4-step mobile printing."
                : "कोई ऐप डाउनलोड या लॉगिन करने की आवश्यकता नहीं। 4 आसान चरण।"}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm mb-4">
                1
              </div>
              <h3 className="text-sm font-bold text-[#111827] mb-1">
                {lang === "en" ? "Scan Counter QR" : "QR कोड स्कैन करें"}
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                {lang === "en"
                  ? "Scan the QR code placed at our shop counter with your phone camera."
                  : "दुकान के काउंटर पर लगा QR कोड अपने फोन से स्कैन करें।"}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm mb-4">
                2
              </div>
              <h3 className="text-sm font-bold text-[#111827] mb-1">
                {lang === "en" ? "Upload & Configure" : "फ़ाइल अपलोड व सेटिंग"}
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                {lang === "en"
                  ? "Pick your files, select B&W or Color, duplex sides, and number of copies."
                  : "फाइल चुनें, कलर, दोनों तरफ और कॉपी सेट करें।"}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm mb-4">
                3
              </div>
              <h3 className="text-sm font-bold text-[#111827] mb-1">
                {lang === "en" ? "Pay via Cash or UPI" : "कैश या UPI से भुगतान"}
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                {lang === "en"
                  ? "Pay via Counter Cash or online payment. You get a transparent itemized quote."
                  : "काउंटर पर कैश दें या ऑनलाइन भुगतान करें।"}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm mb-4">
                4
              </div>
              <h3 className="text-sm font-bold text-[#111827] mb-1">
                {lang === "en" ? "Collect Your Prints" : "प्रिंट प्राप्त करें"}
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                {lang === "en"
                  ? "Our Windows printer spools your order directly. Collect clean prints instantly."
                  : "प्रिंटर से तुरंत पन्ना निकलता है। काउंटर से प्राप्त करें।"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-10 px-6 text-xs text-[#475569]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="font-bold text-[#111827] text-sm">
              Shakeel Online Services · SOS Print
            </div>
            <p className="mt-1">
              Guntur, Andhra Pradesh · Authentic Shop Rates &amp; Windows Spooling
            </p>
          </div>
          <div className="flex items-center gap-6 font-medium">
            <Link href="/services" className="hover:text-[#111827]">Services</Link>
            <Link href="/rates" className="hover:text-[#111827]">Rates</Link>
            <Link href="/how-to-print" className="hover:text-[#111827]">How to Print</Link>
            <Link href="/about" className="hover:text-[#111827]">About</Link>
            <Link href="/contact" className="hover:text-[#111827]">Contact</Link>
            <Link href="/privacy" className="hover:text-[#111827]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#111827]">Terms &amp; Refund</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
