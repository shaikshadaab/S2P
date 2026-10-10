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
  Trash2,
  Crop
} from "lucide-react";
import EnhancedImageEditor from "@/components/common/EnhancedImageEditor";

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
  const [isEditorOpen, setIsEditorOpen] = useState(false);

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

  const handleSaveCroppedPhoto = async (derivativeBlob: Blob) => {
    if (!photoFile) return;
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(derivativeBlob);
    });

    const newFile = new File([derivativeBlob], photoFile.name, {
      type: "image/jpeg"
    });
    setPhotoDataUrl(dataUrl);
    setPhotoFile(newFile);
    setIsEditorOpen(false);
  };

  const handleGenerateAndPrint = async () => {
    if (!photoFile || !photoDataUrl) {
      setErrorMsg("Please select a photo first.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const arrayBuffer = await photoFile.arrayBuffer();
      const assetBytes = new Uint8Array(arrayBuffer);

      const layoutMode: CardLayoutMode = mode === "PASSPORT"
        ? "PASSPORT_PHOTO_SHEET"
        : (gridSlots === 2 ? "MULTI_UP_2" : gridSlots === 6 ? "MULTI_UP_6" : "MULTI_UP_4");

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
        throw new Error(uploadData.error || "Failed to upload photo sheet PDF.");
      }

      router.push(`/print?draftId=${draftData.draftId}`);
    } catch (err) {
      console.error("[PhotoStudio] Imposition error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Error generating photo layout");
    } finally {
      setIsProcessing(false);
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
            Photo Studio & Passport Layouts
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-1 w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1.5">Photo & Passport Sheet Studio</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Generate standard 35 × 45 mm passport photo repeat sheets or multi-photo A4 grids with cutting guides.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setMode("PASSPORT")}
            className={`p-5 rounded-2xl border text-left transition flex items-center gap-4 cursor-pointer ${
              mode === "PASSPORT"
                ? "border-emerald-600 bg-white shadow-xs ring-2 ring-emerald-600/20"
                : "border-slate-200 bg-white/70 hover:bg-white"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === "PASSPORT" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">Passport Photo Sheets</div>
              <div className="text-xs text-slate-500">Repeated photos with mm sizing & cut guides</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("GRID")}
            className={`p-5 rounded-2xl border text-left transition flex items-center gap-4 cursor-pointer ${
              mode === "GRID"
                ? "border-emerald-600 bg-white shadow-xs ring-2 ring-emerald-600/20"
                : "border-slate-200 bg-white/70 hover:bg-white"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode === "GRID" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900">A4 Photo Grid Sheets</div>
              <div className="text-xs text-slate-500">2, 4, or 6 photos per sheet</div>
            </div>
          </button>
        </div>

        {/* Upload & Controls */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Photo Upload & Preview */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center text-center">
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
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(true)}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Crop & Align</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Change Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoDataUrl(null);
                      setPhotoFile(null);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                    title="Remove Photo"
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
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
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
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Height (mm)</label>
                    <input
                      type="number"
                      value={passportHeightMm}
                      onChange={(e) => setPassportHeightMm(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Photos Per Sheet</label>
                  <select
                    value={copies}
                    onChange={(e) => setCopies(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value={4}>4 Photos (2 × 2)</option>
                    <option value={6}>6 Photos (2 × 3)</option>
                    <option value={8}>8 Photos (2 × 4)</option>
                    <option value={12}>12 Photos (3 × 4)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Paper Size</label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="A4">A4 Sheet (210 × 297 mm)</option>
                    <option value="PHOTO_4X6">4×6 Glossy Photo Paper (100 × 150 mm)</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grid Layout</label>
                  <select
                    value={gridSlots}
                    onChange={(e) => setGridSlots(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value={2}>2 Photos (Side by Side)</option>
                    <option value={4}>4 Photos (2 × 2 Grid)</option>
                    <option value={6}>6 Photos (2 × 3 Grid)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Output Paper</label>
                  <input
                    type="text"
                    disabled
                    value="A4 Standard (210 × 297 mm)"
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-xl text-xs font-medium"
                  />
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
              disabled={isProcessing || !photoFile}
              onClick={handleGenerateAndPrint}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Imposing & Creating PDF...</span>
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

      {/* Crop Modal */}
      {isEditorOpen && photoDataUrl && photoFile && (
        <EnhancedImageEditor
          imageUrl={photoDataUrl}
          fileId="photo_studio"
          originalFilename={photoFile.name}
          initialMode="PORTRAIT"
          targetPaperSize={paperSize === "PHOTO_4X6" ? "PHOTO_4X6" : "PASSPORT"}
          onSaveDerivative={handleSaveCroppedPhoto}
          onClose={() => setIsEditorOpen(false)}
        />
      )}

      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        Shakeel Online Services • Guntur, Andhra Pradesh • SOS Print
      </footer>
    </div>
  );
}
