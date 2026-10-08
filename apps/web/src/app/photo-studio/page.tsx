"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ImpositionEngine,
  PRIMARY_PILOT_SHOP,
  CardLayoutMode
} from "@s2p/shared";
import {
  ArrowLeft,
  Image as ImageIcon,
  UserCheck,
  Printer,
  Sparkles,
  Upload,
  CheckCircle2,
  RotateCw,
  ZoomIn,
  Loader2,
  Trash2
} from "lucide-react";

export default function PhotoStudioPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<"PASSPORT" | "GRID">("PASSPORT");
  const [passportWidthMm, setPassportWidthMm] = useState<number>(35);
  const [passportHeightMm, setPassportHeightMm] = useState<number>(45);
  const [copies, setCopies] = useState<number>(6);
  const [paperSize, setPaperSize] = useState<"A4" | "PHOTO_4X6">("A4");

  const [gridSlots, setGridSlots] = useState<number>(4);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (JPG or PNG)");
      return;
    }

    setPhotoFile(file);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAndPrint = async () => {
    if (!photoFile || !photoDataUrl) {
      setErrorMsg("Please select a photo first.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // Convert DataURL to Uint8Array
      const arrayBuffer = await photoFile.arrayBuffer();
      const assetBytes = new Uint8Array(arrayBuffer);

      // Call ImpositionEngine
      const layoutMode: CardLayoutMode = mode === "PASSPORT" ? "PASSPORT_PHOTO_SHEET" : (gridSlots === 2 ? "MULTI_UP_2" : gridSlots === 6 ? "MULTI_UP_6" : "MULTI_UP_4");

      const result = await ImpositionEngine.generatePrintMaster({
        frontAsset: {
          data: assetBytes,
          mimeType: photoFile.type,
        },
        paperSize: paperSize === "PHOTO_4X6" ? "PHOTO_4X6" : "A4",
        layoutMode,
        copies,
      });

      const blob = new Blob([result.pdfBytes as any], { type: "application/pdf" });
      const filename = `${mode === "PASSPORT" ? "Passport_Photos" : "Photo_Grid"}.pdf`;
      const generatedPdfFile = new File([blob], filename, { type: "application/pdf" });

      // Create Draft & Upload
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
      formData.append("file", generatedPdfFile);
      formData.append("shopId", PRIMARY_PILOT_SHOP.id);
      formData.append("draftId", draftData.draftId);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload imposed photo PDF.");
      }

      router.push(`/s/${PRIMARY_PILOT_SHOP.slug}`);
    } catch (err) {
      console.error("[PhotoStudio] Imposition error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Error generating photo layout");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span>Shakeel Online Services Home</span>
          </Link>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Photo Studio &amp; Passport Layouts
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Photo &amp; Passport Sheet Studio</h1>
          <p className="text-sm text-slate-600">
            Generate standard 35Ã—45mm passport photo repeat sheets or multi-photo A4 grids with cutting guides.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setMode("PASSPORT")}
            className={`p-5 rounded-2xl border text-left transition flex items-center gap-4 ${
              mode === "PASSPORT"
                ? "border-emerald-600 bg-white shadow-md ring-2 ring-emerald-600/20"
                : "border-slate-200 bg-white/70 hover:bg-white"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === "PASSPORT" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">Passport Photo Sheets</div>
              <div className="text-xs text-slate-500">Repeated photos with mm sizing &amp; cut guides</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("GRID")}
            className={`p-5 rounded-2xl border text-left transition flex items-center gap-4 ${
              mode === "GRID"
                ? "border-emerald-600 bg-white shadow-md ring-2 ring-emerald-600/20"
                : "border-slate-200 bg-white/70 hover:bg-white"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === "GRID" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">A4 Photo Grid Sheets</div>
              <div className="text-xs text-slate-500">1, 2, 4, 6, 9 or 12 photos per sheet</div>
            </div>
          </button>
        </div>

        {/* Upload & Controls */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Photo Upload & Preview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png"
              className="hidden"
            />

            {photoDataUrl ? (
              <div className="space-y-4 w-full flex flex-col items-center">
                <div className="relative w-48 h-60 border-2 border-dashed border-emerald-500 rounded-xl overflow-hidden shadow-inner bg-slate-100 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoDataUrl} alt="Selected" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Change Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoDataUrl(null);
                      setPhotoFile(null);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-16 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl cursor-pointer flex flex-col items-center gap-3 transition"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800">Click to Select Photo</span>
                  <p className="text-xs text-slate-500 mt-1">Supports JPG and PNG up to 15 MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Layout Settings */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-900 text-sm">Layout Specifications</h3>

            {mode === "PASSPORT" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Width (mm)</label>
                    <input
                      type="number"
                      value={passportWidthMm}
                      onChange={(e) => setPassportWidthMm(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Height (mm)</label>
                    <input
                      type="number"
                      value={passportHeightMm}
                      onChange={(e) => setPassportHeightMm(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Photos per Sheet</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[4, 6, 8].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCopies(c)}
                        className={`py-2 rounded-lg text-xs font-bold border transition ${
                          copies === c ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 bg-white"
                        }`}
                      >
                        {c} Photos
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Paper Sheet</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaperSize("A4")}
                      className={`py-2 rounded-lg text-xs font-bold border transition ${
                        paperSize === "A4" ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 bg-white"
                      }`}
                    >
                      A4 Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperSize("PHOTO_4X6")}
                      className={`py-2 rounded-lg text-xs font-bold border transition ${
                        paperSize === "PHOTO_4X6" ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 bg-white"
                      }`}
                    >
                      4Ã—6 Photo Paper
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grid Layout (Photos per A4)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 4, 6].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGridSlots(g)}
                        className={`py-2 rounded-lg text-xs font-bold border transition ${
                          gridSlots === g ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 bg-white"
                        }`}
                      >
                        {g} Photos / Sheet
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              disabled={isProcessing || !photoDataUrl}
              onClick={handleGenerateAndPrint}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Imposing &amp; Creating PDF...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Generate Print-Ready Master PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        Shakeel Online Services Â· Guntur, Andhra Pradesh Â· SOS Print
      </footer>
    </div>
  );
}
