"use client";

import React, { useState, useEffect } from "react";
import {
  Tag,
  CheckCircle2,
  AlertCircle,
  Save,
  Calculator,
  RefreshCw,
  Layers,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase/config";
import { useAuth } from "../../../lib/firebase/auth-context";
import {
  PRIMARY_PILOT_SHOP,
  Service,
  PaperSizeConfig,
  FinishingConfig,
  PricingRule,
  ShopPricingSettings,
  PriceQuote,
  calculatePrintQuote,
  PriceQuoteInput
} from "@s2p/shared";

const DEFAULT_SERVICES: Service[] = [
  { id: `${PRIMARY_PILOT_SHOP.id}_document_print`, organizationId: PRIMARY_PILOT_SHOP.id, shopId: PRIMARY_PILOT_SHOP.id, code: "DOCUMENT_PRINT", name: "Document Print", description: "B&W and color prints", category: "PRINT", enabled: true, displayOrder: 1, publicVisible: true, createdAt: "", updatedAt: "" },
  { id: `${PRIMARY_PILOT_SHOP.id}_bw_print`, organizationId: PRIMARY_PILOT_SHOP.id, shopId: PRIMARY_PILOT_SHOP.id, code: "BW_PRINT", name: "Black & White Print", description: "High-speed laser B&W", category: "PRINT", enabled: true, displayOrder: 2, publicVisible: true, createdAt: "", updatedAt: "" },
  { id: `${PRIMARY_PILOT_SHOP.id}_color_print`, organizationId: PRIMARY_PILOT_SHOP.id, shopId: PRIMARY_PILOT_SHOP.id, code: "COLOR_PRINT", name: "Color Print", description: "Vibrant laser color", category: "PRINT", enabled: true, displayOrder: 3, publicVisible: true, createdAt: "", updatedAt: "" },
  { id: `${PRIMARY_PILOT_SHOP.id}_photo_print`, organizationId: PRIMARY_PILOT_SHOP.id, shopId: PRIMARY_PILOT_SHOP.id, code: "PHOTO_PRINT", name: "Photo Print", description: "Glossy photo stock", category: "PRINT", enabled: true, displayOrder: 4, publicVisible: true, createdAt: "", updatedAt: "" },
  { id: `${PRIMARY_PILOT_SHOP.id}_scan`, organizationId: PRIMARY_PILOT_SHOP.id, shopId: PRIMARY_PILOT_SHOP.id, code: "SCAN", name: "Scan to PDF", description: "Hi-res document scan", category: "SCAN", enabled: true, displayOrder: 5, publicVisible: true, createdAt: "", updatedAt: "" },
  { id: `${PRIMARY_PILOT_SHOP.id}_xerox_copy`, organizationId: PRIMARY_PILOT_SHOP.id, shopId: PRIMARY_PILOT_SHOP.id, code: "XEROX_COPY", name: "Photocopy / Xerox", description: "Walk-in photocopy", category: "COPY", enabled: true, displayOrder: 6, publicVisible: true, createdAt: "", updatedAt: "" },
  { id: `${PRIMARY_PILOT_SHOP.id}_spiral_binding`, organizationId: PRIMARY_PILOT_SHOP.id, shopId: PRIMARY_PILOT_SHOP.id, code: "SPIRAL_BINDING", name: "Spiral Binding", description: "Spiral plastic binding", category: "FINISHING", enabled: true, displayOrder: 7, publicVisible: true, createdAt: "", updatedAt: "" },
  { id: `${PRIMARY_PILOT_SHOP.id}_lamination`, organizationId: PRIMARY_PILOT_SHOP.id, shopId: PRIMARY_PILOT_SHOP.id, code: "LAMINATION", name: "Lamination", description: "Thermal pouch lamination", category: "FINISHING", enabled: true, displayOrder: 8, publicVisible: true, createdAt: "", updatedAt: "" },
];

const DEFAULT_PAPER_SIZES: PaperSizeConfig[] = [
  { code: "A4", displayName: "A4 Standard (210 × 297 mm)", widthMm: 210, heightMm: 297, enabled: true, displayOrder: 1 },
  { code: "A3", displayName: "A3 Large (297 × 420 mm)", widthMm: 297, heightMm: 420, enabled: true, displayOrder: 2 },
];

export default function DashboardPricingPage() {
  const { role, user } = useAuth();
  const isManager = role === "OWNER" || role === "MANAGER";

  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [rates, setRates] = useState({
    a4BwSingle: "2.00",
    a4BwDuplex: "1.50",
    a4ColorSingle: "10.00",
    a4ColorDuplex: "9.00",
    a3BwSingle: "10.00",
    a3BwDuplex: "7.50",
    a3ColorSingle: "25.00",
    a3ColorDuplex: "20.00",
    spiralBinding: "35.00",
    lamination: "20.00",
    minimumOrder: "5.00"
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Test Calculator State
  const [calcPages, setCalcPages] = useState<number>(10);
  const [calcPaperSize, setCalcPaperSize] = useState<string>("A4");
  const [calcPrintMode, setCalcPrintMode] = useState<"BW" | "COLOR">("BW");
  const [calcSideMode, setCalcSideMode] = useState<"SINGLE" | "DUPLEX">("DUPLEX");
  const [calcCopies, setCalcCopies] = useState<number>(2);
  const [calcFinishing, setCalcFinishing] = useState<string>("SPIRAL_BINDING");
  const [quoteResult, setQuoteResult] = useState<PriceQuote | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const shopId = PRIMARY_PILOT_SHOP.id;
        const sQuery = query(collection(db, "services"), where("shopId", "==", shopId));
        const sSnap = await getDocs(sQuery);
        if (!sSnap.empty) {
          const loaded = sSnap.docs.map(d => d.data() as Service);
          setServices(loaded.sort((a, b) => a.displayOrder - b.displayOrder));
        }

        const setSnap = await getDoc(doc(db, "shopPricingSettings", shopId));
        if (setSnap.exists()) {
          const sData = setSnap.data() as ShopPricingSettings;
          if (sData.minimumOrderPaise) {
            setRates(prev => ({ ...prev, minimumOrder: (sData.minimumOrderPaise / 100).toFixed(2) }));
          }
        }
      } catch (err) {
        console.warn("[S2P Pricing] Loaded default dev pricing:", err);
      }
    }
    loadData();
  }, []);

  const handleToggleService = (code: string) => {
    if (!isManager) return;
    setServices(prev => prev.map(s => s.code === code ? { ...s, enabled: !s.enabled } : s));
  };

  const getRules = (): PricingRule[] => {
    const shopId = PRIMARY_PILOT_SHOP.id;
    const toPaise = (v: string) => Math.max(0, Math.round((parseFloat(v) || 0) * 100));
    const now = new Date().toISOString();

    return [
      { id: `${shopId}_a4_bw_single`, organizationId: shopId, shopId, serviceCode: "BW_PRINT", paperSizeCode: "A4", printMode: "BW", sideMode: "SINGLE", billingUnit: "PER_PRINTED_SIDE", unitPricePaise: toPaise(rates.a4BwSingle), quantityTiers: [{ minUnits: 1, maxUnits: 20, unitPricePaise: toPaise(rates.a4BwSingle) }, { minUnits: 21, unitPricePaise: Math.round(toPaise(rates.a4BwSingle) * 0.8) }], enabled: true, createdAt: now, updatedAt: now },
      { id: `${shopId}_a4_bw_duplex`, organizationId: shopId, shopId, serviceCode: "BW_PRINT", paperSizeCode: "A4", printMode: "BW", sideMode: "DUPLEX", billingUnit: "PER_PRINTED_SIDE", unitPricePaise: toPaise(rates.a4BwDuplex), enabled: true, createdAt: now, updatedAt: now },
      { id: `${shopId}_a4_color_single`, organizationId: shopId, shopId, serviceCode: "COLOR_PRINT", paperSizeCode: "A4", printMode: "COLOR", sideMode: "SINGLE", billingUnit: "PER_PRINTED_SIDE", unitPricePaise: toPaise(rates.a4ColorSingle), enabled: true, createdAt: now, updatedAt: now },
      { id: `${shopId}_a4_color_duplex`, organizationId: shopId, shopId, serviceCode: "COLOR_PRINT", paperSizeCode: "A4", printMode: "COLOR", sideMode: "DUPLEX", billingUnit: "PER_PRINTED_SIDE", unitPricePaise: toPaise(rates.a4ColorDuplex), enabled: true, createdAt: now, updatedAt: now },
      { id: `${shopId}_a3_bw_single`, organizationId: shopId, shopId, serviceCode: "BW_PRINT", paperSizeCode: "A3", printMode: "BW", sideMode: "SINGLE", billingUnit: "PER_PRINTED_SIDE", unitPricePaise: toPaise(rates.a3BwSingle), enabled: true, createdAt: now, updatedAt: now },
      { id: `${shopId}_a3_bw_duplex`, organizationId: shopId, shopId, serviceCode: "BW_PRINT", paperSizeCode: "A3", printMode: "BW", sideMode: "DUPLEX", billingUnit: "PER_PRINTED_SIDE", unitPricePaise: toPaise(rates.a3BwDuplex), enabled: true, createdAt: now, updatedAt: now },
      { id: `${shopId}_a3_color_single`, organizationId: shopId, shopId, serviceCode: "COLOR_PRINT", paperSizeCode: "A3", printMode: "COLOR", sideMode: "SINGLE", billingUnit: "PER_PRINTED_SIDE", unitPricePaise: toPaise(rates.a3ColorSingle), enabled: true, createdAt: now, updatedAt: now },
      { id: `${shopId}_a3_color_duplex`, organizationId: shopId, shopId, serviceCode: "COLOR_PRINT", paperSizeCode: "A3", printMode: "COLOR", sideMode: "DUPLEX", billingUnit: "PER_PRINTED_SIDE", unitPricePaise: toPaise(rates.a3ColorDuplex), enabled: true, createdAt: now, updatedAt: now },
    ];
  };

  const handleSaveRates = async () => {
    if (!isManager) {
      setSaveError("Permission Denied: Only shop Owner and Manager can modify pricing.");
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const shopId = PRIMARY_PILOT_SHOP.id;
      const now = new Date().toISOString();
      const toPaise = (v: string) => Math.max(0, Math.round((parseFloat(v) || 0) * 100));

      for (const s of services) {
        await setDoc(doc(db, "services", s.id), { ...s, updatedAt: now });
      }

      for (const r of getRules()) {
        await setDoc(doc(db, "pricingRules", r.id), { ...r, createdBy: user?.uid || "owner", updatedAt: now });
      }

      await setDoc(doc(db, "shopPricingSettings", shopId), {
        shopId,
        organizationId: shopId,
        minimumOrderPaise: toPaise(rates.minimumOrder),
        taxEnabled: false,
        taxName: "GST",
        taxRateBasisPoints: 0,
        pricesIncludeTax: false,
        currency: "INR",
        updatedAt: now
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to persist to Firestore");
    } finally {
      setSaving(false);
    }
  };

  const handleTestCalculation = () => {
    setCalcError(null);
    setQuoteResult(null);

    try {
      const shopId = PRIMARY_PILOT_SHOP.id;
      const toPaise = (v: string) => Math.max(0, Math.round((parseFloat(v) || 0) * 100));

      const input: PriceQuoteInput = {
        shopId,
        serviceCode: calcPrintMode === "BW" ? "BW_PRINT" : "COLOR_PRINT",
        totalDocumentPages: Number(calcPages) || 1,
        paperSize: calcPaperSize,
        printMode: calcPrintMode,
        sideMode: calcSideMode,
        copies: Number(calcCopies) || 1,
        finishingOptions: calcFinishing !== "NONE" ? [calcFinishing] : []
      };

      const finishConfigs: FinishingConfig[] = [
        { code: "NONE", name: "No Finishing", enabled: true, pricingType: "FIXED", fixedPricePaise: 0 },
        { code: "SPIRAL_BINDING", name: "Spiral Binding", enabled: true, pricingType: "FIXED_PER_COPY", fixedPricePaise: toPaise(rates.spiralBinding) },
        { code: "LAMINATION", name: "Thermal Lamination", enabled: true, pricingType: "PER_SHEET", fixedPricePaise: toPaise(rates.lamination), perUnitChargePaise: toPaise(rates.lamination) }
      ];

      const quote = calculatePrintQuote(input, {
        services,
        paperSizes: DEFAULT_PAPER_SIZES,
        finishingOptions: finishConfigs,
        pricingRules: getRules(),
        shopSettings: {
          shopId,
          organizationId: shopId,
          minimumOrderPaise: toPaise(rates.minimumOrder),
          taxEnabled: false,
          taxRateBasisPoints: 0,
          pricesIncludeTax: false,
          currency: "INR",
          updatedAt: new Date().toISOString()
        }
      });

      setQuoteResult(quote);
    } catch (err: unknown) {
      setCalcError(err instanceof Error ? err.message : "Price calculation error");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Header Banner */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Shop Pricing Engine &amp; Service Catalog
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Authoritative Integer Paise Engine for <strong className="text-emerald-400">{PRIMARY_PILOT_SHOP.name}</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161e1b] border border-[#24322c] text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300">
              Role: <strong className="text-emerald-400">{role || "STAFF"}</strong>
            </span>
          </div>

          {isManager && (
            <button
              onClick={handleSaveRates}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-950/60 transition flex items-center gap-2"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? "Saving..." : "Save Rates to Firestore"}</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Pricing rules and services updated in Firestore successfully!</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Services List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Configurable Services</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {services.map(s => (
            <div
              key={s.code}
              className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                s.enabled ? "bg-[#111827] border-[#1f2937]" : "bg-[#0d121c]/60 border-slate-800/60 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161e1b] text-emerald-400 border border-emerald-500/20">
                    {s.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleService(s.code)}
                    disabled={!isManager}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      s.enabled ? "bg-emerald-600" : "bg-slate-700"
                    } ${!isManager ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${s.enabled ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>
                <h3 className="text-sm font-bold text-white">{s.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.description}</p>
              </div>
              <div className="mt-4 pt-2 border-t border-[#1c2621] flex items-center justify-between text-[11px]">
                <span className="text-slate-500 uppercase tracking-wider">{s.category}</span>
                <span className={`font-semibold ${s.enabled ? "text-emerald-400" : "text-slate-500"}`}>
                  {s.enabled ? "Active" : "Disabled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rate Tables */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-400" />
          <span>Authoritative Rate Cards (Rupees ₹)</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {/* A4 Rates */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white border-b border-[#1f2937] pb-2 flex justify-between">
              <span>A4 Standard Paper</span>
              <span className="text-[10px] text-emerald-400 font-mono">210 × 297 mm</span>
            </h3>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">B&amp;W Single (₹/side)</label>
              <input type="number" step="0.10" disabled={!isManager} value={rates.a4BwSingle} onChange={e => setRates({ ...rates, a4BwSingle: e.target.value })} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">B&amp;W Duplex (₹/side)</label>
              <input type="number" step="0.10" disabled={!isManager} value={rates.a4BwDuplex} onChange={e => setRates({ ...rates, a4BwDuplex: e.target.value })} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Color Single (₹/side)</label>
              <input type="number" step="0.50" disabled={!isManager} value={rates.a4ColorSingle} onChange={e => setRates({ ...rates, a4ColorSingle: e.target.value })} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Color Duplex (₹/side)</label>
              <input type="number" step="0.50" disabled={!isManager} value={rates.a4ColorDuplex} onChange={e => setRates({ ...rates, a4ColorDuplex: e.target.value })} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
          </div>

          {/* A3 Rates */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white border-b border-[#1f2937] pb-2 flex justify-between">
              <span>A3 Large Paper</span>
              <span className="text-[10px] text-emerald-400 font-mono">297 × 420 mm</span>
            </h3>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">B&amp;W Single (₹/side)</label>
              <input type="number" step="0.50" disabled={!isManager} value={rates.a3BwSingle} onChange={e => setRates({ ...rates, a3BwSingle: e.target.value })} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">B&amp;W Duplex (₹/side)</label>
              <input type="number" step="0.50" disabled={!isManager} value={rates.a3BwDuplex} onChange={e => setRates({ ...rates, a3BwDuplex: e.target.value })} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Color Single (₹/side)</label>
              <input type="number" step="1.00" disabled={!isManager} value={rates.a3ColorSingle} onChange={e => setRates({ ...rates, a3ColorSingle: e.target.value })} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Color Duplex (₹/side)</label>
              <input type="number" step="1.00" disabled={!isManager} value={rates.a3ColorDuplex} onChange={e => setRates({ ...rates, a3ColorDuplex: e.target.value })} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
          </div>

          {/* Finishing & Minimum */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white border-b border-[#1f2937] pb-2 flex justify-between">
              <span>Finishing &amp; Settings</span>
              <span className="text-[10px] text-emerald-400 font-mono">Store Defaults</span>
            </h3>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Spiral Binding (₹/copy)</label>
              <input type="number" step="1.00" disabled={!isManager} value={rates.spiralBinding} onChange={e => setRates({ ...rates, spiralBinding: e.target.value })} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Lamination (₹/sheet)</label>
              <input type="number" step="1.00" disabled={!isManager} value={rates.lamination} onChange={e => setRates({ ...rates, lamination: e.target.value })} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Minimum Order (₹)</label>
              <input type="number" step="1.00" disabled={!isManager} value={rates.minimumOrder} onChange={e => setRates({ ...rates, minimumOrder: e.target.value })} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-1.5 text-xs text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive TEST PRICE Section */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1f2937] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Interactive Price Calculator / Tester</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Authoritative Pure Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tests the exact server pricing breakdown, sides, sheets, and quantity tiers.
              </p>
            </div>
          </div>

          <button
            onClick={handleTestCalculation}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide shadow-md transition flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Calculate Live Quote</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Doc Pages</label>
            <input type="number" min="1" max="1000" value={calcPages} onChange={e => setCalcPages(parseInt(e.target.value, 10) || 1)} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-2 text-xs text-white" />
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Paper Size</label>
            <select value={calcPaperSize} onChange={e => setCalcPaperSize(e.target.value)} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-2 text-xs text-white">
              <option value="A4">A4 Standard</option>
              <option value="A3">A3 Large</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Print Mode</label>
            <select value={calcPrintMode} onChange={e => setCalcPrintMode(e.target.value as "BW" | "COLOR")} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-2 text-xs text-white">
              <option value="BW">Black &amp; White</option>
              <option value="COLOR">Full Color</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Side Mode</label>
            <select value={calcSideMode} onChange={e => setCalcSideMode(e.target.value as "SINGLE" | "DUPLEX")} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-2 text-xs text-white">
              <option value="SINGLE">Single-Sided</option>
              <option value="DUPLEX">Double-Sided (Duplex)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Copies</label>
            <input type="number" min="1" max="500" value={calcCopies} onChange={e => setCalcCopies(parseInt(e.target.value, 10) || 1)} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-2 text-xs text-white" />
          </div>

          <div>
            <label className="block text-[11px] text-slate-300 mb-1">Finishing</label>
            <select value={calcFinishing} onChange={e => setCalcFinishing(e.target.value)} className="w-full bg-[#161e1b] border border-[#24322c] rounded-lg px-3 py-2 text-xs text-white">
              <option value="NONE">None</option>
              <option value="SPIRAL_BINDING">Spiral Binding</option>
              <option value="LAMINATION">Lamination</option>
            </select>
          </div>
        </div>

        {calcError && (
          <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Calculation Error: {calcError}</span>
          </div>
        )}

        {quoteResult && (
          <div className="mt-6 pt-6 border-t border-[#1f2937] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141d18] border border-[#1f2937] p-4 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Quote ID</span>
                <span className="font-mono text-emerald-400 font-bold">{quoteResult.quoteId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Printed Sides</span>
                <span className="font-bold text-white">{quoteResult.printedSides} sides</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Physical Sheets</span>
                <span className="font-bold text-white">{quoteResult.estimatedSheets} sheets</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Valid For</span>
                <span className="text-amber-400 font-mono text-[11px]">15 minutes</span>
              </div>
            </div>

            <div className="border border-[#1f2937] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161e1b] text-slate-400 text-[11px] uppercase border-b border-[#1f2937]">
                  <tr>
                    <th className="py-2.5 px-4">Line Item</th>
                    <th className="py-2.5 px-4">Notes</th>
                    <th className="py-2.5 px-4 text-right">Quantity</th>
                    <th className="py-2.5 px-4 text-right">Rate</th>
                    <th className="py-2.5 px-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2621]">
                  {quoteResult.lineItems.map(item => (
                    <tr key={item.code} className="hover:bg-[#161e1b]/40">
                      <td className="py-3 px-4 font-bold text-white">{item.name}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{item.calculationNotes}</td>
                      <td className="py-3 px-4 text-right text-slate-300 font-mono">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-300 font-mono">₹{(item.unitPricePaise / 100).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-bold text-white font-mono">₹{(item.totalPaise / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#141d18] border-t border-[#1f2937] font-semibold text-xs">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-4 text-slate-400 text-right">Subtotal:</td>
                    <td className="py-2.5 px-4 text-right text-white font-mono">₹{(quoteResult.subtotalPaise / 100).toFixed(2)}</td>
                  </tr>
                  <tr className="border-t border-[#1f2937] text-sm font-extrabold">
                    <td colSpan={4} className="py-3 px-4 text-emerald-400 text-right uppercase">Total:</td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-mono text-base">₹{(quoteResult.totalPaise / 100).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
