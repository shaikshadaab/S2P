import React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, QrCode, FileText, CreditCard, Printer, Shield } from "lucide-react";

export default function HowToPrintPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span>Shakeel Online Services Home</span>
          </Link>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            SOS Print Guide
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 mb-2">How to Print (प्रिंट कैसे करें)</h1>
          <p className="text-sm text-slate-600">
            Follow these 4 simple steps to print documents and photos directly at Shakeel Online Services, Guntur.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Scan QR or Open Link (QR स्कैन करें)</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Scan the QR code placed at our shop counter using your phone camera or Google Lens, or visit <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">/print</code>. No app download or user signup is required.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Upload Documents or Photos (फ़ाइल अपलोड करें)</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Upload up to 10 files (PDF, JPG, PNG). Our system instantly checks the verified page count and provides an exact, honest price quote in rupees according to shop rates.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Select Preferences & Pay (सेटिंग्स चुनें और भुगतान करें)</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Choose B&W or Color, Single or Double-sided, and number of copies. Pay conveniently via Cash at the shop counter, UPI QR code, or online via Razorpay.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Collect Prints (प्रिंटर से प्रिंट कलेक्ट करें)</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your job is securely transferred to our shop PC and printed directly on the printer tray. Collect your fresh documents from the counter staff.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-emerald-950 text-base">Ready to print your files?</h4>
            <p className="text-xs text-emerald-800">Start your print session immediately on your phone.</p>
          </div>
          <Link
            href="/s/shakeel-online-services"
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition whitespace-nowrap"
          >
            Launch Print Portal
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        Shakeel Online Services · Guntur, Andhra Pradesh · SOS Print
      </footer>
    </div>
  );
}
