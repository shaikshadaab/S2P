"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Upload,
  ArrowLeft,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  ChevronRight,
  Info
} from "lucide-react";
import { PRIMARY_PILOT_SHOP } from "@s2p/shared";
import { SosLogo } from "@/components/common/SosLogo";

export default function MiniPrintPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(4);
  const [nUpMode, setNUpMode] = useState<2 | 4>(2);
  const [duplexMode, setDuplexMode] = useState<"SINGLE" | "DOUBLE">("SINGLE");
  const [copies, setCopies] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Rough estimate or default pages
      setPageCount(4);
    }
  };

  // Calculations
  const pagesPerSheet = nUpMode;
  const rawSheets = Math.ceil(pageCount / pagesPerSheet);
  const physicalSheets = duplexMode === "DOUBLE" ? Math.ceil(rawSheets / 2) : rawSheets;
  const totalOutputSheets = physicalSheets * copies;

  // Pricing: A4 simplex = 200 paise, A4 duplex = 300 paise
  const ratePerSheetPaise = duplexMode === "DOUBLE" ? 300 : 200;
  const totalPaise = totalOutputSheets * ratePerSheetPaise;
  const finalPriceRupees = (Math.max(500, totalPaise) / 100).toFixed(2);

  const handleProceedToBasket = () => {
    // Navigate to /print
    router.push("/print");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] pb-16 selection:bg-emerald-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <SosLogo variant="horizontal" size="sm" href="/" />
          <Link
            href="/print"
            className="flex items-center gap-1.5 text-xs font-bold text-[#475569] hover:text-[#111827] px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-slate-50 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Standard Print</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Tool Banner */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>Paper Saver Multi-Page Printing</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111827] mt-0.5">
                Mini Print (N-Up Tool)
              </h1>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Priced by Output Sheet
            </span>
          </div>

          <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-3 text-xs text-[#475569] space-y-1">
            <strong>How Mini Print works:</strong>
            <p>
              1. Upload your multi-page study notes or PDF document. <br />
              2. Choose 2 pages per sheet (2-Up) or 4 pages per sheet (4-Up). <br />
              3. Check preview and confirmed physical sheet price. <br />
              4. Add to print basket and collect at Shakeel Online Services counter.
            </p>
          </div>
        </div>

        {/* Upload & Configuration Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: File & Options */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-5">
            <h2 className="text-sm font-bold text-[#111827] flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>1. Select PDF Document</span>
            </h2>

            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#CBD5E1] hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-emerald-50/20 transition space-y-2"
            >
              <FileText className="w-8 h-8 text-emerald-600 mx-auto" />
              <div className="text-xs font-bold text-[#111827]">
                {selectedFile ? selectedFile.name : "Click to Choose PDF Document"}
              </div>
              <p className="text-[11px] text-[#64748B]">
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB PDF file` : "Supports lecture slides, notes & reading handouts"}
              </p>
            </div>

            {/* Layout Options */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-[#111827] block">
                2. Pages Per Sheet (Layout)
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setNUpMode(2)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    nUpMode === 2
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold">2 Pages Per Sheet</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">2-Up side-by-side (50% paper savings)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setNUpMode(4)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    nUpMode === 4
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-bold">4 Pages Per Sheet</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">4-Up grid (75% paper savings)</div>
                </button>
              </div>
            </div>

            {/* Duplex Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#111827] block">
                3. Sides Mode
              </label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setDuplexMode("SINGLE")}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    duplexMode === "SINGLE"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  Single-Sided (Simplex)
                </button>
                <button
                  type="button"
                  onClick={() => setDuplexMode("DOUBLE")}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    duplexMode === "DOUBLE"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  2-Sided (Duplex)
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Layout Preview & Price */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Output Sheet Preview</span>
              </h2>

              {/* Visual Sheet Container */}
              <div className="aspect-[1/1.414] max-w-[240px] mx-auto bg-slate-50 border-2 border-slate-300 rounded-xl p-3 shadow-inner flex items-center justify-center">
                {nUpMode === 2 ? (
                  <div className="grid grid-cols-1 gap-2 w-full h-full">
                    <div className="bg-white border border-slate-200 rounded p-2 text-center text-[9px] text-slate-400 flex items-center justify-center shadow-xs">
                      Page 1
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-2 text-center text-[9px] text-slate-400 flex items-center justify-center shadow-xs">
                      Page 2
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 w-full h-full">
                    <div className="bg-white border border-slate-200 rounded p-1 text-center text-[8px] text-slate-400 flex items-center justify-center shadow-xs">
                      P1
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-1 text-center text-[8px] text-slate-400 flex items-center justify-center shadow-xs">
                      P2
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-1 text-center text-[8px] text-slate-400 flex items-center justify-center shadow-xs">
                      P3
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-1 text-center text-[8px] text-slate-400 flex items-center justify-center shadow-xs">
                      P4
                    </div>
                  </div>
                )}
              </div>

              {/* Sheet Math Calculation */}
              <div className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Document Pages:</span>
                  <span className="font-mono font-bold text-[#111827]">{pageCount} pages</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Pages Per Sheet:</span>
                  <span className="font-mono font-bold text-[#111827]">{nUpMode}-Up</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Physical Output Sheets:</span>
                  <span className="font-mono font-bold text-emerald-700">{totalOutputSheets} sheet(s)</span>
                </div>
              </div>
            </div>

            {/* Quote and CTA */}
            <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Authoritative Quote
                  </span>
                  <span className="text-xs text-slate-500">
                    Includes minimum order protection
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono">
                  ₹{finalPriceRupees}
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToBasket}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Proceed to Print Queue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
