"use client";

import React, { useState } from "react";
import { Navbar, Language } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { LandingHero } from "@/components/landing-hero";
import { LandingComparison } from "@/components/landing-comparison";
import { LandingWorkflow } from "@/components/landing-workflow";
import { LandingFaq } from "@/components/landing-faq";

export default function LandingPage() {
  const [lang, setLang] = useState<Language>("hi");

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFDFD] text-[#1E1035]">
      <Navbar currentLang={lang} onLanguageChange={setLang} />
      <main className="flex-1">
        {/* 1. Hero with Announcement Banner */}
        <LandingHero lang={lang} />

        {/* 2. Before vs After: Old WhatsApp/PenDrive vs Free QR Print */}
        <LandingComparison lang={lang} />

        {/* 3. Step-by-Step Workflow */}
        <LandingWorkflow lang={lang} />

        {/* 4. Frequently Asked Questions */}
        <LandingFaq lang={lang} />
      </main>
      <Footer />
    </div>
  );
}
