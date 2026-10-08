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
  MultiUpLayoutMode
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
  CreditCard,
  FileQuestion
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
  const [, setIsFrontBackSwapped] = useState<boolean>(false);

  // Page Selection
  const [pageSelectionType, setPageSelectionType] = useState<"ALL" | "CUSTOM">("ALL");
  const [customPageRange, setCustomPageRange] = useState<string>("");

  // Customer Contact & Payment
  const [customerName, setCustomerName] = useState<string>("");
  const [customerMobile, setCustomerMobile] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "MANUAL_UPI" | "ONLINE_GATEWAY">("CASH");

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
        if (!res.ok || !data.success || !data.file) {
          throw new Error(data.error || `Failed to process ${f.name}.`);
        }

        newRecords.push({
          id: data.file.id,
          safeDisplayName: data.file.safeDisplayName || f.name,
          mimeType: data.file.mimeType,
          sizeBytes: data.file.sizeBytes,
          sha256: data.file.sha256,
          pageCount: data.file.pageCount || 1,
          processingStatus: data.file.processingStatus,
          sortOrder: uploadedFiles.length + i
        });
      }

      const all = [...uploadedFiles, ...newRecords];
      setUploadedFiles(all);
      setUploadedFile(all[0]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload processing failed.";
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
        throw new Error(data.error || "Failed to delete file from cloud storage.");
      }

      const remaining = uploadedFiles.filter(f => f.id !== targetFileId);
      setUploadedFiles(remaining);
      setUploadedFile(remaining.length > 0 ? remaining[0] : null);
      if (remaining.length === 0) setQuote(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove file.";
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
      if (res.status === 409 || data.error === "PRICE_CHANGED") {
        setQuote(null);
        setOrderError(`Pricing updated: ${data.message || "Pricing changed since quote was calculated."} Please verify the updated quote and place order again.`);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Customer Header */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3 sticky top-0 z-50 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-lg text-white tracking-wider shadow-sm">
              {BRAND_NAME}
            </div>
            <div>
              <div className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase leading-none">
                {BRAND_FULL_NAME}
              </div>
              <h1 className="text-sm font-extrabold text-slate-900 leading-tight">
                {shopName}
              </h1>
              <div className="text-[10px] text-slate-500">
                Self-Service Kiosk &bull; Guntur, AP
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition"
            title="Return to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto w-full px-4 py-6 flex-1 space-y-5">
        {/* Zero-Trace Privacy Architecture */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-900 text-xs block">
                Zero-Trace Privacy Architecture
              </span>
              <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                Your uploaded documents are strictly private and automatically deleted after printing. Zero public links.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Customer Print Modes */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Select Print Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCustomerMode("DOCUMENTS")}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                customerMode === "DOCUMENTS"
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-900/10"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <FileText className={`w-4 h-4 ${customerMode === "DOCUMENTS" ? "text-white" : "text-emerald-600"}`} />
              <span className="text-[11px] font-extrabold">DOCUMENTS</span>
              <span className={`text-[9px] leading-none ${customerMode === "DOCUMENTS" ? "text-emerald-100" : "text-slate-400"}`}>
                PDF / Scans
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCustomerMode("IMAGES")}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                customerMode === "IMAGES"
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-900/10"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <ImageIcon className={`w-4 h-4 ${customerMode === "IMAGES" ? "text-white" : "text-emerald-600"}`} />
              <span className="text-[11px] font-extrabold">IMAGES</span>
              <span className={`text-[9px] leading-none ${customerMode === "IMAGES" ? "text-emerald-100" : "text-slate-400"}`}>
                1, 4, 10+ Photos
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCustomerMode("CARDS")}
              className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                customerMode === "CARDS"
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-900/10"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <CreditCard className={`w-4 h-4 ${customerMode === "CARDS" ? "text-white" : "text-emerald-600"}`} />
              <span className="text-[11px] font-extrabold">CARDS</span>
              <span className={`text-[9px] leading-none ${customerMode === "CARDS" ? "text-emerald-100" : "text-slate-400"}`}>
                Front &amp; Back
              </span>
            </button>
          </div>
        </div>

        {/* Upload Box */}
        <div className="bg-white border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 text-center space-y-3 transition shadow-xs">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.pptx,application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="hidden"
            id="file-upload-input"
          />

          {!uploadedFile ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {isUploading ? "Validating & Persisting to Private Cloud..." : "Upload Document or Image"}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Supports PDF, JPG, PNG, WEBP, Word (.docx), PowerPoint (.pptx) (Max 50MB)
                </p>
              </div>

              {/* Guidance for Word / PowerPoint files */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-lg p-2.5 text-emerald-950 text-[11px] flex items-start gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-emerald-950">Word &amp; PowerPoint फ़ाइलें (.docx / .pptx)</span>
                  <span className="text-emerald-800 text-[10px] leading-tight block mt-0.5">
                    सिस्टम आपकी Word / PPT फ़ाइल को सुरक्षित रूप से सटीक प्रिंट-रेडी PDF में बदलकर तैयार कर देता है।
                  </span>
                </div>
              </div>

              {uploadError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-rose-700 text-xs flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                <span className="text-[10px] text-slate-400 block mt-1.5">
                  Private Cloud Storage &bull; Server Verified Pages &bull; Zero Public URLs
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-left">
              <div className="flex items-start justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 truncate max-w-[210px]">
                      {uploadedFile.safeDisplayName}
                    </h3>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap gap-2">
                      <span>{(uploadedFile.sizeBytes / 1024).toFixed(1)} KB</span>
                      <span>&bull;</span>
                      <span className="text-emerald-700 font-semibold">
                        {uploadedFile.pageCount} {uploadedFile.pageCount === 1 ? "Page" : "Pages"} (Server Verified)
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[190px]">SHA256: {uploadedFile.sha256}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleRemoveFile}
                  className="text-slate-400 hover:text-rose-600 p-1 transition disabled:opacity-50"
                  title="Remove file"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              {uploadError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] px-1 text-slate-500">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ready for Configuration
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-emerald-600 hover:underline text-[10px] font-semibold"
                >
                  Replace File
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Review List */}
        {uploadedFiles.length > 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 text-left shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {uploadedFiles.length} Files Uploaded ({estimatedSheetCount} Sheets)
              </span>
              <button
                type="button"
                onClick={applySettingsToAll}
                className="text-[10px] text-emerald-600 hover:underline font-semibold"
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
                      ? "bg-emerald-50 border-emerald-400"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[9px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate max-w-[170px]">{f.safeDisplayName}</div>
                      <div className="text-[9px] text-slate-500">{(f.sizeBytes / 1024).toFixed(0)} KB &bull; {f.pageCount}p &bull; ✓ Ready</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveFileOrder(idx, "UP"); }}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); moveFileOrder(idx, "DOWN"); }}
                      disabled={idx === uploadedFiles.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
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
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-emerald-600" /> Multi-Image Sheet Layout
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 font-mono">
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
                  className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition border cursor-pointer ${
                    multiUpLayout === layout.id
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
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
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Card Print Layout
              </label>
              <button
                type="button"
                onClick={() => setIsFrontBackSwapped((prev) => !prev)}
                className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Swap Front &amp; Back
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLayoutMode("SMALL_CARD")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  layoutMode === "SMALL_CARD"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Small Card (85.6 &times; 54 mm)
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("LARGE_CARD")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  layoutMode === "LARGE_CARD"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Large Card (135 &times; 90 mm)
              </button>
            </div>
          </div>
        )}

        {/* Page Selection */}
        {uploadedFile && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" /> Page Selection
              </label>
              <span className="text-[11px] font-semibold text-emerald-700">
                Selected: {parsedPagesInfo.count} of {uploadedFile.pageCount} pages
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPageSelectionType("ALL")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  pageSelectionType === "ALL"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                All Pages (1-{uploadedFile.pageCount})
              </button>
              <button
                type="button"
                onClick={() => setPageSelectionType("CUSTOM")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  pageSelectionType === "CUSTOM"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
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
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                {!parsedPagesInfo.isValid && (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {parsedPagesInfo.error}
                  </p>
                )}
                <span className="text-[10px] text-slate-500 block">
                  Format: comma-separated or hyphens. Example: 1-3, 5, 7-10.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Print Settings (Canonical Shop Config from Firestore) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-emerald-600" /> Print Settings
            </h3>
            <span className="text-[11px] text-slate-500">{shopName}</span>
          </div>

          {/* Paper Size */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">Paper Size</label>
            <div className="grid grid-cols-2 gap-2">
              {enabledPaperSizes.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaperSize(opt.id as PaperSize)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                    paperSize === opt.id
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Mode */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">Color Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {enabledColorModes.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setColorMode(opt.id as PrintColorMode)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                    colorMode === opt.id
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sides / Duplex */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">Sides</label>
            <div className="grid grid-cols-2 gap-2">
              {enabledDuplexModes.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDuplexMode(opt.id as PrintDuplexMode)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                    duplexMode === opt.id
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1.5 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-emerald-600" /> Page Orientation
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
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition border text-center cursor-pointer ${
                    orientation === opt.id
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scaling */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1.5 flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-emerald-600" /> Page Scaling
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
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition border text-center cursor-pointer ${
                    scaling === opt.id
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
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
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Paper Type</label>
              <select
                value={paperType}
                onChange={(e) => setPaperType(e.target.value as PaperType)}
                className="w-full py-2 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                {enabledPaperTypes.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Finishing</label>
              <select
                value={finishing}
                onChange={(e) => setFinishing(e.target.value as FinishingType)}
                className="w-full py-2 px-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
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
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Number of Copies</label>
            <div className="flex items-center max-w-[140px] bg-slate-50 border border-slate-300 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setCopies(Math.max(1, copies - 1))}
                className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
              >
                -
              </button>
              <span className="flex-1 text-center text-xs font-bold text-slate-900 font-mono">{copies}</span>
              <button
                type="button"
                onClick={() => setCopies(Math.min(100, copies + 1))}
                className="px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Live Authoritative Price Quote */}
        <div className="bg-emerald-50/60 border-2 border-emerald-500/40 rounded-xl p-4 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Authoritative Live Price
            </span>
            {isCalculatingQuote ? (
              <span className="text-[10px] text-emerald-700 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Quoting...
              </span>
            ) : quote ? (
              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-mono font-bold shadow-xs">
                Server Verified Quote
              </span>
            ) : null}
          </div>

          {quoteError && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{quoteError}</span>
            </div>
          )}

          {quote ? (
            <div className="text-xs space-y-1.5 text-slate-600 pt-1">
              <div className="flex justify-between">
                <span>Selected Pages &bull; Copies</span>
                <span className="text-slate-900 font-mono font-medium">
                  {quote.selectedPageCount} pages &times; {quote.copies} {quote.copies === 1 ? "copy" : "copies"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Printed Sides ({quote.totalSides} sides)</span>
                <span className="text-slate-900 font-mono">₹{quote.breakdown.printCost.toFixed(2)}</span>
              </div>
              {quote.breakdown.finishingCost > 0 && (
                <div className="flex justify-between">
                  <span>Finishing Charge</span>
                  <span className="text-slate-900 font-mono">₹{quote.breakdown.finishingCost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Orientation &bull; Scaling</span>
                <span className="font-mono text-slate-700">{orientation} &bull; {scaling}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Sheets to Spool</span>
                <span className="font-mono">{quote.sheetCount} sheets</span>
              </div>

              <div className="border-t border-emerald-200/80 pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Total Amount</span>
                  <span className="text-[9px] text-slate-500 font-mono">Integer Paise: {quote.totalPaise}p</span>
                </div>
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  ₹{quote.totalRupees.toFixed(2)}
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
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600" /> Customer Information
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Your Full Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Mobile Number * (For order updates & pickup)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile (e.g. 9876543210)"
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-emerald-600 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Payment Method Selection (Cash, UPI QR, Online Razorpay) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Select Payment Method
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod("CASH")}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                paymentMethod === "CASH"
                  ? "bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">Counter Cash</span>
              </div>
              <span className="text-[10px] text-slate-500">Pay cash directly at shop</span>
            </button>

            {isUpiAvailable ? (
              <button
                type="button"
                onClick={() => setPaymentMethod("MANUAL_UPI")}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  paymentMethod === "MANUAL_UPI"
                    ? "bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold">Counter UPI QR</span>
                </div>
                <span className="text-[10px] text-slate-500">Scan &amp; pay via UPI App</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 flex flex-col justify-between opacity-70">
                <div className="flex items-center gap-2 mb-1.5">
                  <QrCode className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold">UPI Unavailable</span>
                </div>
                <span className="text-[10px] text-slate-400">Pay cash at counter</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setPaymentMethod("ONLINE_GATEWAY")}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                paymentMethod === "ONLINE_GATEWAY"
                  ? "bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">Online Gateway</span>
              </div>
              <span className="text-[10px] text-slate-500">Razorpay / UPI / Cards</span>
            </button>
          </div>

          {paymentMethod === "MANUAL_UPI" && isUpiAvailable && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 text-xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-900 block">UPI Payment Instructions</span>
              <p className="text-[11px] text-slate-700">
                After placing order, an active UPI QR tailored to your exact order total will appear. Staff verifies payment at counter.
              </p>
              {shopUpiConfig?.upiId && (
                <p className="text-[10px] text-slate-500 font-mono">
                  Merchant: {shopUpiConfig.merchantName || shopName} &bull; UPI: {shopUpiConfig.upiId}
                </p>
              )}
            </div>
          )}

          {paymentMethod === "ONLINE_GATEWAY" && (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 text-xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-900 block">Razorpay Instant Online Payment</span>
              <p className="text-[11px] text-slate-700">
                Place order to open the secure Razorpay payment modal with Instant UPI, Cards, and Netbanking support.
              </p>
            </div>
          )}
        </div>

        {orderError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{orderError}</span>
          </div>
        )}

        <div>
          <button
            type="button"
            disabled={!uploadedFile || isSubmittingOrder || !parsedPagesInfo.isValid}
            onClick={handlePlaceOrder}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmittingOrder ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registering Order...</span>
              </>
            ) : (
              <>
                <span>Place Order {quote ? `(₹${quote.totalRupees.toFixed(2)})` : ""}</span>
              </>
            )}
          </button>
          <span className="text-[10px] text-slate-500 text-center block mt-1.5">
            Real order registered &bull; Instant tracking &bull; Shakeel Online Services
          </span>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-[11px] text-slate-500">
        {BRAND_NAME} &bull; {BRAND_FULL_NAME} &bull; {shopName}
      </footer>
    </div>
  );
}
