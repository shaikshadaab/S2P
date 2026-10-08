import React from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Phone, Printer } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span>Shakeel Online Services Home</span>
          </Link>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Shop Information
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        <h1 className="text-3xl font-black text-slate-900 mb-2">Contact & Shop Counter</h1>
        <p className="text-sm text-slate-600 mb-8">
          Visit us in person or reach out to our counter staff for document printing and cyber cafe services.
        </p>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Shop Address</h3>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              Shakeel Online Services
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Guntur, Andhra Pradesh, India.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Business Hours</h3>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              Monday – Saturday
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              Morning to Evening (Standard shop timings)
            </p>
          </div>
        </div>

        <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
          <Printer className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <h4 className="text-base font-bold text-emerald-950 mb-1">
            Need urgent prints or photocopies?
          </h4>
          <p className="text-xs text-emerald-800 mb-4">
            You can upload directly from your phone while visiting the shop.
          </p>
          <Link
            href="/s/shakeel-online-services"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
          >
            Open Mobile Print Upload
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        Shakeel Online Services · Guntur, Andhra Pradesh · SOS Print
      </footer>
    </div>
  );
}
