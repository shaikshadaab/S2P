"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Download,
  QrCode,
  Share2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Globe,
  ExternalLink,
  Phone,
  Sparkles,
  Info
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, UpiPaymentUtils } from "@s2p/shared";
import { SosLogo } from "@/components/common/SosLogo";

export default function StandeePage() {
  const [size, setSize] = useState<"A4" | "A5">("A4");
  const [language, setLanguage] = useState<"BILINGUAL" | "EN" | "HI">("BILINGUAL");
  const [useProductionUrl, setUseProductionUrl] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrSvg, setQrSvg] = useState<string>("");

  const preferredProductionUrl = "https://sos-print.vercel.app/print";
  const [currentOrigin, setCurrentOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(`${window.location.origin}/print`);
    }
  }, []);

  const destinationUrl = useProductionUrl
    ? preferredProductionUrl
    : (currentOrigin || preferredProductionUrl);

  const isLocalhost = destinationUrl.includes("localhost") || destinationUrl.includes("127.0.0.1");

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      UpiPaymentUtils.generateUpiQrDataUrl(destinationUrl),
      UpiPaymentUtils.generateUpiQrSvg(destinationUrl)
    ])
      .then(([dataUrl, svg]) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
          setQrSvg(svg);
        }
      })
      .catch((err) => {
        console.error("Failed to generate QR code:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [destinationUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(destinationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SOS-Print-QR-${PRIMARY_PILOT_SHOP.id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const whatsappShareText = encodeURIComponent(
    `Print your documents easily at Shakeel Online Services, Guntur!\n\nUpload PDF or photos directly here (no app required):\n${destinationUrl}\n\nPick up your prints at our counter!`
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Dashboard Top Controls (Hidden during physical print) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
              <QrCode className="w-3.5 h-3.5" />
              <span>Counter Marketing &amp; Self-Service Assets</span>
            </div>
            <h1 className="text-xl font-black text-[#0F172A] mt-0.5">
              QR &amp; Counter Poster
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Print-ready high contrast QR poster and counter standee for {PRIMARY_PILOT_SHOP.name}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download PNG */}
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`SOS-Print-QR-${PRIMARY_PILOT_SHOP.id}.png`}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>QR PNG</span>
              </a>
            )}

            {/* Download SVG */}
            {qrSvg && (
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>QR SVG</span>
              </button>
            )}

            {/* WhatsApp Share Link */}
            <a
              href={`https://wa.me/?text=${whatsappShareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Link</span>
            </a>

            {/* Print Trigger */}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print {size}</span>
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Format Selection */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0F172A]">Poster Format:</span>
              <div className="flex rounded-lg border border-[#CBD5E1] p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setSize("A4")}
                  className={`px-3 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                    size === "A4" ? "bg-white text-emerald-700 shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  A4 Wall Poster
                </button>
                <button
                  type="button"
                  onClick={() => setSize("A5")}
                  className={`px-3 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                    size === "A5" ? "bg-white text-emerald-700 shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  A5 Counter Standee
                </button>
              </div>
            </div>

            {/* Language Selection */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0F172A]">Language:</span>
              <div className="flex rounded-lg border border-[#CBD5E1] p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setLanguage("BILINGUAL")}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                    language === "BILINGUAL" ? "bg-white text-emerald-700 shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  Bilingual (En + Hi)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("EN")}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                    language === "EN" ? "bg-white text-emerald-700 shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("HI")}
                  className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                    language === "HI" ? "bg-white text-emerald-700 shadow-xs" : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                >
                  हिंदी
                </button>
              </div>
            </div>
          </div>

          {/* Destination URL Display */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-slate-50 font-mono text-[11px] text-[#0F172A]">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate max-w-[220px]">{destinationUrl}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 rounded-xl border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] transition cursor-pointer"
              title="Copy Link"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Localhost Warning if applicable */}
        {isLocalhost && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Localhost Preview Notice:</strong> Currently showing local development URL. For your physical shop standee, use the production URL so customer phones can scan from anywhere.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setUseProductionUrl(!useProductionUrl)}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 cursor-pointer"
            >
              {useProductionUrl ? "Switch to Local URL" : "Switch to Production URL"}
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* PRINTABLE POSTER / STANDEE PREVIEW CONTAINER                 */}
      {/* Styled to exact A4 / A5 aspect ratio and clean printable CSS */}
      {/* ============================================================ */}
      <div
        className={`bg-white border-2 border-[#E2E8F0] shadow-xl mx-auto text-[#0F172A] flex flex-col justify-between transition-all duration-300 print:border-none print:shadow-none print:m-0 print:p-0 ${
          size === "A4" ? "max-w-[595px] min-h-[842px] p-8" : "max-w-[420px] min-h-[595px] p-6"
        }`}
      >
        {/* Header Section */}
        <div className="text-center space-y-2 border-b-2 border-emerald-600 pb-5">
          <div className="flex justify-center">
            <SosLogo variant="horizontal" size={size === "A4" ? "lg" : "md"} showSubtitle={false} />
          </div>

          <div>
            <div className="text-xs font-bold text-emerald-700 tracking-widest uppercase">
              SHAKEEL ONLINE SERVICES &bull; GUNTUR
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#0F172A] mt-0.5">
              Self-Service Document Printing Portal
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold tracking-wider">
            <span>SCAN &bull; UPLOAD &bull; PAY &bull; COLLECT</span>
          </div>
        </div>

        {/* Central High-Contrast QR Code Area */}
        <div className="my-6 flex flex-col items-center justify-center space-y-3">
          <div className="p-4 rounded-3xl bg-white border-4 border-[#0F172A] shadow-md">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan to Print QR Code"
                className={`rounded-xl ${size === "A4" ? "w-56 h-56" : "w-44 h-44"}`}
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          <div className="text-center space-y-0.5">
            <div className="font-mono font-black text-sm text-[#0F172A] tracking-wider">
              {destinationUrl.replace(/^https?:\/\//, "")}
            </div>
            <div className="text-[11px] font-bold text-emerald-700">
              {language === "HI"
                ? "कैमरा खोलकर QR स्कैन करें &bull; कोई ऐप ज़रूरी नहीं"
                : "Point phone camera at QR &bull; No app required"}
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="font-black text-[#0F172A] uppercase tracking-wider text-[11px] border-b border-[#E2E8F0] pb-1.5 flex items-center justify-between">
            <span>{language === "HI" ? "प्रिंट करने के 5 आसान चरण" : "How to Print in 5 Easy Steps"}</span>
            <span className="text-emerald-700">Shakeel Online Services</span>
          </div>

          <div className="space-y-2 text-[#334155]">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <strong>{language === "HI" ? "QR कोड स्कैन करें:" : "Scan QR Code:"}</strong>{" "}
                {language === "HI" ? "अपने फ़ोन कैमरे से ऊपर दिया गया कोड स्कैन करें।" : "Open your phone camera to scan the QR code above."}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <strong>{language === "HI" ? "फ़ाइल अपलोड करें:" : "Upload Documents:"}</strong>{" "}
                {language === "HI" ? "अपनी PDF या JPG/PNG तस्वीरें अपलोड करें।" : "Upload your PDF files or photos directly."}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <strong>{language === "HI" ? "सेटिंग्स चुनें:" : "Select Print Settings:"}</strong>{" "}
                {language === "HI" ? "ब्लैक & व्हाइट या कलर, सिंगल या डुप्लेक्स साइड्स और कॉपीज़ चुनें।" : "Choose B&W or Colour, single or double sides, and number of copies."}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div>
                <strong>{language === "HI" ? "पेमेंट करें:" : "Complete Payment:"}</strong>{" "}
                {language === "HI" ? "ऑनलाइन UPI से भुगतान करें या काउंटर पर नकद दें।" : "Pay online securely or confirm cash payment at the shop counter."}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">5</span>
              <div>
                <strong>{language === "HI" ? "प्रिंट प्राप्त करें:" : "Collect Your Prints:"}</strong>{" "}
                {language === "HI" ? "ऑर्डर नंबर काउंटर पर बताकर अपना प्रिंट कलेक्ट करें।" : "Show your order number at the counter and collect your prints."}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Tools Footer */}
        <div className="pt-4 border-t border-[#E2E8F0] text-center space-y-1.5">
          <div className="text-[11px] font-bold text-[#64748B]">
            Also Available at Counter: Passport Photos (₹100/set) &bull; Resume Maker &bull; Photo Grids &bull; ID Copy &bull; Lamination
          </div>
          <div className="text-xs font-mono font-bold text-[#0F172A] flex items-center justify-center gap-2">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Help Desk: WhatsApp +91 95815 29381</span>
          </div>
        </div>
      </div>
    </div>
  );
}
