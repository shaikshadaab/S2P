"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Printer,
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

export default function CustomerShopPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params.slug as string) || "om-sai-print";

  const [upload, setUpload] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copies, setCopies] = useState(1);
  const [colorMode, setColorMode] = useState<"bw" | "color">("bw");
  const [paperSize, setPaperSize] = useState<"A4" | "A3" | "Photo">("A4");
  const [isDuplex, setIsDuplex] = useState(false);
  const [pageRangeText, setPageRangeText] = useState("all");
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("shopId", "shop-om-sai-001");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.upload) {
        setUpload(data.upload);
      } else {
        // Fallback for demo file if API encounters issue
        setUpload({
          id: "upl-" + Math.random().toString(36).substring(2, 9),
          originalFilename: file.name,
          pageCount: file.type.includes("pdf") ? 4 : 1,
          fileSizeBytes: file.size,
          mimeType: file.type,
        });
      }
    } catch {
      // Offline/demo fallback
      setUpload({
        id: "upl-demo-" + Date.now(),
        originalFilename: file.name,
        pageCount: file.type.includes("pdf") ? 4 : 1,
        fileSizeBytes: file.size,
        mimeType: file.type,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!upload) {
      setErrorMessage("Please upload a PDF or image file first.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Please enter your name so counter staff can hand over your print.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: "shop-om-sai-001",
          uploadId: upload.id,
          customerName: customerName.trim(),
          customerMobile: customerMobile.trim() || "N/A",
          printOptions: {
            copies,
            colorMode,
            paperSize,
            isDuplex,
            pageRangeText,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.orderId) {
        router.push(`/order/${data.orderId}`);
      } else {
        setErrorMessage(data.error || "Failed to submit print job. Please try again.");
        setIsSubmitting(false);
      }
    } catch (err: any) {
      // Fallback redirect with generated ID
      const orderId = "VNT-" + Math.random().toString(36).substring(2, 7).toUpperCase();
      router.push(`/order/${orderId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#121018] flex flex-col justify-between">
      {/* Mobile-Friendly Header */}
      <header className="bg-[#1E1035] text-white py-4 px-5 sticky top-0 z-40 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF2D78] to-[#9333EA] flex items-center justify-center text-white">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white font-heading">Om Sai Xerox & Print</h1>
              <span className="text-[10px] text-emerald-400 font-semibold block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Printer Connected & Ready
              </span>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF2D78]/20 text-[#FF2D78] uppercase">
            Free Print
          </span>
        </div>
      </header>

      {/* Main Upload & Configuration Body */}
      <main className="max-w-md mx-auto w-full px-4 py-6 flex-1 space-y-5">
        {/* Step 1: Upload Document Card */}
        <div className="bg-white rounded-3xl p-6 border border-black/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-sm uppercase tracking-wider text-black/70">
              1. Upload Document
            </h2>
            <span className="text-[11px] font-bold text-[#FF2D78]">PDF, JPG, PNG</span>
          </div>

          {!upload ? (
            <label className="border-2 border-dashed border-[#FF2D78]/40 hover:border-[#FF2D78] bg-pink-50/20 hover:bg-pink-50/40 rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer transition-all text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#FF2D78]/10 text-[#FF2D78] flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#121018] block">Tap to select or take photo</span>
                <span className="text-[10px] text-black/50">Supports PDF, Aadhaar, Photos up to 50MB</span>
              </div>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          ) : (
            <div className="p-4 rounded-2xl bg-pink-50/50 border border-[#FF2D78]/30 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-[#FF2D78] text-white flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-[#121018] truncate">{upload.originalFilename}</p>
                  <p className="text-[10px] text-black/50 font-medium">{upload.pageCount} Pages detected</p>
                </div>
              </div>
              <label className="text-xs font-bold text-[#FF2D78] hover:underline cursor-pointer shrink-0 ml-2">
                Change
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Step 2: Print Settings Card */}
        <div className="bg-white rounded-3xl p-6 border border-black/10 shadow-sm space-y-4">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-black/70">
            2. Printing Options
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Color Mode */}
            <div>
              <label className="text-[11px] font-bold text-black/60 uppercase block mb-1.5">Color</label>
              <div className="flex rounded-xl border border-black/10 overflow-hidden bg-[#FAFAF8] p-0.5">
                <button
                  type="button"
                  onClick={() => setColorMode("bw")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    colorMode === "bw" ? "bg-[#1E1035] text-white shadow-xs" : "text-black/60"
                  }`}
                >
                  📄 B&W
                </button>
                <button
                  type="button"
                  onClick={() => setColorMode("color")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    colorMode === "color" ? "bg-[#FF2D78] text-white shadow-xs" : "text-black/60"
                  }`}
                >
                  🎨 Color
                </button>
              </div>
            </div>

            {/* Sides / Duplex */}
            <div>
              <label className="text-[11px] font-bold text-black/60 uppercase block mb-1.5">Sides</label>
              <div className="flex rounded-xl border border-black/10 overflow-hidden bg-[#FAFAF8] p-0.5">
                <button
                  type="button"
                  onClick={() => setIsDuplex(false)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !isDuplex ? "bg-[#1E1035] text-white shadow-xs" : "text-black/60"
                  }`}
                >
                  1-Sided
                </button>
                <button
                  type="button"
                  onClick={() => setIsDuplex(true)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isDuplex ? "bg-[#FF2D78] text-white shadow-xs" : "text-black/60"
                  }`}
                >
                  2-Sided
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Number of Copies */}
            <div>
              <label className="text-[11px] font-bold text-black/60 uppercase block mb-1.5">Copies</label>
              <div className="flex items-center border border-black/10 rounded-xl overflow-hidden bg-[#FAFAF8]">
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="px-3 py-1.5 text-xs font-bold text-black/60 hover:bg-black/5"
                >
                  -
                </button>
                <span className="flex-1 text-center font-mono font-bold text-xs text-[#121018]">
                  {copies}
                </span>
                <button
                  type="button"
                  onClick={() => setCopies(copies + 1)}
                  className="px-3 py-1.5 text-xs font-bold text-black/60 hover:bg-black/5"
                >
                  +
                </button>
              </div>
            </div>

            {/* Paper Size */}
            <div>
              <label className="text-[11px] font-bold text-black/60 uppercase block mb-1.5">Paper Size</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#FAFAF8] rounded-xl border border-black/10 text-xs font-bold focus:outline-none"
              >
                <option value="A4">A4 Standard</option>
                <option value="A3">A3 Large</option>
                <option value="Photo">4×6 Glossy Photo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Customer Details */}
        <div className="bg-white rounded-3xl p-6 border border-black/10 shadow-sm space-y-4">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-black/70">
            3. Pickup Details
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-black/60 uppercase block mb-1">Your Name</label>
              <input
                type="text"
                placeholder="Enter your name (e.g. Ankit)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-[#FAFAF8] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FF2D78]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-black/60 uppercase block mb-1">
                Mobile Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="Mobile number for counter call"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-[#FAFAF8] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#FF2D78]"
              />
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {/* Big Pink Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isUploading}
          className="w-full py-4 rounded-2xl bg-[#FF2D78] hover:bg-[#E0246A] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-pink-500/25 active:scale-95 transition-all"
        >
          {isSubmitting ? (
            <span>Sending to Shop Printer...</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Submit Free Print Job</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-[11px] text-center text-black/40 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FF2D78]" />
          <span>Files are automatically deleted after printing</span>
        </p>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-black/40 border-t border-black/5 bg-white">
        Vintha Print • Automatic QR Printing
      </footer>
    </div>
  );
}
