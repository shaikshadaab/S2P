"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PRIMARY_PILOT_SHOP,
  PaperSize,
  PrintColorMode,
  PrintDuplexMode,
  PrintOrientation,
  PrintScaling,
  FinishingType,
  PaperType,
  parsePageRange,
  QuoteResponse,
  ShopPrintOptions,
  UpiConfiguration
} from "@s2p/shared";
import {
  Upload,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Hash,
  Trash2,
  QrCode,
  Banknote,
  Sparkles,
  User,
  Layers,
  Printer,
  Compass,
  Maximize2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  CreditCard,
  Phone,
  Images,
  UserCheck,
  FileBadge,
  ScanLine,
  Copy,
  ChevronRight,
  ExternalLink,
  Info
} from "lucide-react";
import { SosLogo } from "@/components/common/SosLogo";
import EnhancedImageEditor from "@/components/common/EnhancedImageEditor";
import { ImageDetectionEngine } from "@s2p/shared";

interface UploadedFileRecord {
  id: string;
  safeDisplayName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  pageCount: number;
  processingStatus: string;
  sortOrder?: number;
  localPreviewUrl?: string;
  hasDerivative?: boolean;
  detectedMode?: string;
}

export default function DirectPrintPage() {
  const router = useRouter();
  const shopName = PRIMARY_PILOT_SHOP.name;

  // Dynamic Shop Options & UPI Configuration from Firestore
  const [shopOptions, setShopOptions] = useState<ShopPrintOptions | null>(null);
  const [shopUpiConfig, setShopUpiConfig] = useState<UpiConfiguration | null>(null);

  // Print Configuration States
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [colorMode, setColorMode] = useState<PrintColorMode>("BW");
  const [duplexMode, setDuplexMode] = useState<PrintDuplexMode>("SINGLE");
  const [copies, setCopies] = useState<number>(1);
  const [orientation, setOrientation] = useState<PrintOrientation>("AUTO");
  const [scaling, setScaling] = useState<PrintScaling>("FIT");
  const [paperType, setPaperType] = useState<PaperType>("NORMAL_75GSM");
  const [finishing, setFinishing] = useState<FinishingType>("NONE");

  // Page Selection
  const [pageSelectionType, setPageSelectionType] = useState<"ALL" | "CUSTOM">("ALL");
  const [customPageRange, setCustomPageRange] = useState<string>("");

  // Customer Contact & Payment (Name, Phone with +91, Unverified Notice, Optional Consent)
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhoneDigits, setCustomerPhoneDigits] = useState<string>("");
  const [marketingConsent, setMarketingConsent] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MANUAL_UPI" | "ONLINE_GATEWAY">("CASH");

  // File & Draft States
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRecord[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [editingFile, setEditingFile] = useState<UploadedFileRecord | null>(null);
  const [orderDraftId, setOrderDraftId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Authoritative Pricing Quote
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Order Submission
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Clean English-only interface

  // Load canonical shop configuration
  useEffect(() => {
    let isMounted = true;
    const loadShopConfig = async () => {
      try {
        const res = await fetch(`/api/shops/${PRIMARY_PILOT_SHOP.id}/options`);
        const data = await res.json();
        if (res.ok && data.success && isMounted) {
          if (data.printOptions) setShopOptions(data.printOptions);
          if (data.upiConfig) {
            setShopUpiConfig(data.upiConfig);
            if (!data.upiConfig.isEnabled || !data.upiConfig.upiId) {
              setPaymentMethod("CASH");
            }
          }
        }
      } catch (err) {
        console.warn("[DirectPrintPage] Options fetch fallback", err);
      }
    };
    loadShopConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeFile = uploadedFiles[activeFileIndex] || uploadedFiles[0] || null;
  const activePageCount = activeFile ? activeFile.pageCount : 1;

  // Validate custom page range
  const parsedPagesInfo = useMemo(() => {
    if (!activeFile) {
      return { isValid: true, pages: [1], count: 1, error: null };
    }
    if (pageSelectionType === "ALL") {
      const all = Array.from({ length: activePageCount }, (_, i) => i + 1);
      return { isValid: true, pages: all, count: all.length, error: null };
    }
    try {
      const pages = parsePageRange(customPageRange || "1", activePageCount);
      return { isValid: true, pages, count: pages.length, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid page range";
      return { isValid: false, pages: [], count: 0, error: msg };
    }
  }, [activeFile, activePageCount, pageSelectionType, customPageRange]);

  // Output sheet estimation
  const totalSheetsEstimate = useMemo(() => {
    if (uploadedFiles.length === 0) return 1;
    const pages = parsedPagesInfo.count || 1;
    const sheetsPerCopy = duplexMode === "DOUBLE" ? Math.ceil(pages / 2) : pages;
    return sheetsPerCopy * copies;
  }, [uploadedFiles, parsedPagesInfo.count, duplexMode, copies]);

  // Ensure draft session
  const ensureDraftId = async (): Promise<string> => {
    if (orderDraftId) return orderDraftId;
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: PRIMARY_PILOT_SHOP.id })
    });
    const data = await res.json();
    if (!res.ok || !data.success || !data.draftId) {
      throw new Error(data.error || "Failed to initialize order session.");
    }
    setOrderDraftId(data.draftId);
    return data.draftId;
  };

  // Upload handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    if (uploadedFiles.length + fileList.length > 10) {
      setUploadError("Maximum 10 files allowed per order.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setQuote(null);

    const filesArray = Array.from(fileList);
    const newRecords: UploadedFileRecord[] = [];

    try {
      const draftId = await ensureDraftId();

      for (let i = 0; i < filesArray.length; i++) {
        const f = filesArray[i];
        if (f.size > 50 * 1024 * 1024) {
          throw new Error(`File ${f.name} exceeds 50MB limit.`);
        }

        setUploadProgressMsg(`Uploading file ${i + 1} of ${filesArray.length}: ${f.name}...`);

        const formData = new FormData();
        formData.append("file", f);
        formData.append("shopId", PRIMARY_PILOT_SHOP.id);
        formData.append("draftId", draftId);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.file) {
          throw new Error(data.error || `Failed to process ${f.name}`);
        }

        const isImg = f.type.startsWith("image/");
        const previewUrl = isImg ? URL.createObjectURL(f) : undefined;
        const detected = isImg ? ImageDetectionEngine.detectImageMode(1000, 1000, { filename: f.name }) : null;

        newRecords.push({
          id: data.file.id,
          safeDisplayName: data.file.safeDisplayName || f.name,
          mimeType: data.file.mimeType,
          sizeBytes: data.file.sizeBytes,
          sha256: data.file.sha256,
          pageCount: data.file.pageCount || 1,
          processingStatus: data.file.processingStatus,
          sortOrder: uploadedFiles.length + i,
          localPreviewUrl: previewUrl,
          hasDerivative: false,
          detectedMode: detected?.suggestedMode
        });
      }

      const combined = [...uploadedFiles, ...newRecords];
      setUploadedFiles(combined);
      setActiveFileIndex(0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload processing error";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const moveFileOrder = (index: number, direction: "UP" | "DOWN") => {
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= uploadedFiles.length) return;
    const items = [...uploadedFiles];
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;
    setUploadedFiles(items);
    setActiveFileIndex(targetIdx);
  };

  const removeFile = (index: number) => {
    const next = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(next);
    setActiveFileIndex(Math.max(0, index - 1));
  };

  // Calculate authoritative quote
  useEffect(() => {
    if (!orderDraftId || !activeFile || !parsedPagesInfo.isValid) {
      setQuote(null);
      return;
    }

    let isMounted = true;
    const calculateQuote = async () => {
      setIsCalculatingQuote(true);
      setQuoteError(null);

      try {
        const payload = {
          shopId: PRIMARY_PILOT_SHOP.id,
          draftId: orderDraftId,
          fileId: activeFile.id,
          pageRange: pageSelectionType === "CUSTOM" ? customPageRange : undefined,
          paperSize,
          colorMode,
          duplexMode,
          copies,
          orientation,
          scaling,
          paperType,
          finishing
        };

        const res = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.quote) {
          throw new Error(data.error || "Failed to calculate price quote");
        }

        if (isMounted) {
          setQuote(data.quote);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Price calculation error";
          setQuoteError(msg);
        }
      } finally {
        if (isMounted) {
          setIsCalculatingQuote(false);
        }
      }
    };

    const timer = setTimeout(calculateQuote, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    orderDraftId,
    activeFile?.id,
    parsedPagesInfo.isValid,
    paperSize,
    colorMode,
    duplexMode,
    copies,
    orientation,
    scaling,
    paperType,
    finishing,
    pageSelectionType,
    customPageRange
  ]);

  // Submit Order & Proceed to Payment / Tracking
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderDraftId || !activeFile || !quote) return;

    const trimmedName = customerName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setOrderError("Please enter your full name (at least 2 characters).");
      return;
    }

    const cleanPhone = customerPhoneDigits.replace(/\D/g, "");
    if (cleanPhone.length !== 10 || !/^[6-9]/.test(cleanPhone)) {
      setOrderError("Please enter a valid 10-digit Indian mobile number (e.g. 95815 29381).");
      return;
    }

    setIsSubmittingOrder(true);
    setOrderError(null);

    try {
      const orderPayload = {
        shopId: PRIMARY_PILOT_SHOP.id,
        draftId: orderDraftId,
        items: [
          {
            fileId: activeFile.id,
            quoteId: quote.quoteId
          }
        ],
        customer: {
          name: trimmedName,
          mobile: `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`,
          phone: cleanPhone,
          marketingConsent
        },
        paymentMethod
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to place print order.");
      }

      router.push(`/track/${data.orderId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Order submission error";
      setOrderError(msg);
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-emerald-600 selection:text-white pb-16">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SosLogo variant="horizontal" size="sm" href="/" />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Shop Open &bull; Printing Live</span>
            </div>
            <Link
              href="/"
              className="hidden sm:inline-flex px-3 py-1 rounded-lg border border-[#CBD5E1] bg-white hover:bg-slate-50 text-xs font-bold text-[#0F172A] transition"
            >
              Full Website
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-8">
        {/* Sub-hero Pill Banner */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                {"Printing at Shakeel Online Services"}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight mt-0.5">
                {"Upload &amp; Print Documents"}
              </h1>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold self-start sm:self-auto">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{"No app or account required"}</span>
            </div>
          </div>

          {/* 4-Step Visual Stepper */}
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-[#64748B] pt-1">
            <div className={`p-2 rounded-xl transition ${uploadedFiles.length === 0 ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-50 text-[#0F172A]"}`}>
              <span className="block text-xs font-mono font-black">1</span>
              <span>{"Upload Files"}</span>
            </div>
            <div className={`p-2 rounded-xl transition ${uploadedFiles.length > 0 && !quote ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-50"}`}>
              <span className="block text-xs font-mono font-black">2</span>
              <span>{"Settings"}</span>
            </div>
            <div className={`p-2 rounded-xl transition ${quote ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-50"}`}>
              <span className="block text-xs font-mono font-black">3</span>
              <span>{"Your Details"}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50">
              <span className="block text-xs font-mono font-black">4</span>
              <span>{"Pay &amp; Track"}</span>
            </div>
          </div>
        </div>

        {/* PRIMARY UPLOAD ZONE */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-black text-[#0F172A]">
                {"1. Upload Your Files (PDF / JPG / PNG)"}
              </h2>
            </div>
            <span className="text-xs text-[#64748B] font-mono">
              {uploadedFiles.length}/10 {"files"}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,image/jpeg,image/png"
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition flex flex-col items-center justify-center gap-3 cursor-pointer ${
              isUploading
                ? "border-emerald-300 bg-emerald-50/50 cursor-wait"
                : "border-[#CBD5E1] hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                <div className="space-y-1">
                  <div className="text-sm font-bold text-[#0F172A]">
                    {uploadProgressMsg || ("Processing your files...")}
                  </div>
                  <div className="text-xs text-slate-500">
                    {"Extracting page counts securely..."}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="text-base font-black text-[#0F172A]">
                    {"Tap here to choose files or drag &amp; drop"}
                  </div>
                  <p className="text-xs text-[#64748B]">
                    {"PDF, JPG, PNG &bull; Up to 10 files &bull; 50 MB per file"}
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                >
                  {"Browse Files"}
                </button>
              </>
            )}
          </div>

          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadedFiles.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                {"Uploaded Document List:"}
              </div>
              <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-xl overflow-hidden bg-white">
                {uploadedFiles.map((file, idx) => {
                  const isActive = idx === activeFileIndex;
                  return (
                    <div
                      key={file.id}
                      onClick={() => setActiveFileIndex(idx)}
                      className={`p-3 flex items-center justify-between gap-3 transition cursor-pointer ${
                        isActive ? "bg-emerald-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#0F172A] truncate">
                            {file.safeDisplayName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {file.pageCount} {file.pageCount === 1 ? "page" : "pages"} &bull; {(file.sizeBytes / 1024).toFixed(0)} KB
                          </div>
                          {file.mimeType.startsWith("image/") && (
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFile(file);
                                }}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                                  file.hasDerivative
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                                    : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-300"
                                }`}
                              >
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                <span>{file.hasDerivative ? ("Enhanced (Click to Edit)") : ("Auto-Enhance & Edit")}</span>
                              </button>
                              {file.detectedMode === "DOCUMENT" && !file.hasDerivative && (
                                <span className="text-[10px] text-slate-400">
                                  &bull; {"Document detected"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          title="Move Up"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveFileOrder(idx, "UP");
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Move Down"
                          disabled={idx === uploadedFiles.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveFileOrder(idx, "DOWN");
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Remove file"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* PRINT SETTINGS & PREVIEW */}
        {uploadedFiles.length > 0 && (
          <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <Printer className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-black text-[#0F172A]">
                {"2. Print Options &amp; Copies"}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {/* Color Mode */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#0F172A] block">
                  {"Color Mode"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setColorMode("BW")}
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer text-center ${
                      colorMode === "BW"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    B&amp;W (₹2/side)
                  </button>
                  <button
                    type="button"
                    onClick={() => setColorMode("COLOR")}
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer text-center ${
                      colorMode === "COLOR"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Colour (₹10/side)
                  </button>
                </div>
              </div>

              {/* Duplex / Sides */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#0F172A] block">
                  {"Sides"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplexMode("SINGLE")}
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer text-center ${
                      duplexMode === "SINGLE"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Single-sided
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplexMode("DOUBLE")}
                    className={`py-2 px-3 rounded-xl font-bold border transition cursor-pointer text-center ${
                      duplexMode === "DOUBLE"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Duplex (₹3/sheet)
                  </button>
                </div>
              </div>

              {/* Copies */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#0F172A] block">
                  {"Copies"}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-black text-sm flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 py-1.5 px-3 text-center font-mono font-bold text-sm rounded-xl border border-[#CBD5E1] bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setCopies(copies + 1)}
                    className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-black text-sm flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Paper Size */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#0F172A] block">
                  {"Paper Size"}
                </label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                  className="w-full py-2 px-3 rounded-xl border border-[#CBD5E1] bg-white font-semibold text-xs"
                >
                  <option value="A4">A4 (Standard 210 &times; 297 mm)</option>
                  <option value="A3">A3 (Large 297 &times; 420 mm)</option>
                  <option value="LEGAL">Legal</option>
                </select>
              </div>

              {/* Orientation */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#0F172A] block">
                  {"Orientation"}
                </label>
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as PrintOrientation)}
                  className="w-full py-2 px-3 rounded-xl border border-[#CBD5E1] bg-white font-semibold text-xs"
                >
                  <option value="AUTO">Auto (Recommended)</option>
                  <option value="PORTRAIT">Portrait</option>
                  <option value="LANDSCAPE">Landscape</option>
                </select>
              </div>

              {/* Fit / Scale */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#0F172A] block">
                  {"Fit &amp; Scale"}
                </label>
                <select
                  value={scaling}
                  onChange={(e) => setScaling(e.target.value as PrintScaling)}
                  className="w-full py-2 px-3 rounded-xl border border-[#CBD5E1] bg-white font-semibold text-xs"
                >
                  <option value="FIT">Fit to Printable Area</option>
                  <option value="ACTUAL_SIZE">Actual Size (100%)</option>
                </select>
              </div>
            </div>

            {/* Page Range Selection */}
            <div className="p-3 bg-slate-50 border border-[#E2E8F0] rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="pageRangeType"
                    checked={pageSelectionType === "ALL"}
                    onChange={() => setPageSelectionType("ALL")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{"All Pages"} ({activePageCount})</span>
                </label>
                <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                  <input
                    type="radio"
                    name="pageRangeType"
                    checked={pageSelectionType === "CUSTOM"}
                    onChange={() => setPageSelectionType("CUSTOM")}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{"Custom Page Range"}</span>
                </label>
              </div>

              {pageSelectionType === "CUSTOM" && (
                <div className="pt-1">
                  <input
                    type="text"
                    value={customPageRange}
                    onChange={(e) => setCustomPageRange(e.target.value)}
                    placeholder="e.g. 1-3, 5, 7"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Enter page numbers separated by comma or hyphen (e.g., 1-5, 8). Total selected: {parsedPagesInfo.count} pages.
                  </span>
                </div>
              )}
            </div>

            {/* Output Sheet Summary & Real-time Frozen Quote */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>
                    {totalSheetsEstimate} {totalSheetsEstimate === 1 ? "Physical Sheet" : "Physical Sheets"} Output
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800">
                  {parsedPagesInfo.count} pages &times; {copies} {copies === 1 ? "copy" : "copies"} &bull; {duplexMode === "DOUBLE" ? "2-sided duplex" : "1-sided single"}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-emerald-800 uppercase font-bold">
                  {"Server Verified Quote"}
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono">
                  {isCalculatingQuote ? (
                    <Loader2 className="w-6 h-6 animate-spin inline-block text-emerald-600" />
                  ) : quote ? (
                    `₹${quote.totalRupees.toFixed(2)}`
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </div>

            {quoteError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{quoteError}</span>
              </div>
            )}
          </section>
        )}

        {/* CUSTOMER CONTACT & PAYMENT (Final Order Placement) */}
        {uploadedFiles.length > 0 && quote && (
          <form onSubmit={handlePlaceOrder} className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
              <User className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-black text-[#0F172A]">
                  {"3. Customer Details &amp; Payment"}
                </h2>
                <p className="text-xs text-[#64748B]">
                  Used to identify your order at the counter and contact you about printing.
                </p>
              </div>
            </div>

            {orderError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#0F172A] block">
                  {"Full Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 block">
                  {"Used to identify your order at the counter"}
                </span>
              </div>

              {/* Mobile Number with Country Code */}
              <div className="space-y-1.5">
                <label className="font-bold text-[#0F172A] block">
                  {"Mobile Number *"}
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-[#CBD5E1] rounded-l-xl font-mono font-bold text-slate-700 text-xs">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={customerPhoneDigits}
                    onChange={(e) => setCustomerPhoneDigits(e.target.value.replace(/\D/g, ""))}
                    placeholder="95815 29381"
                    className="w-full px-3 py-2.5 rounded-r-xl border border-[#CBD5E1] bg-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block">
                  {"Unverified mobile number. No account needed. Kept private."}
                </span>
              </div>
            </div>

            {/* Optional Unchecked WhatsApp Consent */}
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs">
              <input
                type="checkbox"
                id="marketingConsent"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-0.5"
              />
              <label htmlFor="marketingConsent" className="text-slate-600 cursor-pointer text-[11px] leading-relaxed">
                {"Receive order completion notification and pickup alerts via WhatsApp (Optional, unchecked by default)."}
              </label>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-[#0F172A] block">
                Choose Payment Method
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* A. Pay at Counter */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    paymentMethod === "CASH"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Pay at Counter</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Pay cash directly at the counter upon collection</div>
                </button>

                {/* B. Pay by UPI */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod("MANUAL_UPI")}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                    paymentMethod === "MANUAL_UPI"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Pay by UPI</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 font-mono">Direct UPI to 9581529381@ybl</div>
                </button>

                {/* C. Online Gateway — Coming Soon (Disabled) */}
                <div
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-400 cursor-not-allowed select-none"
                  title="Online card & netbanking gateway coming in future release"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-500">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      <span>Online Gateway</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                      Coming Soon
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Cards &amp; NetBanking integration arriving soon</div>
                </div>
              </div>
            </div>

            {/* Place Order CTA Button */}
            <button
              type="submit"
              disabled={isSubmittingOrder || !quote}
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm tracking-wide shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmittingOrder ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Printer className="w-5 h-5" />
              )}
              <span>
                {`Submit Order &bull; ₹${quote.totalRupees.toFixed(2)}`}
              </span>
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* SECTION 4: ADDITIONAL TOOLS — COMPACT SECONDARY POSITION     */}
        {/* “Need something else? Try these tools” */}
        {/* ============================================================ */}
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-[#0F172A]">
                  {"Need something else? Try these tools"}
                </h2>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 font-mono">
                Shakeel Online Services
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              {"Specialized document templates and counter assistance tools configured for this shop:"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* 1. Passport Photos */}
            <Link
              href="/photo-studio?mode=passport"
              className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-emerald-300 hover:bg-emerald-50/30 transition flex flex-col justify-between space-y-2 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A] group-hover:text-emerald-700 transition">
                    Passport Photos
                  </div>
                  <div className="text-[10px] text-purple-700 font-bold">₹100 / Set (8 or 16)</div>
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] leading-tight">
                35&times;45mm standard with cutting guides on photo paper.
              </p>
            </Link>

            {/* 2. Resume Maker */}
            <Link
              href="/resume"
              className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-emerald-300 hover:bg-emerald-50/30 transition flex flex-col justify-between space-y-2 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileBadge className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A] group-hover:text-emerald-700 transition">
                    Resume Maker
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold">6 ATS Templates</div>
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] leading-tight">
                Professional multi-page CV with instant PDF preview.
              </p>
            </Link>

            {/* 3. Photo Prints & Grids */}
            <Link
              href="/photo-studio"
              className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-emerald-300 hover:bg-emerald-50/30 transition flex flex-col justify-between space-y-2 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Images className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A] group-hover:text-emerald-700 transition">
                    Photo Prints &amp; Grids
                  </div>
                  <div className="text-[10px] text-blue-700 font-bold">Glossy 4&times;6 / A4</div>
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] leading-tight">
                High-resolution glossy photos, collage grids &amp; framing.
              </p>
            </Link>

            {/* 4. Scan to PDF */}
            <Link
              href="/scan"
              className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-emerald-300 hover:bg-emerald-50/30 transition flex flex-col justify-between space-y-2 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <ScanLine className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A] group-hover:text-emerald-700 transition">
                    Scan to PDF
                  </div>
                  <div className="text-[10px] text-amber-700 font-bold">Camera Auto-Crop</div>
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] leading-tight">
                Turn camera pictures of paper into clean black &amp; white PDF.
              </p>
            </Link>

            {/* 5. ID Front & Back Copy */}
            <Link
              href="/id-card"
              className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-emerald-300 hover:bg-emerald-50/30 transition flex flex-col justify-between space-y-2 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A] group-hover:text-emerald-700 transition">
                    ID Front/Back Copy
                  </div>
                  <div className="text-[10px] text-indigo-700 font-bold">Aadhaar &bull; PAN</div>
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] leading-tight">
                Both sides of your ID card arranged on a single A4 sheet.
              </p>
            </Link>

            {/* 6. Mini Print */}
            <Link
              href="/mini-print"
              className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-emerald-300 hover:bg-emerald-50/30 transition flex flex-col justify-between space-y-2 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A] group-hover:text-emerald-700 transition">
                    Mini Print (N-Up)
                  </div>
                  <div className="text-[10px] text-teal-700 font-bold">2-Up / 4-Up Sheets</div>
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] leading-tight">
                Save paper with multiple pages per sheet. Perfect for notes.
              </p>
            </Link>
          </div>
        </section>

        {/* WhatsApp Support Help Desk */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Need assistance with your print?</strong> Contact Shakeel Online Services directly:
            </span>
          </div>
          <a
            href="https://wa.me/919581529381?text=Hello%20Shakeel%20Online%20Services%2C%20I%20have%20a%20question%20about%20printing%3A"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs shrink-0"
          >
            <span>WhatsApp +91 95815 29381</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </main>
      {/* Enhanced Image Editor Modal */}
      {editingFile && (
        <EnhancedImageEditor
          fileId={editingFile.id}
          imageUrl={editingFile.localPreviewUrl || `/api/upload/file/${editingFile.id}`}
          originalFilename={editingFile.safeDisplayName}
          initialMode={editingFile.detectedMode as any}
          targetPaperSize={paperSize === "A3" ? "A3" : "A4"}
          hasExistingDerivative={editingFile.hasDerivative}
          onSaveDerivative={async (blob, metadata) => {
            const formData = new FormData();
            formData.append("fileId", editingFile.id);
            formData.append("file", blob, `${editingFile.safeDisplayName}-enhanced.jpg`);
            formData.append("metadata", JSON.stringify(metadata));

            const res = await fetch("/api/upload/derivative", {
              method: "POST",
              body: formData
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
              throw new Error(data.error || "Failed to save enhanced image");
            }

            const newPreview = URL.createObjectURL(blob);
            setUploadedFiles(prev =>
              prev.map(f => f.id === editingFile.id ? { ...f, hasDerivative: true, localPreviewUrl: newPreview } : f)
            );
            // Invalidate quote to trigger fresh calculation
            setQuote(null);
          }}
          onRevertOriginal={async () => {
            setUploadedFiles(prev =>
              prev.map(f => f.id === editingFile.id ? { ...f, hasDerivative: false } : f)
            );
            setQuote(null);
          }}
          onClose={() => setEditingFile(null)}
        />
      )}
    </div>
  );
}
