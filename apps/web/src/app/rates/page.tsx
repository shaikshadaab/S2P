"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SosLogo } from "@/components/common/SosLogo";
import {
  Printer,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowLeft,
  Calculator,
  Layers,
  Image as ImageIcon,
  BookOpen
} from "lucide-react";

export default function RatesPage() {
  const [lang, setLang] = useState<"en" | "hi">("en");

  // Interactive Calculator State
  const [calcService, setCalcService] = useState<"BW" | "COLOR">("BW");
  const [calcPaper, setCalcPaper] = useState<"A4" | "A3">("A4");
  const [calcSides, setCalcSides] = useState<"SINGLE" | "DUPLEX">("SINGLE");
  const [calcPages, setCalcPages] = useState<number>(5);
  const [calcCopies, setCalcCopies] = useState<number>(1);
  const [calcFinishing, setCalcFinishing] = useState<"NONE" | "SPIRAL" | "LAMINATION">("NONE");

  // Pricing formula matching authoritative engine
  const calculateEstimate = () => {
    let printCost = 0.0;
    const isDuplex = calcSides === "DUPLEX";
    const sheetsPerCopy = isDuplex ? Math.ceil(calcPages / 2) : calcPages;
    const totalSheets = sheetsPerCopy * calcCopies;
    const totalPrintedSides = calcPages * calcCopies;

    if (calcPaper === "A4") {
      if (calcService === "BW") {
        // Authoritative: ₹2 per single printed side, ₹3 per output duplex sheet
        if (isDuplex) {
          printCost = totalSheets * 3.0;
        } else {
          printCost = totalPrintedSides * 2.0;
        }
      } else {
        // A4 Colour: ₹10 per printed side
        printCost = totalPrintedSides * 10.0;
      }
    } else {
      // A3 paper handling
      if (calcService === "BW") {
        printCost = isDuplex ? totalSheets * 15.0 : totalPrintedSides * 10.0;
      } else {
        printCost = isDuplex ? totalSheets * 40.0 : totalPrintedSides * 25.0;
      }
    }

    let finishingCost = 0;
    if (calcFinishing === "SPIRAL") {
      finishingCost = 35.0 * calcCopies;
    } else if (calcFinishing === "LAMINATION") {
      finishingCost = 20.0 * Math.ceil(calcPages / (calcSides === "DUPLEX" ? 2 : 1)) * calcCopies;
    }

    const total = Math.max(5.0, printCost + finishingCost);
    return total.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 hover:text-slate-700">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <SosLogo variant="horizontal" size="sm" href="/" />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              {lang === "en" ? "  " : "View in English"}
            </button>
            <Link
              href="/print"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
            >
              {lang === "en" ? "Print Now" : "  "}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 w-full space-y-12">
        {/* Title & Shop Badge */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === "en" ? "Official Counter Rates" : "   "}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {lang === "en" ? "Transparent Printing & Xerox Rates" : "    "}
          </h1>
          <p className="text-sm text-slate-600">
            {lang === "en"
              ? "Accurate rates configured directly by Shakeel Online Services, Guntur. Exact integer paise billing, zero hidden fees."
              : "  ,          "
            }
          </p>
        </div>

        {/* Pricing Tables Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* 1. Document Printing (A4 / A3) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {lang === "en" ? "Document Printing (A4 & A3)" : "  (A4 & A3)"}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === "en" ? "Laser & Inkjet high clarity" : "-    "}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">A4 Black &amp; White (Single Side)</span>
                <span className="font-bold text-emerald-700 font-mono">₹2.00 / printed side</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">A4 Black &amp; White (Both Sides / Duplex)</span>
                <span className="font-bold text-emerald-700 font-mono">₹3.00 / sheet</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">A4 Color (Single Side)</span>
                <span className="font-bold text-emerald-700 font-mono">₹10.00 / printed side</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-500">Duplex Odd Sheet Rate</span>
                <span className="font-semibold text-slate-600 font-mono">₹3.00 / sheet</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-400">A3 Black &amp; White</span>
                <span className="text-[11px] font-medium text-slate-400 italic">Rate not configured</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-400">A3 Color</span>
                <span className="text-[11px] font-medium text-slate-400 italic">Rate not configured</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5">
                <span className="font-medium text-slate-400">A4 Color Duplex</span>
                <span className="text-[11px] font-medium text-slate-400 italic">Rate not configured</span>
              </div>
            </div>
          </div>

          {/* 2. Photo Studio & ID Cards */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {lang === "en" ? "Photo Prints & ID Cards" : "    "}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === "en" ? "Glossy / Matte premium paper" : "     "}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <div>
                  <span className="font-medium text-slate-700 block">Passport Photos Set</span>
                  <span className="text-[10px] text-amber-600">Needs owner confirmation (count &amp; size)</span>
                </div>
                <span className="font-bold text-emerald-700 font-mono">₹100.00 / set</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-400">4×6 Glossy Photo Print</span>
                <span className="text-[11px] font-medium text-slate-400 italic">Rate not configured</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-400">Aadhaar / PAN ID Copy</span>
                <span className="text-[11px] font-medium text-slate-400 italic">Rate not configured</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5">
                <span className="font-medium text-slate-400">PVC Card Lamination</span>
                <span className="text-[11px] font-medium text-slate-400 italic">Rate not configured</span>
              </div>
            </div>
          </div>

          {/* 3. Finishing & Binding Services */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {lang === "en" ? "Finishing & Binding" : "  "}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === "en" ? "Professional project presentation" : ",    "}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">Spiral Binding (Up to 100 pages)</span>
                <span className="font-bold text-slate-900 font-mono">₹35.00 / book</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">Spiral Binding (100–300 pages)</span>
                <span className="font-bold text-slate-900 font-mono">₹50.00 / book</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">A4 Document Lamination</span>
                <span className="font-bold text-slate-900 font-mono">₹20.00 / sheet</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">A3 Certificate Lamination</span>
                <span className="font-bold text-slate-900 font-mono">₹40.00 / sheet</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5">
                <span className="font-medium text-slate-700">Stapling &amp; Corner Corner Clip</span>
                <span className="font-bold text-emerald-700 font-mono">FREE / </span>
              </div>
            </div>
          </div>

          {/* 4. Scanning & Xerox */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {lang === "en" ? "Scanning & Xerox Services" : "   "}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === "en" ? "Fast digital copies & uploads" : "    "}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">A4 Xerox (Single Side)</span>
                <span className="font-bold text-slate-900 font-mono">₹2.00 / page</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">A4 Xerox (Both Sides / Duplex)</span>
                <span className="font-bold text-slate-900 font-mono">₹3.00 / sheet</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">High-Resolution Color Scan to PDF</span>
                <span className="font-bold text-slate-900 font-mono">₹5.00 / page</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
                <span className="font-medium text-slate-700">Send Scan to WhatsApp / Email</span>
                <span className="font-bold text-emerald-700 font-mono">FREE / </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1.5">
                <span className="font-medium text-slate-700">Minimum Order Charge</span>
                <span className="font-bold text-slate-900 font-mono">₹5.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Rate Calculator */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {lang === "en" ? "Instant Cost Calculator" : "  "}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === "en"
                  ? "Test your exact quantity and options against the shop's pricing engine"
                  : "          "
                }
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Column 1: Options */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Color Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalcService("BW")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      calcService === "BW"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Black &amp; White
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcService("COLOR")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      calcService === "COLOR"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Color
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Paper Size</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalcPaper("A4")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      calcPaper === "A4"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    A4 Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcPaper("A3")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      calcPaper === "A3"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    A3 Large
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: Sides & Pages */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Sides</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalcSides("SINGLE")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      calcSides === "SINGLE"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Single Side
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcSides("DUPLEX")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      calcSides === "DUPLEX"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    Both Sides (Duplex)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Number of Pages</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={calcPages}
                    onChange={(e) => setCalcPages(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Copies</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={calcCopies}
                    onChange={(e) => setCalcCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Optional Finishing</label>
                <select
                  value={calcFinishing}
                  onChange={(e) => setCalcFinishing(e.target.value as any)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="NONE">None</option>
                  <option value="SPIRAL">Spiral Binding (+₹35 / copy)</option>
                  <option value="LAMINATION">Lamination (+₹20 / sheet)</option>
                </select>
              </div>
            </div>

            {/* Column 3: Live Output Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Estimated Total
                </span>
                <div className="text-4xl font-black text-emerald-700 font-mono">
                  ₹{calculateEstimate()}
                </div>
                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Total Printed Sides:</span>
                    <span className="font-semibold">{calcPages * calcCopies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paper Sheets Used:</span>
                    <span className="font-semibold">
                      {Math.ceil(calcPages / (calcSides === "DUPLEX" ? 2 : 1)) * calcCopies}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <Link
                  href="/print"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Upload &amp; Print with These Settings</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        Shakeel Online Services &bull; Guntur, Andhra Pradesh &bull; SOS Print
      </footer>
    </div>
  );
}
