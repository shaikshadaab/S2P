import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, RotateCcw } from "lucide-react";

export default function TermsAndRefundPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span>SOS Print &middot; Shakeel Online Services</span>
          </Link>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Terms & Refunds
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Terms of Service & Refund Policy</h1>
        <p className="text-xs text-slate-500 mb-8">
          Shakeel Online Services · Guntur, Andhra Pradesh
        </p>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
              <FileText className="w-5 h-5" />
              <span>1. Printing Service Terms</span>
            </div>
            <p>
              Prices are calculated strictly in integer paise based on the shop rate version active at the time of your quote. Customers are responsible for verifying their uploaded files, page numbers, orientation, and copies before confirming payment.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
              <RotateCcw className="w-5 h-5" />
              <span>2. Refund & Reprint Policy</span>
            </div>
            <p>
              In the unlikely event of a hardware malfunction (e.g. paper jam, ink smear, or printer interruption) where sheets fail to print correctly after verified payment, our shop operator will promptly reprint the affected pages at no extra charge or issue an immediate counter refund.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>3. Online Payments</span>
            </div>
            <p>
              Online transactions processed through UPI or Razorpay are settled directly with Shakeel Online Services. In case of payment debited but order state not updated due to network issues, show your UPI transaction ID / SMS to the shop operator for manual confirmation.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        Shakeel Online Services · Guntur, Andhra Pradesh · SOS Print
      </footer>
    </div>
  );
}
