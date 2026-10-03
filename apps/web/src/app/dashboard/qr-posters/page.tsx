"use client";

import React, { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  QrCode,
  Download,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Palette,
  Loader2,
} from "lucide-react";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export type PosterFormat = "portrait" | "landscape" | "card" | "sticker";
export type PosterTheme = "purple" | "white" | "pink";

export default function DashboardQrPostersPage() {
  const [shopName, setShopName] = useState("Om Sai Xerox & Digital Print");
  const [address, setAddress] = useState("Shop No. 4, Anand Complex, Near Metro Station, Sector 15");
  const [mobile, setMobile] = useState("9876543210");
  const [headline, setHeadline] = useState("SCAN • UPLOAD • PRINT");
  const [subtitle, setSubtitle] = useState("Mobile Se Direct Xerox & Photo Print • 100% Free Service");
  const [slug, setSlug] = useState("om-sai-print");
  const [posterFormat, setPosterFormat] = useState<PosterFormat>("portrait");
  const [theme, setTheme] = useState<PosterTheme>("purple");

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const posterRef = useRef<HTMLDivElement>(null);

  // Compute full customer scan URL
  const [origin, setOrigin] = useState("https://vintha-print.netlify.app");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const scanUrl = `${origin}/shop/${slug}`;

  // Generate crisp, high-resolution QR code whenever scanUrl changes
  useEffect(() => {
    QRCode.toDataURL(scanUrl, {
      width: 1000,
      margin: 1,
      errorCorrectionLevel: "H",
      color: {
        dark: theme === "white" ? "#121018" : "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error("Failed to generate QR code:", err);
      });
  }, [scanUrl, theme]);

  const formats = [
    {
      id: "portrait" as PosterFormat,
      label: "A4 Portrait Poster",
      size: "210 × 297 mm",
      desc: "For entrance wall or glass door",
    },
    {
      id: "landscape" as PosterFormat,
      label: "A4 Landscape Poster",
      size: "297 × 210 mm",
      desc: "For counter desktop divider or wide glass",
    },
    {
      id: "card" as PosterFormat,
      label: "Table Counter Card",
      size: "5 × 7 inches (127 × 178 mm)",
      desc: "Acrylic standee right at customer billing desk",
    },
    {
      id: "sticker" as PosterFormat,
      label: "Small 3x3 Sticker",
      size: "3 × 3 inches (76 × 76 mm)",
      desc: "Square sticker for Xerox machine / counter corner",
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(scanUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // High-Resolution PDF Download using jsPDF + html2canvas
  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setToastMessage(null);

    try {
      const posterEl = document.getElementById("vintha-printable-poster");
      if (!posterEl) {
        throw new Error("Printable poster element not found in DOM");
      }

      // Capture at ~300 DPI equivalent (scale: 3 for crystal-sharp text & QR)
      const canvas = await html2canvas(posterEl, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      } as any);
      /*
        scale: 3,
        useCORS: true,
        logging: false,
        */

      const imgData = canvas.toDataURL("image/png", 1.0);

      let pdf: jsPDF;
      let widthMm = 210;
      let heightMm = 297;

      if (posterFormat === "portrait") {
        pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        widthMm = 210;
        heightMm = 297;
      } else if (posterFormat === "landscape") {
        pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
        widthMm = 297;
        heightMm = 210;
      } else if (posterFormat === "card") {
        pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [127, 178] });
        widthMm = 127;
        heightMm = 178;
      } else {
        // 3x3 sticker (76.2 x 76.2 mm)
        pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [76.2, 76.2] });
        widthMm = 76.2;
        heightMm = 76.2;
      }

      pdf.addImage(imgData, "PNG", 0, 0, widthMm, heightMm, undefined, "FAST");
      const fileName = `vintha-qr-poster-${posterFormat}.pdf`;
      pdf.save(fileName);

      setToastMessage({
        type: "success",
        text: `Successfully generated ${fileName}! Ready for high-resolution printing.`,
      });
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      setToastMessage({
        type: "error",
        text: "Failed to generate PDF. Please try again or use the Direct Print button.",
      });
      setTimeout(() => setToastMessage(null), 6000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct Print via Browser Print Dialog (Poster Only)
  const handleDirectPrint = () => {
    let pageRule = "size: A4 portrait; margin: 0;";
    if (posterFormat === "landscape") {
      pageRule = "size: A4 landscape; margin: 0;";
    } else if (posterFormat === "card") {
      pageRule = "size: 127mm 178mm; margin: 0;";
    } else if (posterFormat === "sticker") {
      pageRule = "size: 76.2mm 76.2mm; margin: 0;";
    }

    let styleEl = document.getElementById("vintha-dynamic-print-style") as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "vintha-dynamic-print-style";
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `@page { ${pageRule} }`;

    document.body.classList.add("printing-poster");

    const cleanup = () => {
      document.body.classList.remove("printing-poster");
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);

    // Small timeout ensures styles apply before print dialog renders
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 2000);
    }, 150);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#121018]">
              Shop QR & Poster Studio
            </h1>
            <p className="text-xs sm:text-sm text-black/60 mt-0.5">
              Generate 300 DPI high-resolution printable posters, counter acrylic cards, and stickers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDirectPrint}
              className="px-4 py-2.5 rounded-xl bg-white border border-black/10 text-xs font-bold hover:bg-black/5 text-[#121018] flex items-center gap-2 shadow-xs transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-[#FF2D78]" />
              <span>Direct Print Poster</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-5 py-2.5 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-pink-500/20 active:scale-95 transition-all"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating PDF…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Toast / Notification Banner */}
        {toastMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-sm transition-all ${
              toastMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-black/50 hover:text-black text-xs font-bold px-2 py-0.5"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Format Selection Card */}
            <div className="bg-white rounded-3xl p-6 border border-black/10 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-black/70 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#FF2D78]" />
                  <span>1. Select Poster Format</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {formats.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setPosterFormat(f.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      posterFormat === f.id
                        ? "border-2 border-[#FF2D78] bg-pink-50/40 shadow-xs font-bold"
                        : "border-black/10 hover:border-black/25 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#121018]">{f.label}</span>
                      {posterFormat === f.id && (
                        <span className="w-2 h-2 rounded-full bg-[#FF2D78]" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[#FF2D78] font-bold block mt-0.5">
                      {f.size}
                    </span>
                    <span className="text-[11px] text-black/50 block mt-1 leading-tight">
                      {f.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Poster Theme Card */}
            <div className="bg-white rounded-3xl p-6 border border-black/10 shadow-xs space-y-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-black/70 flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#FF2D78]" />
                <span>2. Visual Theme & Style</span>
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  onClick={() => setTheme("purple")}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    theme === "purple"
                      ? "border-2 border-[#FF2D78] bg-purple-50 shadow-xs font-bold"
                      : "border-black/10 hover:border-black/20"
                  }`}
                >
                  <div className="w-full h-6 rounded-lg bg-[#1E1035] mb-1.5 mx-auto border border-black/10" />
                  <span className="text-[11px] font-extrabold text-[#121018]">Midnight</span>
                </button>

                <button
                  onClick={() => setTheme("white")}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    theme === "white"
                      ? "border-2 border-[#FF2D78] bg-pink-50/40 shadow-xs font-bold"
                      : "border-black/10 hover:border-black/20"
                  }`}
                >
                  <div className="w-full h-6 rounded-lg bg-white mb-1.5 mx-auto border border-black/20" />
                  <span className="text-[11px] font-extrabold text-[#121018]">Clean White</span>
                </button>

                <button
                  onClick={() => setTheme("pink")}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    theme === "pink"
                      ? "border-2 border-[#FF2D78] bg-pink-50 shadow-xs font-bold"
                      : "border-black/10 hover:border-black/20"
                  }`}
                >
                  <div className="w-full h-6 rounded-lg bg-[#FF2D78] mb-1.5 mx-auto" />
                  <span className="text-[11px] font-extrabold text-[#121018]">Vibrant Pink</span>
                </button>
              </div>
            </div>

            {/* Custom Content Inputs */}
            <div className="bg-white rounded-3xl p-6 border border-black/10 shadow-xs space-y-4">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-black/70">
                3. Customize Shop & Poster Text
              </h3>

              <div>
                <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                  Shop Name (दुकान का नाम)
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs font-bold text-[#121018] focus:border-[#FF2D78] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                  Counter Address & Location
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs font-medium text-[#121018] focus:border-[#FF2D78] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                    Help / WhatsApp No.
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs font-medium text-[#121018] focus:border-[#FF2D78] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                    Shop URL Slug
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs font-mono font-bold text-[#121018] focus:border-[#FF2D78] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                  Poster Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs font-bold text-[#121018] focus:border-[#FF2D78] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                  Subtitle Copy
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-xs font-medium text-[#121018] focus:border-[#FF2D78] outline-none"
                />
              </div>

              {/* Target Scan URL card */}
              <div className="p-3.5 bg-[#FDFDFD] rounded-2xl border border-black/10 space-y-2">
                <span className="text-[10px] font-bold text-black/50 uppercase tracking-wider block">
                  Encoded Target QR Scan URL
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-[#FF2D78] truncate">
                    {scanUrl}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={handleCopyLink}
                      className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-black/70 text-xs"
                      title="Copy URL"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={scanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-black/70 text-xs"
                      title="Test Scan URL"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Poster Live Canvas & Preview Area (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Live Indicator */}
            <div className="mb-3 w-full flex items-center justify-between px-2 text-xs text-black/60 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live 300-DPI Print Preview ({formats.find((f) => f.id === posterFormat)?.label})</span>
              </span>
              <span className="font-mono text-[11px] text-[#FF2D78] font-bold">
                {formats.find((f) => f.id === posterFormat)?.size}
              </span>
            </div>

            {/* PREVIEW WRAPPER */}
            <div className="w-full flex justify-center bg-black/5 p-4 sm:p-8 rounded-3xl border border-black/10 overflow-auto">
              {/* THE PRINTABLE CONTAINER THAT IS CAPTURED BY HTML2CANVAS & PRINTED */}
              <div
                id="vintha-printable-poster"
                ref={posterRef}
                className={`transition-all shadow-2xl relative flex flex-col justify-between overflow-hidden ${
                  theme === "purple"
                    ? "bg-gradient-to-b from-[#1E1035] via-[#2A1448] to-[#121018] text-white border border-white/10"
                    : theme === "pink"
                    ? "bg-gradient-to-b from-[#FF2D78] via-[#E0246A] to-[#C2185B] text-white border border-white/20"
                    : "bg-white text-[#121018] border-2 border-black/10 shadow-lg"
                } ${
                  posterFormat === "portrait"
                    ? "w-full max-w-[500px] aspect-[210/297] p-8 sm:p-10 rounded-3xl"
                    : posterFormat === "landscape"
                    ? "w-full max-w-[650px] aspect-[297/210] p-8 sm:p-10 rounded-3xl"
                    : posterFormat === "card"
                    ? "w-full max-w-[380px] aspect-[127/178] p-6 sm:p-8 rounded-3xl text-center"
                    : "w-full max-w-[340px] aspect-square p-6 sm:p-7 rounded-3xl text-center"
                }`}
              >
                {/* FORMAT 1: A4 PORTRAIT POSTER */}
                {posterFormat === "portrait" && (
                  <>
                    {/* Header Badge */}
                    <div className="flex items-center justify-between border-b pb-4 border-current/15">
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-md ${
                          theme === "white" ? "bg-[#1E1035] text-[#FF2D78]" : "bg-white text-[#1E1035]"
                        }`}>
                          VP
                        </div>
                        <div>
                          <div className="text-base font-black tracking-tight font-heading leading-none">
                            VINTHA <span className={theme === "pink" ? "text-white underline" : "text-[#FF2D78]"}>PRINT</span>
                          </div>
                          <div className="text-[10px] uppercase font-bold tracking-wider opacity-75 mt-0.5">
                            100% Free Automatic Printing
                          </div>
                        </div>
                      </div>

                      <div className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                        theme === "white" ? "bg-black/5 text-[#121018]" : "bg-white/15 text-white"
                      }`}>
                        <Sparkles className="w-3 h-3 text-[#FF2D78]" />
                        <span>QR SE DIRECT PRINT</span>
                      </div>
                    </div>

                    {/* Headline & Subtitle */}
                    <div className="text-center space-y-1.5 my-3">
                      <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight uppercase leading-tight">
                        {headline}
                      </h2>
                      <p className="text-xs sm:text-sm opacity-85 font-medium max-w-sm mx-auto">
                        {subtitle}
                      </p>
                    </div>

                    {/* High-Resolution QR Card */}
                    <div className="flex justify-center my-2">
                      <div className="p-4 sm:p-5 bg-white rounded-3xl shadow-2xl inline-flex flex-col items-center border border-black/10">
                        <div className="w-48 h-48 sm:w-56 sm:h-56 bg-white flex items-center justify-center rounded-2xl overflow-hidden p-1">
                          {qrDataUrl ? (
                            <img
                              src={qrDataUrl}
                              alt="Scan to Print QR Code"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-black/40 text-xs font-mono">
                              Generating QR...
                            </div>
                          )}
                        </div>
                        <div className="mt-2 px-3 py-1 rounded-full bg-[#121018] text-white text-[10px] font-mono font-bold tracking-tight">
                          /shop/{slug}
                        </div>
                      </div>
                    </div>

                    {/* 3 Step Instruction Pills */}
                    <div className="grid grid-cols-3 gap-2 my-2 text-center">
                      <div className={`p-2.5 rounded-2xl border ${
                        theme === "white" ? "bg-black/5 border-black/10 text-[#121018]" : "bg-white/10 border-white/10 text-white"
                      }`}>
                        <div className="text-[10px] font-mono font-bold text-[#FF2D78]">STEP 1</div>
                        <div className="text-xs font-extrabold mt-0.5">Scan QR</div>
                        <div className="text-[9px] opacity-70 mt-0.5 leading-tight">Phone Camera se</div>
                      </div>

                      <div className={`p-2.5 rounded-2xl border ${
                        theme === "white" ? "bg-black/5 border-black/10 text-[#121018]" : "bg-white/10 border-white/10 text-white"
                      }`}>
                        <div className="text-[10px] font-mono font-bold text-[#FF2D78]">STEP 2</div>
                        <div className="text-xs font-extrabold mt-0.5">Upload PDF</div>
                        <div className="text-[9px] opacity-70 mt-0.5 leading-tight">Doc ya Photo chunein</div>
                      </div>

                      <div className={`p-2.5 rounded-2xl border ${
                        theme === "white" ? "bg-black/5 border-black/10 text-[#121018]" : "bg-white/10 border-white/10 text-white"
                      }`}>
                        <div className="text-[10px] font-mono font-bold text-[#FF2D78]">STEP 3</div>
                        <div className="text-xs font-extrabold mt-0.5">Instant Print</div>
                        <div className="text-[9px] opacity-70 mt-0.5 leading-tight">Counter se collect karein</div>
                      </div>
                    </div>

                    {/* Shop Counter Details */}
                    <div className="text-center space-y-0.5 pt-2 border-t border-current/15">
                      <div className="text-[9px] uppercase tracking-widest font-extrabold opacity-60">
                        Counter Service Desk
                      </div>
                      <div className={`text-lg sm:text-xl font-black font-heading ${
                        theme === "white" ? "text-[#121018]" : theme === "pink" ? "text-white" : "text-[#FF2D78]"
                      }`}>
                        {shopName}
                      </div>
                      <div className="text-xs opacity-75 font-medium truncate max-w-sm mx-auto">
                        {address} • Mob: {mobile}
                      </div>
                    </div>

                    {/* Bottom Zero-Hassle Badge */}
                    <div className="pt-2 text-center text-[10px] font-bold opacity-75 flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#FF2D78]" />
                      <span>100% Free · No App Download Required · Zero Pen Drive Virus</span>
                    </div>
                  </>
                )}

                {/* FORMAT 2: A4 LANDSCAPE POSTER */}
                {posterFormat === "landscape" && (
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b pb-3 border-current/15">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-xs shadow ${
                          theme === "white" ? "bg-[#1E1035] text-[#FF2D78]" : "bg-white text-[#1E1035]"
                        }`}>
                          VP
                        </div>
                        <span className="text-lg font-black font-heading">
                          VINTHA <span className={theme === "pink" ? "text-white underline" : "text-[#FF2D78]"}>PRINT</span>
                        </span>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                        Shop Counter Self-Service Printing
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-6 items-center my-auto py-2">
                      {/* Left: Text & Steps (7 cols) */}
                      <div className="col-span-7 space-y-3">
                        <div>
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF2D78]/20 text-[#FF2D78] uppercase mb-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Touchless Print</span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight leading-tight">
                            {headline}
                          </h2>
                          <p className="text-xs opacity-85 mt-1">
                            {subtitle}
                          </p>
                        </div>

                        {/* Steps horizontal */}
                        <div className="space-y-1.5 text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#FF2D78] text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                            <span>Camera se QR code scan karein</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#FF2D78] text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                            <span>PDF / Photo select karke submit karein</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#FF2D78] text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                            <span>Counter printer se apna print lein</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-current/15">
                          <div className="text-base font-black text-[#FF2D78] font-heading">{shopName}</div>
                          <div className="text-[11px] opacity-75">{address}</div>
                        </div>
                      </div>

                      {/* Right: Big QR (5 cols) */}
                      <div className="col-span-5 flex flex-col items-center justify-center">
                        <div className="p-4 bg-white rounded-3xl shadow-xl border border-black/10 inline-block text-center">
                          <div className="w-40 h-40 sm:w-44 sm:h-44 bg-white flex items-center justify-center rounded-xl overflow-hidden">
                            {qrDataUrl && (
                              <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" />
                            )}
                          </div>
                          <div className="mt-2 text-[9px] font-mono font-bold text-black bg-black/5 px-2 py-0.5 rounded">
                            /shop/{slug}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold opacity-75 mt-2">
                          Scan with Any Phone Camera
                        </span>
                      </div>
                    </div>

                    <div className="text-center text-[10px] font-bold opacity-70 pt-2 border-t border-current/15">
                      100% Free · No App Download · Fast Auto Spooler
                    </div>
                  </div>
                )}

                {/* FORMAT 3: TABLE COUNTER CARD (Acrylic Standee 5x7) */}
                {posterFormat === "card" && (
                  <div className="h-full flex flex-col justify-between items-center text-center">
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#FF2D78]">
                        COUNTER PRINT DESK
                      </div>
                      <h3 className="text-lg font-black font-heading leading-tight">
                        {shopName}
                      </h3>
                      <p className="text-[10px] opacity-75 max-w-[240px] mx-auto">
                        Mobile Se Direct Print • 100% Free
                      </p>
                    </div>

                    <div className="my-auto py-3">
                      <div className="p-4 bg-white rounded-3xl shadow-xl border border-black/10 inline-block">
                        <div className="w-44 h-44 sm:w-48 sm:h-48 bg-white flex items-center justify-center rounded-2xl overflow-hidden p-1">
                          {qrDataUrl && (
                            <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" />
                          )}
                        </div>
                        <div className="mt-2 text-[9px] font-mono font-bold text-black bg-black/5 px-2 py-0.5 rounded">
                          /shop/{slug}
                        </div>
                      </div>
                      <div className="text-xs font-extrabold mt-2 tracking-wide uppercase">
                        Scan with Phone Camera
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-current/15 w-full">
                      <div className="text-[10px] font-bold opacity-85">
                        1. Scan ➔ 2. Upload ➔ 3. Collect Print
                      </div>
                      <div className="text-[9px] opacity-60">
                        {address} • {mobile}
                      </div>
                    </div>
                  </div>
                )}

                {/* FORMAT 4: SMALL 3X3 STICKER */}
                {posterFormat === "sticker" && (
                  <div className="h-full flex flex-col justify-between items-center text-center">
                    <div className="text-xs font-black font-heading tracking-wider uppercase text-[#FF2D78] flex items-center gap-1 justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>SCAN TO PRINT</span>
                    </div>

                    <div className="my-auto p-2.5 bg-white rounded-2xl shadow-lg border border-black/10">
                      <div className="w-36 h-36 bg-white flex items-center justify-center rounded-xl overflow-hidden">
                        {qrDataUrl && (
                          <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" />
                        )}
                      </div>
                    </div>

                    <div className="w-full pt-1.5 border-t border-current/15">
                      <div className="text-xs font-black font-heading truncate">{shopName}</div>
                      <div className="text-[9px] font-mono opacity-70">vintha-print/shop/{slug}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
