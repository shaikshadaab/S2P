import React from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/footer";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#121018] flex flex-col">
      <header className="border-b border-black/5 bg-white py-4 px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold hover:text-[#FF2D78] transition-colors">
            <ArrowLeft className="w-4 h-4 text-[#FF2D78]" /> Back to Vintha Print
          </Link>
          <span className="text-[10px] bg-[#FF2D78]/10 text-[#FF2D78] font-bold px-3 py-1 rounded-full uppercase">
            Free Service & Print Policy
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 flex-1 w-full">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-black/10 shadow-sm space-y-8">
          <div>
            <h1 className="text-3xl font-extrabold font-heading text-[#121018]">Free Service & Reprint Policy</h1>
            <p className="text-xs sm:text-sm text-black/60 mt-1">Effective Date: October 2026 • Vintha Print 100% Free Platform</p>
          </div>

          <div className="p-5 rounded-2xl bg-pink-50/50 border border-[#FF2D78]/20 flex items-start gap-3.5">
            <ShieldCheck className="w-6 h-6 text-[#FF2D78] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-[#121018] space-y-1">
              <strong className="block font-extrabold text-sm">100% Free System · No Charges or Hidden Billing</strong>
              <p className="text-black/70 leading-relaxed">
                Vintha Print is completely free. There are no software charges, subscription fees, payment processing deductions, or platform commissions.
              </p>
            </div>
          </div>

          <section className="space-y-2.5">
            <h3 className="text-base font-extrabold text-[#121018]">1. Print Jam & Hardware Retry Guarantee</h3>
            <p className="text-xs sm:text-sm text-black/70 leading-relaxed">
              If a physical printer runs out of paper, experiences a paper jam, or goes offline, the Vintha print spooler retains the order safely in queue. The shopkeeper can click <strong>Retry Print</strong> from their dashboard at any time to re-send the document without asking the customer to re-upload.
            </p>
          </section>

          <section className="space-y-2.5">
            <h3 className="text-base font-extrabold text-[#121018]">2. Duplicate Print Prevention</h3>
            <p className="text-xs sm:text-sm text-black/70 leading-relaxed">
              The system utilizes atomic print leases and idempotency locks. Once a job has completed printing on the shop printer, it cannot be accidentally triggered twice, ensuring paper and ink are never wasted.
            </p>
          </section>

          <section className="space-y-2.5">
            <h3 className="text-base font-extrabold text-[#121018]">3. Shop Counter Support</h3>
            <p className="text-xs sm:text-sm text-black/70 leading-relaxed">
              Walk-in customers can communicate directly with the counter staff for paper preference, binding, or lamination needs. For platform technical assistance, shop owners can reach support via WhatsApp at +91 95815 29381.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
