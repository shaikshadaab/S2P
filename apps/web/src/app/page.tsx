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
  Phone,
  Sparkles,
  HelpCircle,
  FileCheck
} from "lucide-react";

export default function HomePage() {
  const [lang, setLang] = useState<"en" | "hi">("en");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
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
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-xl text-white shadow-md shadow-emerald-700/20">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-slate-900 text-lg">
                  Shakeel Online Services
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  SOS Print
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {lang === "en" ? "Print Documents, Photos & ID Cards" : "दस्तावेज़, फ़ोटो और आईडी कार्ड प्रिंट सेवा"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/rates"
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              {lang === "en" ? "Rates" : "रेट लिस्ट"}
            </Link>
            <Link
              href="/how-to-print"
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              {lang === "en" ? "How to Print" : "प्रिंट कैसे करें"}
            </Link>
            <Link
              href="/s/shakeel-online-services"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{lang === "en" ? "Print Now" : "प्रिंट शुरू करें"}</span>
            </Link>
            <Link
              href="/dashboard"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            >
              {lang === "en" ? "Owner Login" : "दुकान लॉगिन"}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {lang === "en"
                ? "Self-Service Mobile Upload · Direct Windows PC Printing"
                : "मोबाइल से फ़ाइल अपलोड करें · सीधे दुकान के प्रिंटर से प्रिंट पाएं"}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
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

          <p className="text-base text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
            {lang === "en"
              ? "Scan our counter QR code or upload files directly from your smartphone. Set your copies, color, and duplex preferences, pay instantly via Cash or UPI, and get your prints ready immediately."
              : "काउंटर पर लगा QR कोड स्कैन करें या अपने फोन से सीधे फाइल अपलोड करें। कलर, कॉपी और साइड चुनें, कैश या UPI से भुगतान करें और तुरंत प्रिंट प्राप्त करें।"}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/s/shakeel-online-services"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-700/25 transition"
            >
              <QrCode className="w-5 h-5" />
              <span>{lang === "en" ? "Open Print Upload Portal" : "प्रिंट पोर्टल खोलें (फ़ाइल अपलोड)"}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link
              href="/how-to-print"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-base transition"
            >
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>{lang === "en" ? "View Instructions" : "प्रिंट करने का तरीका"}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
            {lang === "en" ? "Available Printing Services" : "दुकान में उपलब्ध प्रिंटिंग सेवाएं"}
          </h2>
          <p className="text-sm text-slate-500">
            {lang === "en"
              ? "All services processed with genuine shop rates and verified output"
              : "सभी सेवाएं दुकान के तय रेट और प्रामाणिक प्रिंटर सेटिंग्स पर उपलब्ध"}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Document Printing */}
          <Link
            href="/s/shakeel-online-services"
            className="group bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-6 hover:shadow-lg transition block"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition">
              {lang === "en" ? "Document Printing" : "दस्तावेज़ प्रिंटिंग"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {lang === "en"
                ? "PDF & multi-file uploads (up to 10 files). Black & White and Full Color on A4/A3 with single-sided or double-sided duplex."
                : "PDF और मल्टी-फ़ाइल अपलोड (10 फ़ाइल तक)। A4/A3 पर ब्लैक एंड व्हाइट या कलर, सिंगल या दोनों तरफ़।"
              }
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                PDF / Images / Docs
              </span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>Start</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* 2. Passport Photos */}
          <Link
            href="/photo-studio"
            className="group bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-6 hover:shadow-lg transition block"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition">
              {lang === "en" ? "Passport Photos" : "पासपोर्ट साइज़ फ़ोटो"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {lang === "en"
                ? "Standard physical mm dimensions repeated on 4x6 inch photo sheets or A4 pages with accurate cutting guidelines."
                : "मानक mm साइज के साथ 4x6 फोटो शीट या A4 पन्नों पर कटिंग गाइड के साथ तैयार शीट।"
              }
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                4x6 / A4 Photo Sheets
              </span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>Photo Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* 3. Photo Sheets & Grids */}
          <Link
            href="/photo-studio"
            className="group bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-6 hover:shadow-lg transition block"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition">
              {lang === "en" ? "Photo Grids (1 to 12)" : "फ़ोटो ग्रिड शीट"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {lang === "en"
                ? "Arrange 1, 2, 4, 6, 9, or 12 photos per sheet with mobile crop, zoom, and orientation adjustments."
                : "एक पन्ने पर 1, 2, 4, 6, 9 या 12 फोटो सेट करें। मोबाइल से क्रॉप, ज़ूम और रोटेशन की पूरी सुविधा।"
              }
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                Full A4 Layouts
              </span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>Create Grid</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* 4. ID Card Front/Back */}
          <Link
            href="/id-card"
            className="group bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-6 hover:shadow-lg transition block"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition">
              {lang === "en" ? "ID Card Front & Back" : "आईडी कार्ड आगे-पीछे"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {lang === "en"
                ? "Aadhaar, Voter ID, PAN, or Driving License front and back positioned side-by-side on a single A4 sheet without clipping."
                : "आधार, वोटर आईडी, पैन कार्ड के दोनों हिस्सों को बिना कटे एक ही A4 शीट पर सही अनुपात में प्रिंट करें।"
              }
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                Single Sheet Layout
              </span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>ID Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* 5. Resume Templates */}
          <Link
            href="/resume"
            className="group bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-6 hover:shadow-lg transition block"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition">
              {lang === "en" ? "6 Resume Templates" : "बायोडाटा / रिज़्यूमे मेकर"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {lang === "en"
                ? "Professional editable resume layouts with clean typography, generating print-ready searchable PDFs instantly."
                : "6 प्रोफेशनल रिज़्यूमे टेम्पलेट्स। विवरण भरें और तुरंत प्रिंट-रेडी सर्च योग्य PDF प्राप्त करें।"
              }
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                Clean PDF Output
              </span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>Resume Maker</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* 6. Document Scanner / Xerox */}
          <Link
            href="/scan"
            className="group bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-6 hover:shadow-lg transition block"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-105 transition">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-700 transition">
              {lang === "en" ? "Xerox & Camera Scan" : "ज़ीरॉक्स व कैमरा स्कैन"}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {lang === "en"
                ? "Scan multipage physical documents with your smartphone camera, perspective correction, B&W contrast boost and compile to PDF."
                : "फोन कैमरे से फोटो खींचकर सीधे ऑटो-क्रॉप, बी&डब्ल्यू कंट्रास्ट और कंपाइल्ड पीडीएफ बनाकर तुरंत प्रिंट करें।"
              }
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                Camera to PDF
              </span>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-1 transition">
                <span>Scan Tool</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* 4 Steps How it Works */}
      <section className="bg-white border-y border-slate-200 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              {lang === "en" ? "How to Print at Our Shop" : "प्रिंट करने के 4 आसान चरण"}
            </h2>
            <p className="text-sm text-slate-500">
              {lang === "en" ? "No app install, no account registration required" : "कोई ऐप डाउनलोड या लॉगिन करने की ज़रूरत नहीं"}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold text-base flex items-center justify-center mx-auto mb-3">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                {lang === "en" ? "Scan or Upload" : "स्कैन या अपलोड"}
              </h4>
              <p className="text-xs text-slate-600">
                {lang === "en" ? "Scan counter QR code or open portal on phone" : "दुकान का QR स्कैन करें या फोन में लिंक खोलें"}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold text-base flex items-center justify-center mx-auto mb-3">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                {lang === "en" ? "Choose Settings" : "सेटिंग्स चुनें"}
              </h4>
              <p className="text-xs text-slate-600">
                {lang === "en" ? "Select B&W or Color, copies, and duplex" : "ब्लैक & व्हाइट या कलर, पन्ने और कॉपियां चुनें"}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold text-base flex items-center justify-center mx-auto mb-3">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                {lang === "en" ? "Pay Easily" : "भुगतान करें"}
              </h4>
              <p className="text-xs text-slate-600">
                {lang === "en" ? "Pay Cash at counter, UPI QR, or Razorpay" : "काउंटर पर कैश दें या फोन से UPI/ऑनलाइन पे करें"}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold text-base flex items-center justify-center mx-auto mb-3">
                4
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">
                {lang === "en" ? "Collect Prints" : "प्रिंट प्राप्त करें"}
              </h4>
              <p className="text-xs text-slate-600">
                {lang === "en" ? "Prints come out directly on shop printer" : "दुकान के प्रिंटर से तुरंत अपने प्रिंट कलेक्ट करें"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shop Location & Trust Footer Banner */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 text-xs">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="font-extrabold text-white text-base mb-2">
              Shakeel Online Services
            </div>
            <p className="text-slate-400 mb-3 leading-relaxed">
              Your trusted cyber cafe and document printing center in Guntur, Andhra Pradesh.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>SOS Print Powered</span>
            </div>
          </div>

          <div>
            <div className="font-bold text-white text-sm mb-3">Quick Links</div>
            <ul className="space-y-2">
              <li>
                <Link href="/s/shakeel-online-services" className="hover:text-emerald-400 transition">
                  Customer Print Portal
                </Link>
              </li>
              <li>
                <Link href="/rates" className="hover:text-emerald-400 transition">
                  Rates &amp; Pricing (रेट लिस्ट)
                </Link>
              </li>
              <li>
                <Link href="/how-to-print" className="hover:text-emerald-400 transition">
                  How to Print (गाइड)
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-400 transition">
                  Contact &amp; Location
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white text-sm mb-3">Policies &amp; Security</div>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="hover:text-emerald-400 transition">
                  Document Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-400 transition">
                  Terms &amp; Refund Policy
                </Link>
              </li>
              <li>
                <span className="text-slate-500">Auto File Deletion after Printing</span>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white text-sm mb-3">Staff &amp; Administration</div>
            <ul className="space-y-2">
              <li>
                <Link href="/dashboard" className="text-emerald-400 font-semibold hover:underline">
                  Owner Dashboard Login
                </Link>
              </li>
              <li>
                <span className="text-slate-500">Single Shop Dedicated Deployment</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <div>
            &copy; {new Date().getFullYear()} Shakeel Online Services · Guntur, Andhra Pradesh. All rights reserved.
          </div>
          <div>
            Internal System: SOS Print v1.0
          </div>
        </div>
      </footer>
    </div>
  );
}
