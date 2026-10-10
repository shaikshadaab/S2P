"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Upload,
  ArrowLeft,
  RotateCw,
  Download,
  Printer,
  Sparkles,
  Scissors,
  ArrowRightLeft,
  CheckCircle2,
  Maximize2,
  Crop,
  Trash2
} from "lucide-react";
import EnhancedImageEditor from "@/components/common/EnhancedImageEditor";

interface CardPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
}

const PRESETS: CardPreset[] = [
  { id: "aadhaar", name: "Aadhaar Card", widthMm: 85.6, heightMm: 54 },
  { id: "pan", name: "PAN Card", widthMm: 85.6, heightMm: 54 },
  { id: "voter", name: "Voter ID", widthMm: 85.6, heightMm: 54 },
  { id: "dl", name: "Driving License", widthMm: 85.6, heightMm: 54 },
  { id: "custom", name: "Custom Size", widthMm: 85.6, heightMm: 54 }
];

export default function IdCardStudioPage() {
  const [preset, setPreset] = useState<string>("aadhaar");
  const [cardWidthMm, setCardWidthMm] = useState<number>(85.6);
  const [cardHeightMm, setCardHeightMm] = useState<number>(54);

  const [layoutStyle, setLayoutStyle] = useState<"STACKED" | "SIDE_BY_SIDE">("STACKED");
  const [showCutGuides, setShowCutGuides] = useState<boolean>(true);
  const [colorMode, setColorMode] = useState<"COLOR" | "BW_ENHANCED">("COLOR");

  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [frontRotation, setFrontRotation] = useState<number>(0);
  const [backRotation, setBackRotation] = useState<number>(0);

  // Editor Modal State
  const [editingSide, setEditingSide] = useState<"front" | "back" | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handlePresetChange = (presetId: string) => {
    setPreset(presetId);
    const found = PRESETS.find((p) => p.id === presetId);
    if (found && presetId !== "custom") {
      setCardWidthMm(found.widthMm);
      setCardHeightMm(found.heightMm);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (side === "front") setFrontImage(dataUrl);
      else setBackImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSwapSides = () => {
    const tempImg = frontImage;
    const tempRot = frontRotation;
    setFrontImage(backImage);
    setFrontRotation(backRotation);
    setBackImage(tempImg);
    setBackRotation(tempRot);
  };

  const handleSaveCroppedSide = async (derivativeBlob: Blob) => {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(derivativeBlob);
    });

    if (editingSide === "front") {
      setFrontImage(dataUrl);
    } else if (editingSide === "back") {
      setBackImage(dataUrl);
    }
    setEditingSide(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const a4W = 1240;
    const a4H = 1754;
    canvas.width = a4W;
    canvas.height = a4H;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, a4W, a4H);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";

    // 1mm ~ 5.9 px at 150 DPI (A4: 210mm x 297mm -> 1240 x 1754)
    const pxPerMm = a4W / 210;
    const cardWPx = cardWidthMm * pxPerMm;
    const cardHPx = cardHeightMm * pxPerMm;

    let frontX = 0;
    let frontY = 0;
    let backX = 0;
    let backY = 0;

    if (layoutStyle === "STACKED") {
      frontX = (a4W - cardWPx) / 2;
      frontY = a4H * 0.18;
      backX = frontX;
      backY = frontY + cardHPx + 40;
    } else {
      const totalW = cardWPx * 2 + 50;
      frontX = (a4W - totalW) / 2;
      frontY = a4H * 0.28;
      backX = frontX + cardWPx + 50;
      backY = frontY;
    }

    const drawCard = (imgUrl: string | null, x: number, y: number, rotation: number, label: string) => {
      if (imgUrl) {
        const img = new Image();
        img.src = imgUrl;
        img.onload = () => {
          ctx.save();
          ctx.translate(x + cardWPx / 2, y + cardHPx / 2);
          ctx.rotate((rotation * Math.PI) / 180);

          if (colorMode === "BW_ENHANCED") {
            ctx.filter = "grayscale(100%) contrast(140%)";
          }

          ctx.drawImage(img, -cardWPx / 2, -cardHPx / 2, cardWPx, cardHPx);
          ctx.restore();

          if (showCutGuides) {
            ctx.strokeStyle = "#cbd5e1";
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 6]);
            ctx.strokeRect(x, y, cardWPx, cardHPx);
            ctx.setLineDash([]);
          }
        };
      } else {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(x, y, cardWPx, cardHPx);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cardWPx, cardHPx);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(label, x + cardWPx / 2, y + cardHPx / 2 - 10);
        ctx.font = "12px sans-serif";
        ctx.fillText(`${cardWidthMm}mm × ${cardHeightMm}mm`, x + cardWPx / 2, y + cardHPx / 2 + 15);
      }
    };

    drawCard(frontImage, frontX, frontY, frontRotation, "FRONT SIDE EMPTY");
    drawCard(backImage, backX, backY, backRotation, "BACK SIDE EMPTY");

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Shakeel Online Services • ID Card 1:1 Scale Print Layout (A4)", a4W / 2, a4H - 50);
  }, [frontImage, backImage, frontRotation, backRotation, cardWidthMm, cardHeightMm, layoutStyle, showCutGuides, colorMode]);

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `ID_Card_Print_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span>Shakeel Online Services Home</span>
          </Link>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            ID Card 1-Sheet Layout (CR80)
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 flex-1 w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1.5">ID Card Front & Back Print Studio</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Upload both sides of Aadhaar, PAN, Voter ID or Driving License. We layout both sides on a single A4 sheet with true 1:1 physical dimensions and cutting guidelines.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
            {/* Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Card Type / Dimensions
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePresetChange(p.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      preset === p.id
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div>{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {p.widthMm} × {p.heightMm} mm
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Front & Back Upload Boxes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Card Photos</span>
                <button
                  type="button"
                  onClick={handleSwapSides}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Swap Front / Back</span>
                </button>
              </div>

              {/* Front Side */}
              <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">1. Front Side</span>
                  <div className="flex items-center gap-1">
                    {frontImage && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingSide("front")}
                          className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Crop className="w-3 h-3 text-emerald-600" />
                          <span>Crop</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFrontRotation((r) => (r + 90) % 360)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Rotate Front"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {frontImage ? (
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-xs font-semibold text-emerald-700 truncate max-w-[200px]">✓ Front Side Loaded</span>
                    <button
                      type="button"
                      onClick={() => setFrontImage(null)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-lg cursor-pointer bg-white transition">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-700">Upload Front Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "front")}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Back Side */}
              <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">2. Back Side</span>
                  <div className="flex items-center gap-1">
                    {backImage && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingSide("back")}
                          className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Crop className="w-3 h-3 text-emerald-600" />
                          <span>Crop</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBackRotation((r) => (r + 90) % 360)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-600"
                          title="Rotate Back"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {backImage ? (
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-xs font-semibold text-emerald-700 truncate max-w-[200px]">✓ Back Side Loaded</span>
                    <button
                      type="button"
                      onClick={() => setBackImage(null)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-lg cursor-pointer bg-white transition">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-700">Upload Back Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "back")}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Layout & Print Options */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Sheet Layout Style</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLayoutStyle("STACKED")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    layoutStyle === "STACKED"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Stacked (Top & Bottom)
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutStyle("SIDE_BY_SIDE")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    layoutStyle === "SIDE_BY_SIDE"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Side by Side
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setColorMode("COLOR")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    colorMode === "COLOR"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Original Color
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode("BW_ENHANCED")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                    colorMode === "BW_ENHANCED"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  B&W High Contrast
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={showCutGuides}
                  onChange={(e) => setShowCutGuides(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-slate-500" />
                  <span>Include Cutting Guidelines</span>
                </span>
              </label>
            </div>

            {/* Download & Print Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleDownloadImage}
                disabled={!frontImage && !backImage}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Print-Ready Image (A4)</span>
              </button>
              <Link
                href="/print"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition text-center"
              >
                <Printer className="w-4 h-4" />
                <span>Upload & Print at Shakeel Online Services</span>
              </Link>
            </div>
          </div>

          {/* Canvas Preview Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-lg overflow-hidden p-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center py-1">
                A4 Page Live Sheet Preview
              </div>
              <div className="aspect-[210/297] bg-white rounded-xl overflow-hidden flex items-center justify-center border border-slate-100">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain shadow-xs"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 text-center max-w-sm">
              Exact A4 layout rendered at proportional scale with 1:1 physical card size ({cardWidthMm}mm × {cardHeightMm}mm).
            </p>
          </div>
        </div>
      </main>

      {/* Crop Modal for Front or Back */}
      {editingSide && (
        <EnhancedImageEditor
          imageUrl={editingSide === "front" ? (frontImage || "") : (backImage || "")}
          fileId={`id_card_${editingSide}`}
          originalFilename={`ID_Card_${editingSide.toUpperCase()}.jpg`}
          initialMode="ID_CARD"
          targetPaperSize="ID_CARD"
          onSaveDerivative={handleSaveCroppedSide}
          onClose={() => setEditingSide(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        Shakeel Online Services • Guntur, Andhra Pradesh • SOS Print
      </footer>
    </div>
  );
}
