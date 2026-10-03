"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Printer, Sparkles, Globe, Menu, X, ArrowRight, Download, Monitor } from "lucide-react";

export type Language = "en" | "hi";

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

export function Navbar({ currentLang, onLanguageChange }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#FDFDFD]/90 backdrop-blur-md border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-[#1E1035] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Printer className="w-5 h-5 text-[#FF2D78]" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-extrabold tracking-tight text-[#1E1035]">
              Vintha
            </span>
            <span className="text-2xl font-black text-[#FF2D78] ml-1">
              Print
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#FF2D78] ml-1.5 animate-pulse"></span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#1E1035]/80">
          <Link href="#workflow" className="hover:text-[#FF2D78] transition-colors">
            {currentLang === "hi" ? "कैसे काम करता है" : "How It Works"}
          </Link>
          <Link href="#features" className="hover:text-[#FF2D78] transition-colors">
            {currentLang === "hi" ? "सुविधाएँ" : "Features"}
          </Link>
          <a href="/downloads/VinthaPrintAgentSetup.exe" download="VinthaPrintAgentSetup.exe" className="hover:text-[#FF2D78] transition-colors flex items-center gap-1.5">
            <Download className="w-4 h-4 text-[#FF2D78]" />
            <span>{currentLang === "hi" ? "डाउनलोड एजेंट (.exe)" : "Download Agent (.exe)"}</span>
          </a>
          <Link href="/shop/om-sai-print" className="hover:text-[#FF2D78] transition-colors">
            {currentLang === "hi" ? "ग्राहक डेमो पेज" : "Customer Demo"}
          </Link>
          <Link href="#faq" className="hover:text-[#FF2D78] transition-colors">
            FAQ
          </Link>
        </nav>

        {/* Right CTA & Language Selector */}
        <div className="hidden md:flex items-center gap-4">
          {/* Language Switcher */}
          <div className="flex items-center bg-white border border-black/10 rounded-full px-2 py-1 shadow-sm">
            <Globe className="w-3.5 h-3.5 text-black/40 mr-1.5 ml-1" />
            <button
              onClick={() => onLanguageChange("en")}
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-all ${
                currentLang === "en" ? "bg-[#1E1035] text-white" : "text-black/60 hover:text-black"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange("hi")}
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-all ${
                currentLang === "hi" ? "bg-[#1E1035] text-white" : "text-black/60 hover:text-black"
              }`}
            >
              हिन्दी
            </button>
          </div>

          <Link
            href="/login"
            className="text-sm font-bold text-[#1E1035] hover:text-[#FF2D78] px-3 py-2 transition-colors"
          >
            {currentLang === "hi" ? "शॉप लॉगिन" : "Shop Login"}
          </Link>

          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2 bg-[#FF2D78] hover:bg-[#E0246A] text-white font-extrabold text-sm px-6 py-2.5 rounded-2xl shadow-md transition-all hover:shadow-lg active:scale-95"
          >
            <span>{currentLang === "hi" ? "दुकान रजिस्टर करें (Free)" : "Create Free Account"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => onLanguageChange(currentLang === "en" ? "hi" : "en")}
            className="text-xs bg-white border border-black/10 px-2.5 py-1 rounded-full font-bold uppercase text-[#1E1035]"
          >
            {currentLang}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-white border border-black/10 text-[#1E1035]"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-black/10 bg-white px-5 pt-4 pb-6 space-y-3">
          <Link
            href="#workflow"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-[#1E1035]"
          >
            {currentLang === "hi" ? "कैसे काम करता है" : "How It Works"}
          </Link>
          <Link
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-[#1E1035]"
          >
            {currentLang === "hi" ? "सुविधाएँ" : "Features"}
          </Link>
          <Link
            href="/downloads/VinthaPrintAgent-Windows.zip"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-[#FF2D78]"
          >
            {currentLang === "hi" ? "विंडोज़ प्रिंट एजेंट डाउनलोड" : "Download Windows Agent"}
          </Link>
          <Link
            href="/shop/om-sai-print"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-base font-bold text-[#1E1035]"
          >
            {currentLang === "hi" ? "ग्राहक डेमो पेज चलाएँ" : "Customer Demo"}
          </Link>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl border border-black/10 font-bold text-[#1E1035]"
            >
              {currentLang === "hi" ? "शॉप लॉगिन" : "Shop Login"}
            </Link>
            <Link
              href="/onboarding"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 rounded-2xl bg-[#FF2D78] text-white font-extrabold shadow-md"
            >
              {currentLang === "hi" ? "मुफ़्त खाता बनाएँ" : "Create Free Account"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
