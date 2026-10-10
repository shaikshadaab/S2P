"use client";

import React from "react";
import Link from "next/link";
import {
  Printer,
  ShieldCheck,
  Sparkles,
  Clock,
  MapPin,
  QrCode,
  Building
} from "lucide-react";
import { SosLogo } from "@/components/common/SosLogo";

export default function AboutPage() {
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
            <Link href="/services" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition">
              Services
            </Link>
            <Link href="/rates" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition">
              Rates
            </Link>
            <Link href="/about" className="text-xs font-semibold px-3 py-1.5 rounded-lg text-emerald-800 bg-emerald-50 border border-emerald-200 transition">
              About Us
            </Link>
            <Link href="/contact" className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-lg text-[#475569] hover:text-[#111827] hover:bg-slate-100 transition">
              Contact
            </Link>
            <Link
              href="/print"
              className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Start Printing</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-1 w-full space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            <span>Serving Guntur, Andhra Pradesh</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
            About Shakeel Online Services
          </h1>
          <p className="text-sm text-[#475569] max-w-xl mx-auto">
            We are an established printing and digital cyber cafe center located in Guntur, Andhra Pradesh, committed to fast, transparent, and private document printing services.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#111827] text-sm">
              Document Privacy
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              Customer files are private to each session and never publicly accessible. Documents are automatically cleaned up after physical printing is completed.
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#111827] text-sm">
              Transparent Rates
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              All printing is calculated in exact integer paise: A4 B&W single ₹2, duplex ₹3/sheet, colour ₹10. Zero hidden charges.
            </p>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#111827] text-sm">
              No App Required
            </h3>
            <p className="text-xs text-[#475569] leading-relaxed">
              Simply scan the shop QR code or open our website on your mobile phone to upload documents and collect your prints at the counter.
            </p>
          </div>
        </div>

        {/* Confirmed Shop Details */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="font-bold text-[#111827] text-base border-b border-[#E2E8F0] pb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Shop Location & Contact</span>
          </h2>

          <div className="grid sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1.5">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Shop Name & Location</span>
              <p className="font-bold text-[#111827] text-sm">Shakeel Online Services</p>
              <p className="text-[#475569]">Guntur, Andhra Pradesh, India</p>
            </div>

            <div className="space-y-1.5">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Customer WhatsApp</span>
              <p className="font-bold text-[#111827] text-sm font-mono">+91 9581529381</p>
              <p className="text-[#475569]">Contact us on WhatsApp for questions or store hours</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white py-8 px-6 text-center text-xs text-[#475569]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Shakeel Online Services • Guntur, Andhra Pradesh</p>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/services" className="hover:text-[#111827]">Services</Link>
            <Link href="/rates" className="hover:text-[#111827]">Rates</Link>
            <Link href="/how-to-print" className="hover:text-[#111827]">How to Print</Link>
            <Link href="/privacy" className="hover:text-[#111827]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#111827]">Terms & Refund</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
