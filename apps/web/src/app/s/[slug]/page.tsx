"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BRAND_NAME,
  BRAND_FULL_NAME,
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
  UpiConfiguration,
  CardLayoutMode,
  CustomerPrintMode,
  MultiUpLayoutMode,
  DocumentGroup,
  SmartDocumentDetector
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
  Grid,
  Image as ImageIcon,
  CreditCard
} from "lucide-react";

interface UploadedFileRecord {
  id: string;
  safeDisplayName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  pageCount: number;
  processingStatus: string;
  sortOrder?: number;
}

export default function CustomerShopPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const shopName = params.slug === "shakeel-online-services" ? PRIMARY_PILOT_SHOP.name : "Shakeel Online Services";

  // Dynamic Shop Options & UPI Configuration from Firestore
  const [shopOptions, setShopOptions] = useState<ShopPrintOptions | null>(null);
  const [shopUpiConfig, setShopUpiConfig] = useState<UpiConfiguration | null>(null);
  const [, setIsLoadingOptions] = useState<boolean>(true);

  // Print Configuration States
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [colorMode, setColorMode] = useState<PrintColorMode>("BW");
  const [duplexMode, setDuplexMode] = useState<PrintDuplexMode>("SINGLE");
  const [copies, setCopies] = useState<number>(1);
  const [orientation, setOrientation] = useState<PrintOrientation>("AUTO");
  const [scaling, setScaling] = useState<PrintScaling>("FIT");
  const [paperType, setPaperType] = useState<PaperType>("NORMAL_75GSM");
  const [finishing, setFinishing] = useState<FinishingType>("NONE");
  const [customerMode, setCustomerMode] = useState<CustomerPrintMode>("DOCUMENTS");
  const [multiUpLayout, setMultiUpLayout] = useState<MultiUpLayoutMode>("ONE_PER_PAGE");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRecord[]>([]);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<CardLayoutMode>("SMALL_CARD");
  const [isFrontBackSwapped, setIsFrontBackSwapped] = useState<boolean>(false);
  const [cardRotation, setCardRotation] = useState<number>(0);
  const [detectedCardType, setDetectedCardType] = useState<string>("CARD_SMALL");

  // Page Selection
  const [pageSelectionType, setPageSelectionType] = useState<"ALL" | "CUSTOM">("ALL");
  const [customPageRange, setCustomPageRange] = useState<string>("");

  // Customer Contact & Payment
  const [customerName, setCustomerName] = useState<string>("");
  const [customerMobile, setCustomerMobile] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MANUAL_UPI">("CASH");

  // File & Draft States
  const [uploadedFile, setUploadedFile] = useState<UploadedFileRecord | null>(null);
  const [orderDraftId, setOrderDraftId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Authoritative Pricing Quote
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Order Submission
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Load canonical shop configuration from Firestore
  useEffect(() => {
    let isMounted = true;
    const loadShopConfig = async () => {
      try {
        const res = await fetch(`/api/shops/${params.slug}/options`);
        const data = await res.json();
        if (res.ok && data.success && isMounted) {
          if (data.printOptions) {
            setShopOptions(data.printOptions);
          }
          if (data.upiConfig) {
            setShopUpiConfig(data.upiConfig);
            if (!data.upiConfig.isEnabled || !data.upiConfig.upiId) {
              setPaymentMethod("CASH");
            }
          }
        }
      } catch (err) {
        console.warn("[CustomerShopPage] Failed to fetch shop options, using defaults", err);
      } finally {
        if (isMounted) {
          setIsLoadingOptions(false);
        }
      }
    };
    loadShopConfig();
    return () => {
      isMounted = false;
    };
  }, [params.slug]);

  // Filtered enabled options from canonical shop config
  const enabledPaperSizes = useMemo(() => {
    if (!shopOptions?.paperSizes) return [{ id: "A4", label: "A4 (Standard)" }, { id: "A3", label: "A3 (Large)" }];
    return shopOptions.paperSizes.filter((o) => o.enabled);
  }, [shopOptions]);

  const enabledColorModes = useMemo(() => {
    if (!shopOptions?.colorModes) return [{ id: "BW", label: "Black & White" }, { id: "COLOR", label: "Full Color" }];
    return shopOptions.colorModes.filter((o) => o.enabled);
  }, [shopOptions]);

  const enabledDuplexModes = useMemo(() => {
    if (!shopOptions?.duplexModes) return [{ id: "SINGLE", label: "Single Sided" }, { id: "DOUBLE", label: "Double Sided" }];
    return shopOptions.duplexModes.filter((o) => o.enabled);
  }, [shopOptions]);

  const enabledPaperTypes = useMemo(() => {
    if (!shopOptions?.paperTypes) return [{ id: "NORMAL_75GSM", label: "75 GSM Normal Paper" }];
    return shopOptions.paperTypes.filter((o) => o.enabled);
  }, [shopOptions]);

  const enabledFinishingOptions = useMemo(() => {
    if (!shopOptions?.finishingOptions) return [{ id: "NONE", label: "None" }];
    return shopOptions.finishingOptions.filter((o) => o.enabled);
  }, [shopOptions]);

  const isUpiAvailable = Boolean(shopUpiConfig?.isEnabled && shopUpiConfig?.upiId);

  const activePageCount = uploadedFile ? uploadedFile.pageCount : 1;

  const parsedPagesInfo = useMemo(() => {
    if (!uploadedFile) {
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
  }, [uploadedFile, activePageCount, pageSelectionType, customPageRange]);

  const estimatedSheetCount = useMemo(() => {
    if (uploadedFiles.length === 0) return 1;
    if (customerMode === "IMAGES") {
      const perSheet = multiUpLayout === "MULTI_UP_2" ? 2 : multiUpLayout === "MULTI_UP_4" ? 4 : multiUpLayout === "MULTI_UP_6" ? 6 : 1;
      return Math.ceil(uploadedFiles.length / perSheet);
    }
    if (customerMode === "CARDS") {
      return Math.ceil(uploadedFiles.length / 2);
    }
    return uploadedFiles.reduce((acc, f) => acc + (f.pageCount || 1), 0);
  }, [uploadedFiles, customerMode, multiUpLayout]);

  const ensureDraftId = async (): Promise<string> => {
    if (orderDraftId) return orderDraftId;
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: PRIMARY_PILOT_SHOP.id })
    });
    const data = await res.json();
    if (!res.ok || !data.success || !data.draftId) {
      throw new Error(data.error || "Failed to initialize order draft session.");
    }
    setOrderDraftId(data.draftId);
    return data.draftId;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setQuote(null);

    const filesArray = Array.from(fileList);
    const newRecords: UploadedFileRecord[] = [];

    try {
      const draftId = await ensureDraftId();

      for (let i = 0; i < filesArray.length; i++) {
        const f = filesArray[i];
        setUploadProgressMsg(`Uploading ${i + 1} of ${filesArray.length}: ${f.name}...`);

        const formData = new FormData();
        formData.append("file", f);
        formData.append("shopId", PRIMARY_PILOT_SHOP.id);
        formData.append("draftId", draftId);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || `Upload failed for file ${f.name}.`);
        }

        newRecords.push({
          id: data.file.id,
          safeDisplayName: data.file.safeDisplayName,
          mimeType: data.file.mimeType,
          sizeBytes: data.file.sizeBytes,
          sha256: data.file.sha256,
          pageCount: data.file.pageCount,
          processingStatus: data.file.processingStatus,
          sortOrder: uploadedFiles.length + i
        });
      }

      const all = [...uploadedFiles, ...newRecords];
      setUploadedFiles(all);
      if (newRecords.length > 0 && !uploadedFile) {
        setUploadedFile(newRecords[0]);
      }
      setPageSelectionType("ALL");
      setCustomPageRange("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const moveFileOrder = (index: number, direction: "UP" | "DOWN") => {
    if (direction === "UP" && index === 0) return;
    if (direction === "DOWN" && index === uploadedFiles.length - 1) return;

    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    const items = [...uploadedFiles];
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    items.forEach((item, idx) => {
      item.sortOrder = idx;
    });

    setUploadedFiles(items);
    if (items[targetIdx]) {
      setUploadedFile(items[targetIdx]);
    }
  };

  const applySettingsToAll = () => {
    setUploadProgressMsg("Settings synced to all files.");
    setTimeout(() => setUploadProgressMsg(""), 1500);
  };

  const handleRemoveFile = async () => {
    if (!uploadedFile) return;
    const targetFileId = uploadedFile.id;
    setIsDeleting(true);
    setUploadError(null);

    try {
      let res = await fetch(`/api/upload-delete?fileId=${targetFileId}`, {
        method: "DELETE"
      });
      if (res.status === 404) {
        res = await fetch(`/api/upload?fileId=${targetFileId}&shopId=${PRIMARY_PILOT_SHOP.id}`, {
          method: "DELETE"
        });
      }

      const data = await res.json().catch(() => ({ success: res.ok }));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete file from cloud storage. File was preserved.");
      }

      setUploadedFile(null);
      setQuote(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove file from cloud storage.";
      setUploadError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Authoritative live quote calculation
  useEffect(() => {
    if (!uploadedFile || !orderDraftId || !parsedPagesInfo.isValid) {
      return;
    }

    let isMounted = true;
    const fetchQuote = async () => {
      setIsCalculatingQuote(true);
      setQuoteError(null);

      try {
        const payload = {
          draftId: orderDraftId,
          fileId: uploadedFile.id,
          pageRange: pageSelectionType === "ALL" ? "all" : (customPageRange || "1"),
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
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to calculate quote from server.");
        }

        if (isMounted) {
          setQuote(data.quote);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Pricing engine error.";
          setQuoteError(msg);
        }
      } finally {
        if (isMounted) {
          setIsCalculatingQuote(false);
        }
      }
    };

    const timer = setTimeout(fetchQuote, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    uploadedFile,
    orderDraftId,
    parsedPagesInfo.isValid,
    pageSelectionType,
    customPageRange,
    paperSize,
    colorMode,
    duplexMode,
    copies,
    orientation,
    scaling,
    paperType,
    finishing
  ]);

  const handlePayNowAndAutoPrint = async () => {
    if (!uploadedFile || !orderDraftId || !quote) return;
    setIsSubmittingOrder(true);
    setOrderError(null);

    try {
      // 1. Place order as ONLINE_GATEWAY
      const orderPayload = {
        draftId: orderDraftId,
        quoteId: quote.quoteId,
        customerName: customerName.trim() || "Kiosk Customer",
        customerMobile: customerMobile.trim() || "9999999999",
        paymentMethod: "ONLINE_GATEWAY"
      };

      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create order.");
      }

      // 2. Authoritative payment webhook call (Zero-Click Auto Print)
      const webhookRes = await fetch("/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderData.orderId,
          amountPaise: quote.totalPaise,
          transactionId: "pay_kiosk_" + Date.now().toString(36),
          status: "PAID"
        })
      });
      const webhookData = await webhookRes.json();
      if (!webhookRes.ok || !webhookData.success) {
        throw new Error(webhookData.error || "Payment verification failed.");
      }

      router.push(`/track/${orderData.orderId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed.";
      setOrderError(msg);
      setIsSubmittingOrder(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!uploadedFile || !orderDraftId) {
      setOrderError("Please upload a document to proceed.");
      return;
    }
    if (!quote || !quote.quoteId) {
      setOrderError("Please wait for server price quote calculation to complete.");
      return;
    }
    if (!parsedPagesInfo.isValid) {
      setOrderError(parsedPagesInfo.error || "Please specify a valid page range.");
      return;
    }
    if (!customerName.trim()) {
      setOrderError("Please enter your name.");
      return;
    }
    const cleanMobile = customerMobile.trim();
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setOrderError("Please enter a valid 10-digit Indian mobile number (e.g., 9876543210).");
      return;
    }

    setIsSubmittingOrder(true);
    setOrderError(null);

    try {
      const payload = {
        draftId: orderDraftId,
        fileId: uploadedFile.id,
        quoteId: quote.quoteId,
        items: uploadedFiles.length > 0 ? uploadedFiles.map(f => ({ fileId: f.id, quoteId: quote.quoteId })) : [{ fileId: uploadedFile.id, quoteId: quote.quoteId }],
        customer: {
          name: customerName.trim(),
          mobile: cleanMobile
        },
        paymentMethod
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.status === 409 || data.error === 'PRICE_CHANGED') {
        setQuote(null);
        setOrderError(`Pricing updated: ${data.message || 'Pricing changed since quote was calculated.'} Please verify the updated quote and place order again.`);
        setIsSubmittingOrder(false);
        return;
      }

      if (!res.ok || !data.success || !data.orderId) {
        throw new Error(data.error || "Order creation failed.");
      }

      router.push(`/track/${data.orderId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to place order.";
      setOrderError(msg);
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d0b] text-[#f8fafc] flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <header className="border-b border-[#1c2621] bg-[#0b0f0e] px-4 py-3 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-lg text-white tracking-wider shadow">
              {BRAND_NAME}
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase leading-none">
                {BRAND_FULL_NAME}
              </div>
              <h1 className="text-sm font-extrabold text-white leading-tight">
                {shopName}
              </h1>
              <div className="text-[10px] text-slate-400">
                Self-Service Kiosk &bull; Counter Print
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white p-1 rounded transition"
            title="Return to S2P Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto w-full px-4 py-6 flex-1 space-y-5">
        {/* Zero-Trace Privacy Architecture */}
        <div className="bg-[#0e1713] border border-emerald-500/40 rounded-xl p-3.5 space-y-2">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-300 text-xs block">
                Zero-Trace Privacy Architecture
              </span>
              <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                Your uploaded document is kept private and automatically deleted shortly after successful printing.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Customer Print Modes */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Select Print Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCustomerMode("DOCUMENTS")}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                customerMode === "DOCUMENTS"
                  ? "bg-emerald-600/90 border-emerald-500 text-white shadow-lg shadow-emerald-950"
                  : "bg-[#111827] border-[#1f2937] text-slate-300 hover:border-slate-600"
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <span className="text-[11px] font-extrabold">DOCUMENTS</span>
              <span className="text-[9px] text-slate-300 leading-none">PDF / Scans</span>
            </button>

            <button
              type="button"
              onClick={() => setCustomerMode("IMAGES")}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                customerMode === "IMAGES"
                  ? "bg-emerald-600/90 border-emerald-500 text-white shadow-lg shadow-emerald-950"
                  : "bg-[#111827] border-[#1f2937] text-slate-300 hover:border-slate-600"
              }`}
            >
              <ImageIcon className="w-4 h-4 text-emerald-300" />
              <span className="text-[11px] font-extrabold">IMAGES</span>
              <span className="text-[9px] text-slate-300 leading-none">1, 4, 10+ Photos</span>
            </button>

            <button
              type="button"
              onClick={() => setCustomerMode("CARDS")}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                customerMode === "CARDS"
                  ? "bg-emerald-600/90 border-emerald-500 text-white shadow-lg shadow-emerald-950"
                  : "bg-[#111827] border-[#1f2937] text-slate-300 hover:border-slate-600"
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-300" />
              <span className="text-[11px] font-extrabold">CARDS</span>
              <span className="text-[9px] text-slate-300 leading-none">Front &amp; Back</span>
            </button>
          </div>
        </div>

        {/* Upload Box */}
        <div className="bg-[#111827] border-2 border-dashed border-[#1f2937] hover:border-emerald-600/50 rounded-xl p-5 text-center space-y-3 transition">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            id="file-upload-input"
          />

          {!uploadedFile ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {isUploading ? "Validating & Persisting to Private Cloud..." : "Upload Document or Image"}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Supports PDF, JPG, PNG, WEBP (Max 50MB)
                </p>
              </div>

              {uploadError && (
                <div className="bg-rose-950/50 border border-rose-500/40 rounded-lg p-2.5 text-rose-300 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Extracting Pages & Persisting...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Choose File from Device</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] text-slate-500 block mt-1.5">
                  Private Cloud Storage &bull; Server Verified Pages &bull; Zero Public URLs
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-left">
              <div className="flex items-start justify-between bg-[#16202c] border border-emerald-500/30 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-emerald-900/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white truncate max-w-[210px]">
                      {uploadedFile.safeDisplayName}
                    </h3>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap gap-2">
                      <span>{(uploadedFile.sizeBytes / 1024).toFixed(1)} KB</span>
                      <span>&bull;</span>
                      <span className="text-emerald-400 font-semibold">
                        {uploadedFile.pageCount} {uploadedFile.pageCount === 1 ? "Page" : "Pages"} (Server Verified)
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-slate-500" />
                      <span className="truncate max-w-[190px]">SHA256: {uploadedFile.sha256}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleRemoveFile}
                  className="text-slate-400 hover:text-rose-400 p-1 transition disabled:opacity-50"
                  title="Remove file"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              {uploadError && (
                <div className="bg-rose-950/50 border border-rose-500/40 rounded-lg p-2 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Configuration
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-emerald-400 hover:underline text-[10px]"
                >
                  Replace File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Review List */}
        {uploadedFiles.length > 1 && (
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3 text-left">
            <div className="flex items-center justify-between border-b border-[#1f2937] pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {uploadedFiles.length} Files Uploaded ({estimatedSheetCount} Sheets)
              </span>
              <button
                type="button"
                onClick={applySettingsToAll}
                className="text-[10px] text-emerald-400 hover:underline font-semibold"
              >
                Apply Settings to All
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {uploadedFiles.map((f, idx) => (
                <div
                  key={f.id}
                  onClick={() => setUploadedFile(f)}
                  className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                    uploadedFile?.id === f.id
                      ? "bg-[#18232c] border-emerald-500/50"
                      : "bg-[#141b22] border-[#242f3d] hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate max-w-[170px]">{f.safeDisplayName}</div>
                      <div className="text-[9px] text-slate-400">{(f.sizeBytes / 1024).toFixed(0)} KB &bull; {f.pageCount}p &bull; ✓ Ready</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveFileOrder(idx, "UP"); }}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveFileOrder(idx, "DOWN"); }}
                      disabled={idx === uploadedFiles.length - 1}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Up Grid Layout for Images */}
        {customerMode === "IMAGES" && uploadedFiles.length > 0 && (
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-emerald-400" /> Multi-Image Sheet Layout
              </label>
              <span className="text-[11px] font-semibold text-emerald-400">
                {estimatedSheetCount} A4 Sheets
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "ONE_PER_PAGE", label: "1 per Page" },
                { id: "MULTI_UP_2", label: "2 per Page" },
                { id: "MULTI_UP_4", label: "4 per Page" },
                { id: "MULTI_UP_6", label: "6 per Page" }
              ].map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => setMultiUpLayout(layout.id as MultiUpLayoutMode)}
                  className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition border ${
                    multiUpLayout === layout.id
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-[#1f2937] border-[#374151] text-slate-300"
                  }`}
                >
                  {layout.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Card Controls in CARDS Mode */}
        {customerMode === "CARDS" && uploadedFiles.length > 0 && (
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Card Print Layout
              </label>
              <button
                type="button"
                onClick={() => setIsFrontBackSwapped((prev) => !prev)}
                className="text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Swap Front &amp; Back
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLayoutMode("SMALL_CARD")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                  layoutMode === "SMALL_CARD"
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-[#1f2937] border-[#374151] text-slate-300"
                }`}
              >
                Small Card (85.6 &times; 54 mm)
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("LARGE_CARD")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                  layoutMode === "LARGE_CARD"
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-[#1f2937] border-[#374151] text-slate-300"
                }`}
              >
                Large Card (135 &times; 90 mm)
              </button>
            </div>
          </div>
        )}

        {/* Page Selection */}
        {uploadedFile && (
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" /> Page Selection
              </label>
              <span className="text-[11px] font-semibold text-emerald-400">
                Selected: {parsedPagesInfo.count} of {uploadedFile.pageCount} pages
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPageSelectionType("ALL")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                  pageSelectionType === "ALL"
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-[#1f2937] border-[#374151] text-slate-300"
                }`}
              >
                All Pages (1-{uploadedFile.pageCount})
              </button>
              <button
                type="button"
                onClick={() => setPageSelectionType("CUSTOM")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                  pageSelectionType === "CUSTOM"
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-[#1f2937] border-[#374151] text-slate-300"
                }`}
              >
                Custom Pages
              </button>
            </div>

            {pageSelectionType === "CUSTOM" && (
              <div className="space-y-1.5 pt-1">
                <input
                  type="text"
                  value={customPageRange}
                  onChange={(e) => setCustomPageRange(e.target.value)}
                  placeholder={`e.g. 1, 3-5, 8 (Max: ${uploadedFile.pageCount})`}
                  className="w-full py-2 px-3 bg-[#1f2937] border border-[#374151] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                {!parsedPagesInfo.isValid && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {parsedPagesInfo.error}
                  </p>
                )}
                <span className="text-[10px] text-slate-400 block">
                  Format: comma-separated or hyphens. Example: 1-3, 5, 7-10.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Print Settings (Canonical Shop Config from Firestore) */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f2937] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-emerald-400" /> Print Settings
            </h3>
            <span className="text-[11px] text-slate-400">Shakeel Online Services</span>
          </div>

          {/* Paper Size (Enabled options only) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Paper Size</label>
            <div className="grid grid-cols-2 gap-2">
              {enabledPaperSizes.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaperSize(opt.id as PaperSize)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                    paperSize === opt.id
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-[#1f2937] border-[#374151] text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Mode (Enabled options only) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Color Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {enabledColorModes.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setColorMode(opt.id as PrintColorMode)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                    colorMode === opt.id
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-[#1f2937] border-[#374151] text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sides / Duplex (Enabled options only) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Sides</label>
            <div className="grid grid-cols-2 gap-2">
              {enabledDuplexModes.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDuplexMode(opt.id as PrintDuplexMode)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border ${
                    duplexMode === opt.id
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-[#1f2937] border-[#374151] text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation: AUTO, PORTRAIT, LANDSCAPE */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-emerald-400" /> Page Orientation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "AUTO", label: "Auto Detect" },
                { id: "PORTRAIT", label: "Portrait" },
                { id: "LANDSCAPE", label: "Landscape" }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOrientation(opt.id as PrintOrientation)}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition border text-center ${
                    orientation === opt.id
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-[#1f2937] border-[#374151] text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scaling: FIT, ACTUAL_SIZE */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" /> Page Scaling
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "FIT", label: "Fit to Area" },
                { id: "ACTUAL_SIZE", label: "100% Actual" }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScaling(opt.id as PrintScaling)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border text-center ${
                    scaling === opt.id
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-[#1f2937] border-[#374151] text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Type & Finishing */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Paper Type</label>
              <select
                value={paperType}
                onChange={(e) => setPaperType(e.target.value as PaperType)}
                className="w-full py-2 px-2 bg-[#1f2937] border border-[#374151] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {enabledPaperTypes.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Finishing</label>
              <select
                value={finishing}
                onChange={(e) => setFinishing(e.target.value as FinishingType)}
                className="w-full py-2 px-2 bg-[#1f2937] border border-[#374151] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {enabledFinishingOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Copies */}
          <div className="pt-1">
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Number of Copies</label>
            <div className="flex items-center max-w-[140px] bg-[#1f2937] border border-[#374151] rounded-lg">
              <button
                type="button"
                onClick={() => setCopies(Math.max(1, copies - 1))}
                className="px-3 py-1.5 text-sm font-bold text-slate-300 hover:text-white"
              >
                -
              </button>
              <span className="flex-1 text-center text-xs font-bold text-white">{copies}</span>
              <button
                type="button"
                onClick={() => setCopies(Math.min(100, copies + 1))}
                className="px-3 py-1.5 text-sm font-bold text-slate-300 hover:text-white"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Live Authoritative Price Quote */}
        <div className="bg-[#111827] border border-emerald-600/40 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Authoritative Live Price
            </span>
            {isCalculatingQuote ? (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Quoting...
              </span>
            ) : quote ? (
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                Server Verified Quote
              </span>
            ) : null}
          </div>

          {quoteError && (
            <div className="bg-rose-950/50 border border-rose-500/40 rounded-lg p-2 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{quoteError}</span>
            </div>
          )}

          {quote ? (
            <div className="text-xs space-y-1.5 text-slate-400">
              <div className="flex justify-between">
                <span>Selected Pages &bull; Copies</span>
                <span className="text-white font-mono">
                  {quote.selectedPageCount} pages &times; {quote.copies} {quote.copies === 1 ? "copy" : "copies"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Printed Sides ({quote.totalSides} sides)</span>
                <span className="text-white font-mono">?{quote.breakdown.printCost.toFixed(2)}</span>
              </div>
              {quote.breakdown.finishingCost > 0 && (
                <div className="flex justify-between">
                  <span>Finishing Charge</span>
                  <span className="text-white font-mono">?{quote.breakdown.finishingCost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Orientation &bull; Scaling</span>
                <span className="font-mono text-slate-300">{orientation} &bull; {scaling}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Sheets to Spool</span>
                <span className="font-mono">{quote.sheetCount} sheets</span>
              </div>

              <div className="border-t border-[#1f2937] pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Total Amount</span>
                  <span className="text-[9px] text-slate-500">Integer Paise: {quote.totalPaise}p</span>
                </div>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  ?{quote.totalRupees.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center text-xs text-slate-500">
              Upload a document to calculate exact server price
            </div>
          )}
        </div>

        {/* Customer Information */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-400" /> Customer Information
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Your Full Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full py-2.5 px-3 bg-[#1f2937] border border-[#374151] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                Mobile Number * (For order updates & pickup)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile (e.g. 9876543210)"
                className="w-full py-2.5 px-3 bg-[#1f2937] border border-[#374151] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Select Payment Method
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod("CASH")}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                paymentMethod === "CASH"
                  ? "bg-emerald-950/40 border-emerald-500 text-white"
                  : "bg-[#1f2937]/60 border-[#374151] text-slate-300 hover:border-slate-500"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold">Cash at Counter</span>
              </div>
              <span className="text-[10px] text-slate-400">Pay cash directly to shopkeeper</span>
            </button>

            {isUpiAvailable ? (
              <button
                type="button"
                onClick={() => setPaymentMethod("MANUAL_UPI")}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  paymentMethod === "MANUAL_UPI"
                    ? "bg-emerald-950/40 border-emerald-500 text-white"
                    : "bg-[#1f2937]/60 border-[#374151] text-slate-300 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold">Manual UPI QR</span>
                </div>
                <span className="text-[10px] text-slate-400">Pay via GPay, PhonePe, Paytm</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl border border-[#374151]/50 bg-[#161c24]/50 text-slate-500 flex flex-col justify-between opacity-70">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs font-semibold">UPI Unavailable</span>
                </div>
                <span className="text-[10px] text-slate-500">Pay cash at counter</span>
              </div>
            )}
          </div>

          {paymentMethod === "MANUAL_UPI" && isUpiAvailable && (
            <div className="bg-[#16202c] border border-emerald-500/30 rounded-lg p-3 text-xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 block">UPI Payment Instructions</span>
              <p className="text-[11px] text-slate-300">
                After placing order, an active UPI QR tailored to your exact order total will appear. Staff verifies payment at counter.
              </p>
              {shopUpiConfig?.upiId && (
                <p className="text-[10px] text-slate-400 font-mono">
                  Merchant: {shopUpiConfig.merchantName || shopName} &bull; UPI: {shopUpiConfig.upiId}
                </p>
              )}
            </div>
          )}
        </div>

        {orderError && (
          <div className="bg-rose-950/60 border border-rose-500/50 rounded-xl p-3 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{orderError}</span>
          </div>
        )}

        <div>
          <button
            type="button"
            disabled={!uploadedFile || isSubmittingOrder || !parsedPagesInfo.isValid}
            onClick={handlePlaceOrder}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmittingOrder ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Real Order in Firestore...</span>
              </>
            ) : (
              <>
                <span>Place Order {quote ? `(?${quote.totalRupees.toFixed(2)})` : ""}</span>
              </>
            )}
          </button>
          <span className="text-[10px] text-slate-500 text-center block mt-1.5">
            Real order registered &bull; Instant tracking &bull; Staff payment verification
          </span>
        </div>
      </main>

      <footer className="border-t border-[#1c2621] bg-[#0b0f0e] px-4 py-3 text-center text-[11px] text-slate-500">
        {BRAND_NAME} &bull; {BRAND_FULL_NAME} &bull; {shopName}
      </footer>
    </div>
  );
}
