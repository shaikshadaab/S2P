import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { Footer } from "@/components/footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#121018] flex flex-col">
      <header className="border-b border-black/5 bg-white py-4 px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold hover:text-[#FF2D78] transition-colors">
            <ArrowLeft className="w-4 h-4 text-[#FF2D78]" /> Back to Vintha Print
          </Link>
          <span className="text-[10px] bg-[#FF2D78]/10 text-[#FF2D78] font-bold px-3 py-1 rounded-full uppercase">
            Privacy & Document Security
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-black/10 shadow-sm space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold font-heading text-[#121018]">Privacy & Document Security Policy</h1>
            <p className="text-xs sm:text-sm text-black/60 mt-1">Effective Date: October 2026 • Vintha Print Zero-Retention Guarantee</p>
          </div>

          <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200 flex items-start gap-3.5">
            <Lock className="w-6 h-6 text-[#1E1035] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-[#121018] space-y-1">
              <strong className="block font-extrabold text-sm">Customer Privacy First · Zero Pen Drive Virus Exposure</strong>
              <p className="text-black/70 leading-relaxed">
                Customers no longer need to connect their personal phones via USB cables, insert infected pen drives into public PCs, or share personal WhatsApp numbers with counter staff.
              </p>
            </div>
          </div>

          <section className="space-y-2.5">
            <h3 className="text-base font-extrabold text-[#121018]">1. What Data We Process</h3>
            <p className="text-xs sm:text-sm text-black/70 leading-relaxed">
              We process only the file uploaded by the customer (PDF, JPG, PNG) and basic print options (page range, copies, black & white or color). No Aadhaar, PAN, or financial numbers are extracted or indexed.
            </p>
          </section>

          <section className="space-y-2.5">
            <h3 className="text-base font-extrabold text-[#121018]">2. Automatic Document Deletion</h3>
            <p className="text-xs sm:text-sm text-black/70 leading-relaxed">
              Uploaded files are stored temporarily in isolated encrypted buckets only until spooled to the shop's printer. After successful printing (or after the configured retention window), files are automatically and permanently purged.
            </p>
          </section>

          <section className="space-y-2.5">
            <h3 className="text-base font-extrabold text-[#121018]">3. Shop Security & Device Pairing</h3>
            <p className="text-xs sm:text-sm text-black/70 leading-relaxed">
              Counter computers pair securely using time-limited 6-digit cryptographic pairing tokens over outbound HTTPS (Port 443). No inbound ports or firewall holes are opened on the shop network.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
