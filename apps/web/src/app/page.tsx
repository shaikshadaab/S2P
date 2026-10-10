"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SosLogo } from "@/components/common/SosLogo";
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
  Maximize2,
  Smartphone,
  Eye,
  Sliders,
  MessageCircle
} from "lucide-react";

export default function HomePage() {


  const services = [
    {
      id: "doc",
      title: "Print Documents",
      desc: "Upload PDF or image files. Black & White and Full Color on A4/A3 with single or double-sided duplex.",
      badge: "₹2 / side onwards",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: FileText,
      href: "/print"
    },
    {
      id: "photo",
      title: "Photo Prints & Grids",
      desc: "JPG/PNG preview, crop, rotate, brightness & zoom. 1, 2, 4, 6, 9, or 12 photos per sheet on 4×6 or A4 glossy paper.",
      badge: "High Gloss",
      badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
      icon: Images,
      href: "/photo-studio"
    },
    {
      id: "passport",
      title: "Passport Photos",
      desc: "Standard physical 35×45 mm dimensions repeated 8 or 16 times per sheet with clean cutting guides.",
      badge: "₹100 / Set",
      badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
      icon: UserCheck,
      href: "/photo-studio?mode=passport"
    },
    {
      id: "resume",
      title: "Resume Builder",
      desc: "6 professionally crafted, ATS-friendly templates. Live preview with multi-page searchable PDF export.",
      badge: "6 Templates Free",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: FileBadge,
      href: "/resume"
    },
    {
      id: "scan",
      title: "Scan to PDF",
      desc: "Snap documents with phone camera or upload photos. Perspective correction and auto contrast boost.",
      badge: "Camera Ready",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      icon: ScanLine,
      href: "/scan"
    },
    {
      id: "idcard",
      title: "ID Front / Back Copy",
      desc: "Aadhaar, PAN, Voter ID, or Driving License front & back positioned side-by-side on one sheet at 1:1 scale.",
      badge: "Standard CR80",
      badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
      icon: CreditCard,
      href: "/id-card"
    },
    {
      id: "nup",
      title: "Mini / N-up Printing",
      desc: "Fit 2 or 4 pages per sheet to save paper for study notes and handouts. Priced by physical output sheets.",
      badge: "Paper Saver",
      badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
      icon: Layers,
      href: "/mini-print"
    },
    {
      id: "office",
      title: "Word / PowerPoint Printing",
      desc: "Direct DOCX/PPTX upload converted via OpenXML parser. (Macros rejected; XLSX disabled for safety).",
      badge: "Auto Convert",
      badgeColor: "bg-orange-50 text-orange-800 border-orange-200",
      icon: FileType,
      href: "/s/shakeel-online-services?feature=office"
    },
    {
      id: "xerox",
      title: "Xerox & Scan Assistance",
      desc: "Physical originals require counter assistance. Hand your documents to the operator or use camera scan.",
      badge: "Counter Assisted",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
      icon: Copy,
      href: "/how-to-print#xerox"
    },
    {
      id: "large",
      title: "Large Format (A3)",
      desc: "A3 black & white or color documents printed on our wide-tray printer. (A2/A1 awaiting specialized plotters).",
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
            <span className='text-emerald-500'>•</span>
            <a href='https://wa.me/919581529381' target='_blank' rel='noopener noreferrer' className='text-emerald-300 hover:text-white font-semibold transition'>WhatsApp: +91 95815 29381</a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-300 font-semibold text-xs">English</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SosLogo variant="horizontal" size="md" href="/" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/print"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition"
            >
              Print Hub
            </Link>
            <Link
              href="/services"
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition"
            >
              Services
            </Link>
            <Link
              href="/rates"
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition"
            >
              Rates
            </Link>
            <Link
              href="/how-to-print"
              className="hidden md:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition"
            >
              How to Print
            </Link>
            <Link
              href="/about"
              className="hidden lg:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition"
            >
              Contact
            </Link>
            <Link
              href="/print"
              className="text-xs font-bold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Start Printing</span>
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
              {"Self-Service Mobile Upload · Direct Windows PC Printing"}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-[#111827] tracking-tight leading-tight mb-4">
            Your files. Your settings. <br />
            <span className="text-emerald-600">Your prints.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#475569] max-w-2xl mx-auto mb-8 leading-relaxed">
            Upload directly from your smartphone, review an accurate print preview with clear shop rates, pay via Cash or UPI at the counter, and collect your fresh prints immediately at Shakeel Online Services, Guntur.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              href="/print"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md shadow-emerald-700/20 transition"
            >
              <Printer className="w-5 h-5" />
              <span>Upload & Print Documents</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link
              href="#services"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-[#E2E8F0] text-[#111827] hover:bg-slate-50 font-semibold text-base transition"
            >
              <span>Explore Printing Tools</span>
            </Link>
          </div>

          {/* Section 3: Original Phone / QR / Document / Printer Illustration */}
          <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-xs mt-6">
            <div className="grid grid-cols-4 items-center gap-3 text-center">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center text-emerald-600 mb-2">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-[#111827]">
                  1. Your Phone
                </span>
                <span className="text-[10px] text-[#475569]">Scan or Open</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center text-emerald-600 mb-2">
                  <QrCode className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-[#111827]">
                  2. Counter QR
                </span>
                <span className="text-[10px] text-[#475569]">Instant Connect</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center text-emerald-600 mb-2">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-[#111827]">
                  3. PDF Preflight
                </span>
                <span className="text-[10px] text-[#475569]">Exact Pages</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center text-emerald-600 mb-2">
                  <Printer className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-[#111827]">
                  4. Shop Spooler
                </span>
                <span className="text-[10px] text-[#475569]">Instant Print</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: 3 Key Benefits */}
      <section className="bg-white border-b border-[#E2E8F0] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827] mb-1">
                  No App Installation Required
                </h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  {"Works seamlessly in any mobile browser (Chrome, Safari). No Play Store downloads, no storage clutter."}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827] mb-1">
                  Preview Before You Pay
                </h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  {"Verify verified page count, orientation, margins, and itemized rupee breakdown before making payment."}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827] mb-1">
                  Clear, Honest Printing Settings
                </h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  {"Customize single-sided or duplex, B&W or colour, copies, and custom page ranges with zero guesswork."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prominent "What would you like to print?" Section */}
      <section id="services" className="max-w-6xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
            <Printer className="w-3.5 h-3.5 text-emerald-600" />
            <span>Choose from 10 Services</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] mb-2">
            What would you like to print?
          </h2>
          <p className="text-sm text-[#475569]">
            {"Select any service below to open its dedicated workspace. Every order is verified with authentic shop rates."}
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
                    Open Tool
                  </span>
                  <div className="flex items-center gap-1 group-hover:translate-x-1 transition">
                    <span>Start</span>
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
              How to Print at Shakeel Online Services
            </h2>
            <p className="text-sm text-[#475569]">
              {"No app download or account creation needed. Quick 4-step mobile printing."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm mb-4">
                1
              </div>
              <h3 className="text-sm font-bold text-[#111827] mb-1">
                Scan Counter QR
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                {"Scan the QR code placed at our shop counter with your phone camera."}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm mb-4">
                2
              </div>
              <h3 className="text-sm font-bold text-[#111827] mb-1">
                Upload & Configure
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                {"Pick your files, select B&W or Color, duplex sides, and number of copies."}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm mb-4">
                3
              </div>
              <h3 className="text-sm font-bold text-[#111827] mb-1">
                Pay via Cash or UPI
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                {"Pay via Counter Cash or online payment. You get a transparent itemized quote."}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm mb-4">
                4
              </div>
              <h3 className="text-sm font-bold text-[#111827] mb-1">
                Collect Your Prints
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                {"Our Windows printer spools your order directly. Collect clean prints instantly."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Actual Backend-Connected Shop Printing Rates */}
      <section className="max-w-5xl mx-auto px-6 py-16 w-full">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E2E8F0]">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                Official Rates
              </span>
              <h2 className="text-2xl font-extrabold text-[#111827] mt-2">
                Real Shop Printing Rates
              </h2>
              <p className="text-xs text-[#475569] mt-0.5">
                Configured and honoured at Shakeel Online Services, Guntur
              </p>
            </div>
            <Link
              href="/rates"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5"
            >
              <span>Open Full Rate Calculator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#475569] block">A4 Black & White</span>
              <span className="text-2xl font-black text-[#111827] font-mono mt-1 block">₹2.00</span>
              <span className="text-[11px] text-emerald-700 font-semibold block mt-1">per printed side</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#475569] block">A4 B&W Duplex</span>
              <span className="text-2xl font-black text-[#111827] font-mono mt-1 block">₹3.00</span>
              <span className="text-[11px] text-emerald-700 font-semibold block mt-1">per output sheet</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#475569] block">A4 Colour Print</span>
              <span className="text-2xl font-black text-[#111827] font-mono mt-1 block">₹10.00</span>
              <span className="text-[11px] text-emerald-700 font-semibold block mt-1">per printed side</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-xs text-[#475569] block">Passport Photos</span>
              <span className="text-2xl font-black text-[#111827] font-mono mt-1 block">₹100.00</span>
              <span className="text-[11px] text-emerald-700 font-semibold block mt-1">per configured set</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Accurate File-Handling & Privacy Explanation */}
      <section className="bg-white border-y border-[#E2E8F0] py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h2 className="text-2xl font-extrabold text-[#111827] mb-2">
              Accurate File Handling & Privacy
            </h2>
            <p className="text-xs text-[#475569]">
              How your files are securely stored, processed, and cleaned up
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 text-xs text-[#475569] leading-relaxed">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5">
              <div className="font-bold text-[#111827] text-sm mb-1">Private Scoped Grants</div>
              <p>Uploaded documents are stored in private Firebase Storage. Public access is denied by default; files are accessed only via short-lived server tokens.</p>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5">
              <div className="font-bold text-[#111827] text-sm mb-1">Customer Token Isolation</div>
              <p>Each customer receives high-entropy session credentials. One customer cannot see, access, or download another customer&apos;s files or quotes.</p>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5">
              <div className="font-bold text-[#111827] text-sm mb-1">Automatic Cleanup Lifecycle</div>
              <p>Completed jobs and expired quotes are cleaned up by scheduled lifecycle sweeps. No persistent public document archive is kept.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Frequently Asked Questions (FAQ) */}
      <section className="max-w-4xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-10">
          <HelpCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <h2 className="text-2xl font-extrabold text-[#111827] mb-1">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-[#475569]">
            Everything you need to know about printing at Shakeel Online Services
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-sm text-[#111827] mb-1.5">
              Do I need to download an app or create an account?
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              {"No app or signup is needed. Open the website on your phone, upload your document, choose your settings, and pick up your prints at our counter."}
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-sm text-[#111827] mb-1.5">
              What are your exact printing rates?
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              {"A4 Black & White is ₹2 per printed side, A4 B&W Duplex (both sides) is ₹3 per output sheet, A4 Colour is ₹10 per printed side, and Passport Photo sets are ₹100 per configured set."}
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-sm text-[#111827] mb-1.5">
              How does payment work?
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              {"You can pay in cash directly at the shop counter or scan our counter UPI QR. We verify every payment before spooling."}
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-sm text-[#111827] mb-1.5">
              Are my uploaded files kept private?
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              {"Yes. All uploads use private, short-lived server tokens with zero public links. Documents are automatically cleaned up after your order is printed."}
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-sm text-[#111827] mb-1.5">
              What file formats can I upload?
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              {"You can directly upload PDF, JPG, and PNG documents and photos up to 10 files per order. For Word (.docx) or PowerPoint (.pptx) files, simply save or export as PDF on your phone before uploading, or ask our counter staff for assistance."}
            </p>
          </div>
        </div>
      </section>

      {/* 11. Confirmed Contact and Hours Section */}
      <section className="bg-white border-t border-[#E2E8F0] py-16 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cyber Cafe & Online Services • Guntur</span>
          </div>

          <h2 className="text-3xl font-extrabold text-[#111827]">
            Shakeel Online Services
          </h2>

          <p className="text-sm text-[#475569] max-w-md mx-auto">
            Guntur, Andhra Pradesh · Cyber Cafe & Digital Online Services Center
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="https://wa.me/919581529381"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp: +91 95815 29381</span>
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#111827] font-semibold text-sm transition"
            >
              <span>View Address & Map</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 12. Final Start Printing CTA & Complete Footer */}
      <section className="bg-emerald-800 text-white py-12 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black">Ready to print your files?</h2>
          <p className="text-sm text-emerald-100">
            Open the Print Hub, upload your documents, and pick them up freshly printed at the shop counter.
          </p>
          <div className="pt-2">
            <Link
              href="/print"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-black text-sm shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              <span>Start Printing Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E2E8F0] bg-white py-10 px-6 text-xs text-[#475569]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <div className="font-bold text-[#111827] text-sm">
              SOS Print · Shakeel Online Services
            </div>
            <p className="mt-1">
              Guntur, Andhra Pradesh · Single-Shop Printing System
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-5 font-medium">
            <Link href="/services" className="hover:text-[#111827]">Services</Link>
            <Link href="/rates" className="hover:text-[#111827]">Rates</Link>
            <Link href="/how-to-print" className="hover:text-[#111827]">How to Print</Link>
            <Link href="/about" className="hover:text-[#111827]">About</Link>
            <Link href="/contact" className="hover:text-[#111827]">Contact</Link>
            <Link href="/privacy" className="hover:text-[#111827]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#111827]">Terms & Refund</Link>
            <a
              href="https://wa.me/919581529381"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 font-semibold hover:underline"
            >
              WhatsApp
            </a>
            <Link href="/login" className="text-slate-400 hover:text-slate-700">Owner Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
