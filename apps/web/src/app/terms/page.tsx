import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Footer } from "@/components/footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#121018] flex flex-col">
      <header className="border-b border-black/5 bg-white py-4 px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold hover:text-[#FF2D78] transition-colors">
            <ArrowLeft className="w-4 h-4 text-[#FF2D78]" /> Back to Vintha Print
          </Link>
          <span className="text-[10px] bg-[#FF2D78]/10 text-[#FF2D78] font-bold px-3 py-1 rounded-full uppercase">
            Terms of Free Service
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-black/10 shadow-sm space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold font-heading text-[#121018]">Terms of Service</h1>
            <p className="text-xs sm:text-sm text-black/60 mt-1">Effective Date: October 2026 • Vintha Print System (100% Free Platform)</p>
          </div>

          <section className="space-y-2.5">
            <h3 className="text-base font-extrabold text-[#121018]">1. Agreement to Free Platform Terms</h3>
            <p className="text-xs sm:text-sm text-black/70 leading-relaxed">
              By accessing or using Vintha Print (the web portal, customer QR ordering interface, or the Windows Desktop Print Agent), you agree to these Terms. Vintha Print is provided 100% free of charge to print shop owners, cyber cafes, and walk-in customers with no subscription or license fees.
            </p>
          </section>

          <section className="space-y-2.5">
            <h3 className="text-base font-extrabold text-[#121018]">2. Permitted Document Uploads & Acceptable Use</h3>
            <p className="text-xs sm:text-sm text-black/70 leading-relaxed">
              Customers may only upload lawful documents for personal, educational, or commercial printing. Uploading defamatory, unlawful, or malware-infected content is strictly prohibited. The platform reserves the right to decline or delete files that violate applicable laws.
            </p>
          </section>

          <section className="space-y-2.5">
            <h3 className="text-base font-extrabold text-[#121018]">3. Privacy & Zero-Retention Security</h3>
            <p className="text-xs sm:text-sm text-black/70 leading-relaxed">
              Customer documents are transferred over encrypted HTTPS solely to spool directly to the counter printer selected by the shop. Documents are automatically scheduled for permanent erasure after print completion or within the shop retention window (default 24 hours).
            </p>
          </section>

          <section className="space-y-2.5">
            <h3 className="text-base font-extrabold text-[#121018]">4. Hardware & Printing Disclaimer</h3>
            <p className="text-xs sm:text-sm text-black/70 leading-relaxed">
              Vintha Print provides seamless wireless spooling software for standard Windows-connected printers (HP, Canon, Epson, Brother, TVS). Physical hardware maintenance, paper, and ink replenishment remain the operational responsibility of the shop counter owner.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
