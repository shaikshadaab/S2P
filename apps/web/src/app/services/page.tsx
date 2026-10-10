"use client";

import React from "react";
import Link from "next/link";
import { SosLogo } from "@/components/common/SosLogo";
import {
  FileText,
  Images,
  UserCheck,
  FileBadge,
  ScanLine,
  CreditCard,
  Layers,
  ArrowRight,
  Sparkles,
  Printer
} from "lucide-react";

export default function ServicesPage() {
  const services = [
    {
      id: "doc",
      title: "Document Printing (A4)",
      desc: "B&W at ₹2/side, Duplex at ₹3/sheet, and vibrant Full Colour at ₹10/side. Direct PDF, JPG and PNG upload support.",
      badge: "₹2 / side onwards",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: FileText,
      href: "/print",
      actionText: "Print Documents"
    },
    {
      id: "photo",
      title: "Photo Prints & Grids",
      desc: "Upload high-res JPG/PNG. Crop, rotate, brightness & zoom. 2, 4, or 6 photos per sheet on glossy photo stock.",
      badge: "High Gloss",
      badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
      icon: Images,
      href: "/photo-studio",
      actionText: "Open Photo Studio"
    },
    {
      id: "passport",
      title: "Passport Photo Sets",
      desc: "Official 35 × 45 mm passport photo layout with instant cut-guides on glossy paper. Fixed rate ₹100 per configured set.",
      badge: "₹100 / set",
      badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
      icon: UserCheck,
      href: "/photo-studio?mode=passport",
      actionText: "Create Passport Photos"
    },
    {
      id: "resume",
      title: "Professional Resume Maker",
      desc: "6 clean, professional resume templates. Instant multi-section editor, live preview, and high-contrast vector PDF compilation.",
      badge: "6 Templates",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: FileBadge,
      href: "/resume",
      actionText: "Build Resume"
    },
    {
      id: "scan",
      title: "Camera Scan to PDF",
      desc: "Capture paper documents or book pages with phone camera, adjust perspective corners, enhance contrast, and compile into multi-page PDF.",
      badge: "Mobile Camera",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      icon: ScanLine,
      href: "/scan",
      actionText: "Start Scanning"
    },
    {
      id: "idcard",
      title: "ID Card Front & Back (CR80)",
      desc: "Upload both sides of Aadhaar, PAN, Voter ID or Driving License. Precise 85.6 × 54 mm layout on a single A4 sheet with cut guides.",
      badge: "1:1 Physical Scale",
      badgeColor: "bg-indigo-50 text-indigo-800 border-indigo-200",
      icon: CreditCard,
      href: "/id-card",
      actionText: "Copy ID Card"
    },
    {
      id: "mini",
      title: "Mini / N-up Printing (2/4-up)",
      desc: "Condense long PDF documents into 2-up or 4-up slides per output sheet to save paper and printing costs.",
      badge: "Eco Saver",
      badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
      icon: Layers,
      href: "/print",
      actionText: "Print N-up"
    },
    {
      id: "xerox",
      title: "Xerox & Counter Copy Assistance",
      desc: "Hand physical hardcopy papers to the counter operator. Shop desktop scanner produces immediate copies directly at our counter.",
      badge: "Staff Assisted",
      badgeColor: "bg-slate-100 text-slate-800 border-slate-300",
      icon: Printer,
      href: "/contact",
      actionText: "Shop Instructions"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-50 shadow-xs">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SosLogo variant="horizontal" size="md" href="/" />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition">
              Home
            </Link>
            <Link href="/services" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-emerald-800 bg-emerald-50 border border-emerald-200 transition">
              Services
            </Link>
            <Link href="/rates" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition">
              Rates
            </Link>
            <Link href="/how-to-print" className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition">
              How to Print
            </Link>
            <Link href="/contact" className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition">
              Contact
            </Link>
            <Link
              href="/print"
              className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
            >
              Start Printing
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 w-full flex-1">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Shakeel Online Services Catalog</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight">
            Available Printing Services
          </h1>
          <p className="text-sm text-[#475569] mt-2">
            All services processed at our physical shop in Guntur with transparent rates, calibrated print queues, and immediate output collection.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${svc.badgeColor}`}>
                      {svc.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#111827] mb-1.5">
                    {svc.title}
                  </h3>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    {svc.desc}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    Active
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
          <p>© 2026 Shakeel Online Services • Guntur, Andhra Pradesh</p>
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
