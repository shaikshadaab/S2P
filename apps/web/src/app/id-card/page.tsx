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
  Maximize2
} from "lucide-react";

interface CardPreset {
  id: string;
  name: string;
  nameHi: string;
  widthMm: number;
  heightMm: number;
}

const PRESETS: CardPreset[] = [
  { id: "aadhaar", name: "Aadhaar Card", nameHi: " ", widthMm: 85.6, heightMm: 54 },
  { id: "pan", name: "PAN Card", nameHi: " ", widthMm: 85.6, heightMm: 54 },
  { id: "voter", name: "Voter ID", nameHi: " ", widthMm: 85.6, heightMm: 54 },
  { id: "dl", name: "Driving License", nameHi: " ", widthMm: 85.6, heightMm: 54 },
  { id: "custom", name: "Custom Size", nameHi: " ", widthMm: 85.6, heightMm: 54 }
];

export default function IdCardStudioPage() {
  const [lang, setLang] = useState<"en" | "hi">("en");
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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);

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
    ctx.fillText("Shakeel Online Services · Single Sheet ID Layout", a4W / 2, 40);

    const mmToPx = a4W / 210;
    const cW = cardWidthMm * mmToPx;
    const cH = cardHeightMm * mmToPx;

    const renderCard = (
      imgSrc: string | null,
      rotation: number,
      centerX: number,
      centerY: number,
      label: string
    ) => {
      ctx.save();
      ctx.translate(centerX, centerY);

      if (showCutGuides) {
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(-cW / 2 - 2, -cH / 2 - 2, cW + 4, cH + 4);
        ctx.setLineDash([]);
      }

      if (imgSrc) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imgSrc;
        if (img.complete) {
          ctx.save();
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(img, -cW / 2, -cH / 2, cW, cH);

          if (colorMode === "BW_ENHANCED") {
            const imgData = ctx.getImageData(centerX - cW / 2, centerY - cH / 2, cW, cH);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              const enhanced = gray > 140 ? 255 : gray * 0.8;
              d[i] = enhanced;
              d[i + 1] = enhanced;
              d[i + 2] = enhanced;
            }
            ctx.putImageData(imgData, centerX - cW / 2, centerY - cH / 2);
          }
          ctx.restore();
        } else {
          img.onload = () => setIsRendering((prev) => !prev);
        }
      } else {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(-cW / 2, -cH / 2, cW, cH);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2;
        ctx.strokeRect(-cW / 2, -cH / 2, cW, cH);

        ctx.fillStyle = "#64748b";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, 0, 0);
        ctx.font = "12px sans-serif";
        ctx.fillText("Click upload to insert", 0, 24);
      }

      ctx.restore();
    };

    if (layoutStyle === "STACKED") {
      const topY = a4H * 0.24;
      const bottomY = a4H * 0.50;
      renderCard(frontImage, frontRotation, a4W / 2, topY, "FRONT SIDE");
      renderCard(backImage, backRotation, a4W / 2, bottomY, "BACK SIDE");
    } else {
      const midY = a4H * 0.28;
      const leftX = a4W * 0.28;
      const rightX = a4W * 0.72;
      renderCard(frontImage, frontRotation, leftX, midY, "FRONT SIDE");
      renderCard(backImage, backRotation, rightX, midY, "BACK SIDE");
    }
  }, [
    cardWidthMm,
    cardHeightMm,
    layoutStyle,
    showCutGuides,
    colorMode,
    frontImage,
    backImage,
    frontRotation,
    backRotation,
    isRendering
  ]);

  const handleDownloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `ID-Card-${preset}-${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span>Shakeel Online Services</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              {lang === "en" ? "  " : "View in English"}
            </button>
            <Link
              href="/s/shakeel-online-services"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{lang === "en" ? "Print at Shop" : "   "}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === "en" ? "Front & Back Single Sheet Layout" : "        "}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {lang === "en" ? "ID Card Front & Back Studio" : "  "}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === "en"
              ? "Combine Aadhaar, PAN, Voter ID or License front and back onto an A4 page without clipping or margins loss."
              : ",              A4    "}
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Presets */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {lang === "en" ? "Card Type Preset" : "  "}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePresetChange(p.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-left transition ${
                      preset === p.id
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div>{lang === "en" ? p.name : p.nameHi}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {p.widthMm} × {p.heightMm} mm
                    </div>
                  </button>
                ))}
              </div>

              {preset === "custom" && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Width (mm)</label>
                    <input
                      type="number"
                      value={cardWidthMm}
                      onChange={(e) => setCardWidthMm(parseFloat(e.target.value) || 50)}
                      className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Height (mm)</label>
                    <input
                      type="number"
                      value={cardHeightMm}
                      onChange={(e) => setCardHeightMm(parseFloat(e.target.value) || 50)}
                      className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Upload Sides */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {lang === "en" ? "Upload Card Images" : "  "}
                </h2>
                {(frontImage || backImage) && (
                  <button
                    onClick={handleSwapSides}
                    className="text-xs font-semibold text-emerald-700 flex items-center gap-1 hover:underline"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Swap Sides</span>
                  </button>
                )}
              </div>

              {/* Front Side Upload */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">1. Front Side</span>
                  {frontImage && (
                    <button
                      onClick={() => setFrontRotation((r) => (r + 90) % 360)}
                      className="p-1 text-slate-600 hover:text-emerald-700 transition"
                      title="Rotate 90 degrees"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "front")}
                  className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                />
              </div>

              {/* Back Side Upload */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">2. Back Side</span>
                  {backImage && (
                    <button
                      onClick={() => setBackRotation((r) => (r + 90) % 360)}
                      className="p-1 text-slate-600 hover:text-emerald-700 transition"
                      title="Rotate 90 degrees"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "back")}
                  className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Layout & Enhancement Controls */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {lang === "en" ? "Layout & Enhancement" : "   "}
              </h2>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLayoutStyle("STACKED")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    layoutStyle === "STACKED"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Stacked (-)
                </button>
                <button
                  onClick={() => setLayoutStyle("SIDE_BY_SIDE")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    layoutStyle === "SIDE_BY_SIDE"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Side by Side (-)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setColorMode("COLOR")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    colorMode === "COLOR"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Original Color
                </button>
                <button
                  onClick={() => setColorMode("BW_ENHANCED")}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    colorMode === "BW_ENHANCED"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  B&amp;W High Contrast
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
                onClick={handleDownloadImage}
                disabled={!frontImage && !backImage}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Print-Ready Image (A4)</span>
              </button>
              <Link
                href="/s/shakeel-online-services"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition text-center"
              >
                <Printer className="w-4 h-4" />
                <span>Upload &amp; Print at Shakeel Online Services</span>
              </Link>
            </div>
          </div>

          {/* Canvas Preview Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden p-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center py-1">
                A4 Page Live Sheet Preview
              </div>
              <div className="aspect-[210/297] bg-white rounded-xl overflow-hidden flex items-center justify-center border border-slate-100">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-contain shadow-sm"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 text-center max-w-sm">
              Exact A4 layout rendered at proportional scale with 1:1 physical card size ({cardWidthMm}mm × {cardHeightMm}mm).
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        Shakeel Online Services · Guntur, Andhra Pradesh · SOS Print
      </footer>
    </div>
  );
}
