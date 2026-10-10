"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
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
  FileText
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, UpiPaymentUtils } from "@s2p/shared";
import { SosLogo } from "@/components/common/SosLogo";

export default function StandeePage() {
  const [size, setSize] = useState<"A4" | "A5">("A4");
  const [copied, setCopied] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrSvg, setQrSvg] = useState<string>("");

  const destinationUrl = "https://sos-print.vercel.app/print";

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
    link.download = `SOS-Print-Upload-QR-${PRIMARY_PILOT_SHOP.id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const whatsappShareText = encodeURIComponent(
    `Print your documents easily at Shakeel Online Services, Guntur!\n\nUpload PDF or photos directly here (no app or login required):\n${destinationUrl}\n\nPick up your fresh prints at our counter!`
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Dashboard Top Controls (Hidden during physical print) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
              <QrCode className="w-3.5 h-3.5" />
              <span>Shop Marketing & Self-Service Print Posters</span>
            </div>
            <h1 className="text-xl font-black text-[#0F172A] mt-0.5">
              Shop QR & Printable Poster
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Download high-resolution print-ready A4/A5 PDF posters and QR assets for {PRIMARY_PILOT_SHOP.name}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download A4 PDF */}
            <a
              href="/api/poster?format=A4"
              download="SOS-Print-Poster-A4.pdf"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download A4 PDF</span>
            </a>

            {/* Download A5 PDF */}
            <a
              href="/api/poster?format=A5"
              download="SOS-Print-Poster-A5.pdf"
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download A5 PDF</span>
            </a>

            {/* Download PNG */}
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`SOS-Print-Upload-QR-${PRIMARY_PILOT_SHOP.id}.png`}
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
              <span className="font-bold text-[#0F172A]">Preview Scale:</span>
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
          </div>

          {/* Destination URL Display */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold text-[11px]">QR Encodes:</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-slate-50 font-mono text-[11px] text-[#0F172A]">
              <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
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
      </div>

      {/* ============================================================ */}
      {/* PRINTABLE POSTER / STANDEE PREVIEW CONTAINER                 */}
      {/* Clean high contrast A4 / A5 layout                          */}
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
              SHAKEEL ONLINE SERVICES • GUNTUR
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#0F172A] mt-0.5">
              Scan to Upload & Print
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold tracking-wider">
            <span>SCAN • UPLOAD • PAY • COLLECT</span>
          </div>
        </div>

        {/* Central High-Contrast Upload QR Code Area */}
        <div className="my-6 flex flex-col items-center justify-center space-y-3">
          <div className="p-4 rounded-3xl bg-white border-4 border-[#0F172A] shadow-md">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan to Upload QR Code"
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
              Point phone camera at QR • No app download required
            </div>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="bg-slate-50 border border-[#E2E8F0] rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="font-black text-[#0F172A] uppercase tracking-wider text-[11px] border-b border-[#E2E8F0] pb-1.5 flex items-center justify-between">
            <span>How to Print in 5 Easy Steps:</span>
            <span className="text-emerald-700 font-bold">Shakeel Online Services</span>
          </div>

          <div className="space-y-2 text-[#334155]">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <strong>Scan the QR:</strong> Open your smartphone camera or browser to scan the code.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <strong>Upload your documents:</strong> Select PDF files or photos from your gallery.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <strong>Choose settings:</strong> Set B&W or Colour, 1-sided or 2-sided duplex, and number of copies.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div>
                <strong>Pay at the counter or by UPI:</strong> Choose Cash at Counter or direct transfer to 9581529381@ybl.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">5</span>
              <div>
                <strong>Collect your print:</strong> Pick up your printed documents once staff confirms payment.
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Tools Footer */}
        <div className="pt-4 border-t border-[#E2E8F0] text-center space-y-1.5">
          <div className="text-[11px] font-bold text-[#475569]">
            Also available: Passport Photos • Resume Maker • Photo Sheets • Scan & ID Copy
          </div>
          <div className="text-xs font-mono font-bold text-[#0F172A] flex items-center justify-center gap-2">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Customer WhatsApp: +91 9581529381</span>
          </div>
        </div>
      </div>
    </div>
  );
}
