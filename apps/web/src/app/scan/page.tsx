"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PDFDocument } from "pdf-lib";
import { PRIMARY_PILOT_SHOP } from "@s2p/shared";
import {
  ArrowLeft,
  Camera,
  Printer,
  Sparkles,
  Upload,
  CheckCircle2,
  Trash2,
  Plus,
  Loader2,
  Sliders,
  FileText,
  Crop,
  RotateCw
} from "lucide-react";
import EnhancedImageEditor from "@/components/common/EnhancedImageEditor";

interface ScannedPage {
  id: string;
  dataUrl: string;
  file: File;
  rotation: number;
}

export default function DocumentScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activeEditingPage, setActiveEditingPage] = useState<ScannedPage | null>(null);
  const [globalFilter, setGlobalFilter] = useState<"NORMAL" | "HIGH_CONTRAST_BW">("NORMAL");
  const [isCompiling, setIsCompiling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setPages((prev) => [
          ...prev,
          {
            id: `p_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            dataUrl: reader.result as string,
            file,
            rotation: 0
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePage = (id: string) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleRotatePage = (id: string) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  };

  const handleSavePageDerivative = async (derivativeBlob: Blob) => {
    if (!activeEditingPage) return;
    const pageId = activeEditingPage.id;

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(derivativeBlob);
    });

    const newFile = new File([derivativeBlob], activeEditingPage.file.name, {
      type: "image/jpeg"
    });

    setPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, dataUrl, file: newFile } : p))
    );
    setActiveEditingPage(null);
  };

  const handleCompileAndPrint = async () => {
    if (pages.length === 0) {
      setErrorMsg("Please scan or upload at least one page.");
      return;
    }

    setIsCompiling(true);
    setErrorMsg(null);

    try {
      // 1. Compile all scanned pages into a single multi-page PDF
      const pdfDoc = await PDFDocument.create();
      const pageWidth = 595.28;
      const pageHeight = 841.89;

      for (const p of pages) {
        let arrayBuf = await p.file.arrayBuffer();
        let img = p.file.type.includes("png")
          ? await pdfDoc.embedPng(arrayBuf)
          : await pdfDoc.embedJpg(arrayBuf);

        const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);

        const margin = 20;
        const availableW = pageWidth - margin * 2;
        const availableH = pageHeight - margin * 2;
        const scale = Math.min(availableW / img.width, availableH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;

        pdfPage.drawImage(img, {
          x: (pageWidth - w) / 2,
          y: (pageHeight - h) / 2,
          width: w,
          height: h,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const filename = `Scanned_Doc_${Date.now()}.pdf`;
      const compiledFile = new File([blob], filename, { type: "application/pdf" });

      // 2. Upload to Order Draft
      const draftRes = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: PRIMARY_PILOT_SHOP.id }),
      });
      const draftData = await draftRes.json();
      if (!draftRes.ok || !draftData.draftId) {
        throw new Error("Failed to initialize draft session");
      }

      const formData = new FormData();
      formData.append("file", compiledFile);
      formData.append("shopId", PRIMARY_PILOT_SHOP.id);
      formData.append("draftId", draftData.draftId);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload scanned document.");
      }

      router.push(`/print?draftId=${draftData.draftId}`);
    } catch (err) {
      console.error("[ScanPage] Error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to compile document");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span>Shakeel Online Services Home</span>
          </Link>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Camera Document Scanner & Xerox
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-1 w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1.5">
            Camera Document Scanner
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Capture multiple pages of notes, bills, or certificates with your phone camera, adjust corners, enhance readability, and compile into a single print-ready PDF.
          </p>
        </div>

        {/* Capture Buttons */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCapture}
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none"
            >
              <Camera className="w-4 h-4" />
              <span>Capture with Camera</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.multiple = true;
                input.onchange = (e) => handleCapture(e as any);
                input.click();
              }}
              className="px-4 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-none"
            >
              <Upload className="w-4 h-4" />
              <span>Browse Photos</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 self-end sm:self-auto">
            <span className="font-semibold">Enhancement Filter:</span>
            <button
              type="button"
              onClick={() => setGlobalFilter(globalFilter === "HIGH_CONTRAST_BW" ? "NORMAL" : "HIGH_CONTRAST_BW")}
              className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${
                globalFilter === "HIGH_CONTRAST_BW"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {globalFilter === "HIGH_CONTRAST_BW" ? "High-Contrast B&W Active" : "Original Color"}
            </button>
          </div>
        </div>

        {/* Captured Pages Grid */}
        {pages.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">
                Captured Pages ({pages.length})
              </h3>
              <span className="text-xs text-slate-500">Will be compiled into 1 PDF document</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {pages.map((p, idx) => (
                <div key={p.id} className="relative bg-white border border-slate-200 rounded-xl overflow-hidden p-2.5 shadow-xs group flex flex-col justify-between">
                  <div className="w-full h-44 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.dataUrl}
                      alt={`Page ${idx + 1}`}
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                      className={`max-w-full max-h-full object-contain transition-transform ${
                        globalFilter === "HIGH_CONTRAST_BW" ? "grayscale contrast-150" : ""
                      }`}
                    />
                  </div>

                  <div className="pt-2 space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-slate-800">Page {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePage(p.id)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        title="Delete Page"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveEditingPage(p)}
                        className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Crop className="w-3 h-3 text-emerald-600" />
                        <span>Corner Crop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRotatePage(p.id)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] cursor-pointer"
                        title="Rotate 90 degrees"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                disabled={isCompiling}
                onClick={handleCompileAndPrint}
                className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCompiling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling Multipage Document...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    <span>Compile & Send to Print Basket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-center space-y-3">
            <Camera className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">No Scanned Pages Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the button above to capture photos of documents, certificates, or book pages with your phone camera.
            </p>
          </div>
        )}

        {/* Counter Xerox Note */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 block mb-0.5">Need assisted physical paper photocopying (Xerox)?</span>
            <span>
              If you have hardcopy papers to copy, hand the original physical document to the shop operator at the counter. The operator can scan it directly using the shop desktop scanner and queue the copies for you.
            </span>
          </div>
        </div>
      </main>

      {/* Interactive Corner Crop Editor Modal */}
      {activeEditingPage && (
        <EnhancedImageEditor
          imageUrl={activeEditingPage.dataUrl}
          fileId={activeEditingPage.id}
          originalFilename={activeEditingPage.file.name}
          initialMode="DOCUMENT"
          targetPaperSize="A4"
          onSaveDerivative={handleSavePageDerivative}
          onClose={() => setActiveEditingPage(null)}
        />
      )}

      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        Shakeel Online Services • Guntur, Andhra Pradesh • SOS Print
      </footer>
    </div>
  );
}
