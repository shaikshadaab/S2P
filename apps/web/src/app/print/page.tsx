"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Images,
  UserCheck,
  FileBadge,
  ScanLine,
  CreditCard,
  Layers,
  FileType,
  Copy,
  Maximize2,
  ArrowRight,
  Printer,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function PrintHubPage() {
  const [filter, setFilter] = useState<"ALL" | "DOCUMENT" | "PHOTO" | "UTILITY">("ALL");

  const services = [
    {
      id: "doc",
      category: "DOCUMENT",
      title: "Print Documents",
      subtitle: "दस्तावेज़ प्रिंटिंग",
      description: "Upload PDF or image files. Choose B&W or Color, single or double-sided duplex, copies and specific page ranges.",
      badge: "Fastest",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: FileText,
      href: "/s/shakeel-online-services",
      status: "READY"
    },
    {
      id: "photo",
      category: "PHOTO",
      title: "Photo Prints & Grids",
      subtitle: "फोटो प्रिंट और ग्रिड",
      description: "Upload high-res JPG/PNG. Crop, rotate, adjust zoom & brightness. Print 1, 2, 4, 6, 9, or 12 photos per sheet on A4 or 4×6 photo paper.",
      badge: "High Gloss",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      icon: Images,
      href: "/photo-studio",
      status: "READY"
    },
    {
      id: "passport",
      category: "PHOTO",
      title: "Passport Photos",
      subtitle: "पासपोर्ट साइज़ फ़ोटो",
      description: "Standard physical passport dimensions (35×45mm). Repeated 8 or 16 photos per sheet with clear cutting guidelines.",
      badge: "₹100 / Set",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      icon: UserCheck,
      href: "/photo-studio?mode=passport",
      status: "READY"
    },
    {
      id: "resume",
      category: "DOCUMENT",
      title: "Resume Builder",
      subtitle: "बायोडाटा / रेज़्यूमे",
      description: "Choose from 6 professionally crafted, ATS-friendly templates. Live preview with multi-page searchable PDF output.",
      badge: "6 Templates",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: FileBadge,
      href: "/resume",
      status: "READY"
    },
    {
      id: "scan",
      category: "UTILITY",
      title: "Scan to PDF",
      subtitle: "कैमरा स्कैन से PDF",
      description: "Use your phone camera or upload images. Auto-crop, perspective correction, contrast boost and compile into a single PDF.",
      badge: "Camera Ready",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      icon: ScanLine,
      href: "/scan",
      status: "READY"
    },
    {
      id: "idcard",
      category: "UTILITY",
      title: "ID Front / Back Copy",
      subtitle: "पहचान पत्र (ID कार्ड) कॉपी",
      description: "Upload front and back of Aadhaar, PAN, Voter ID, or Driving License. Automatically formats side-by-side or stacked on A4.",
      badge: "Standard CR80",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      icon: CreditCard,
      href: "/id-card",
      status: "READY"
    },
    {
      id: "nup",
      category: "DOCUMENT",
      title: "Mini / N-up Printing",
      subtitle: "2-up / 4-up शीट बचत प्रिंट",
      description: "Fit 2 or 4 pages per sheet to save paper for study notes, syllabi, or handouts. Billed accurately by physical output sheets.",
      badge: "Paper Saver",
      badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
      icon: Layers,
      href: "/s/shakeel-online-services?feature=nup",
      status: "READY"
    },
    {
      id: "office",
      category: "DOCUMENT",
      title: "Word / PowerPoint Printing",
      subtitle: "DOCX / PPTX प्रिंटिंग",
      description: "Upload .docx or .pptx files. Automatically converted to PDF via OpenXML parser. (Note: Macros rejected; XLSX disabled).",
      badge: "Auto Convert",
      badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
      icon: FileType,
      href: "/s/shakeel-online-services?feature=office",
      status: "READY"
    },
    {
      id: "xerox",
      category: "UTILITY",
      title: "Xerox & Scan Assistance",
      subtitle: "ऑपरेटर ज़ेरॉक्स सहायता",
      description: "Physical originals require counter scanner assistance. Hand your documents to the operator or use phone camera scan fallback.",
      badge: "Counter Assisted",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
      icon: Copy,
      href: "/how-to-print#xerox",
      status: "ASSISTED"
    },
    {
      id: "large",
      category: "DOCUMENT",
      title: "Large Format (A3)",
      subtitle: "बड़ा साइज़ A3 प्रिंट",
      description: "A3 black & white or color documents printed on our wide-tray printer. (A2/A1 formats currently awaiting specialized plotters).",
      badge: "A3 Supported",
      badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
      icon: Maximize2,
      href: "/rates#large-format",
      status: "HARDWARE_CAPABLE"
    }
  ];

  const filteredServices = filter === "ALL" 
    ? services 
    : services.filter(s => s.category === filter);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Printer className="w-5 h-5" />
            </Link>
            <div>
              <Link href="/" className="font-extrabold tracking-tight text-base hover:text-emerald-700 transition">
                SOS Print
              </Link>
              <p className="text-[11px] text-[#475569] font-medium leading-none mt-0.5">
                Printing at Shakeel Online Services
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/rates"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition"
            >
              Rates
            </Link>
            <Link
              href="/s/shakeel-online-services"
              className="text-xs font-bold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs flex items-center gap-1.5"
            >
              <span>Upload Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10 w-full flex-1">
        {/* Header Banner */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Select a Service to Start Printing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight">
            What would you like to print?
          </h1>
          <p className="text-sm text-[#475569] mt-2">
            Choose your document, photo or utility service below. Every job is verified with authentic shop rates and processed directly by our Windows print spooler.
          </p>

          {/* Filter Pills */}
          <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === "ALL"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white border border-[#E2E8F0] text-[#475569] hover:bg-slate-50"
              }`}
            >
              All Services (10)
            </button>
            <button
              onClick={() => setFilter("DOCUMENT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === "DOCUMENT"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white border border-[#E2E8F0] text-[#475569] hover:bg-slate-50"
              }`}
            >
              Documents & Resumes
            </button>
            <button
              onClick={() => setFilter("PHOTO")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === "PHOTO"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white border border-[#E2E8F0] text-[#475569] hover:bg-slate-50"
              }`}
            >
              Photos & Passport
            </button>
            <button
              onClick={() => setFilter("UTILITY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filter === "UTILITY"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white border border-[#E2E8F0] text-[#475569] hover:bg-slate-50"
              }`}
            >
              ID Cards & Scanning
            </button>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((svc) => {
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
                  <div className="text-[11px] font-medium text-[#475569] mb-2">
                    {svc.subtitle}
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    {svc.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-bold text-emerald-700">
                  <span className="text-[11px] text-[#475569] font-medium">
                    {svc.status === "READY" ? "Instant Workspace" : "Assisted Service"}
                  </span>
                  <div className="flex items-center gap-1 group-hover:translate-x-1 transition">
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-6 px-6 text-center text-xs text-[#475569]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Shakeel Online Services · SOS Print. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/rates" className="hover:text-[#111827]">Rates</Link>
            <Link href="/how-to-print" className="hover:text-[#111827]">How to Print</Link>
            <Link href="/about" className="hover:text-[#111827]">About</Link>
            <Link href="/privacy" className="hover:text-[#111827]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#111827]">Terms & Refund</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
