import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Trash2, Clock } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span>SOS Print • Shakeel Online Services</span>
          </Link>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Privacy Policy
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Document Privacy & Data Protection</h1>
        <p className="text-xs text-slate-500 mb-8">
          Effective Date: October 2026 · Shakeel Online Services, Guntur, Andhra Pradesh
        </p>

        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span>1. Complete Document Confidentiality</span>
            </div>
            <p>
              Your uploaded documents (ID proofs, certificates, resumes, forms, photos) are strictly accessed only for the sole purpose of rendering and sending them to the shop printer for your order. We never share, sell, or disclose customer documents to any third parties.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
              <Trash2 className="w-5 h-5" />
              <span>2. Automated File Purge & Storage Lifecycle</span>
            </div>
            <p>
              Uploaded temporary files are stored in private cloud storage with temporary authorization tokens. Once an order is completed, or if a draft session expires without payment, automated lifecycle cleanup permanently deletes files from temporary storage to protect your privacy.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
              <Lock className="w-5 h-5" />
              <span>3. Isolated Customer Sessions</span>
            </div>
            <p>
              Each upload session receives a cryptographically secure, high-entropy token. Customers cannot view or access files uploaded by other customers, even within the same shop.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2">
              <Clock className="w-5 h-5" />
              <span>4. Contact Information</span>
            </div>
            <p>
              For privacy inquiries regarding your documents, please speak directly to the shop operator at our Guntur counter or reach out via WhatsApp at the phone number listed on your printed receipt.
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
