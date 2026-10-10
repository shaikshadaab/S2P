"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutGrid,
  FileText,
  Images,
  UserCheck,
  FileBadge,
  ScanLine,
  CreditCard,
  Layers,
  FileType,
  Copy,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Save,
  Printer,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Loader2,
  Tag,
  Settings2,
  Sliders,
  Sun,
  ShieldAlert,
  Info,
  Check,
  XCircle
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase/config";
import { useAuth } from "../../../lib/firebase/auth-context";
import { PRIMARY_PILOT_SHOP } from "@s2p/shared";

interface ServiceItemConfig {
  id: string;
  name: string;
  category: "DOCUMENT" | "PHOTO" | "UTILITY";
  enabled: boolean;
  rateLabel: string;
  unitPricePaise: number;
  billingUnit: string;
  mappedPrinter: string;
  calibrationState: "READY" | "NEEDS_CALIBRATION" | "AWAITING_HARDWARE" | "CONFIRMED";
  notes: string;
}

const INITIAL_SERVICE_CONFIGS: ServiceItemConfig[] = [
  {
    id: "doc_bw",
    name: "A4 Black & White Document",
    category: "DOCUMENT",
    enabled: true,
    rateLabel: "₹2.00 / printed side",
    unitPricePaise: 200,
    billingUnit: "per printed side",
    mappedPrinter: "HP Smart Tank (B&W)",
    calibrationState: "CONFIRMED",
    notes: "Laser/Inkjet B&W. Duplex charged at ₹3.00 (300 paise) per output sheet."
  },
  {
    id: "doc_duplex",
    name: "A4 B&W Duplex Sheet",
    category: "DOCUMENT",
    enabled: true,
    rateLabel: "₹3.00 / output sheet",
    unitPricePaise: 300,
    billingUnit: "per output sheet",
    mappedPrinter: "HP Smart Tank (Duplex)",
    calibrationState: "CONFIRMED",
    notes: "Both sides printed on one physical sheet. Two separate 3-page files require 4 sheets total."
  },
  {
    id: "doc_color",
    name: "A4 Full Colour Document",
    category: "DOCUMENT",
    enabled: true,
    rateLabel: "₹10.00 / printed side",
    unitPricePaise: 1000,
    billingUnit: "per printed side",
    mappedPrinter: "HP Smart Tank (Color)",
    calibrationState: "CONFIRMED",
    notes: "Vibrant laser or inkjet colour printing."
  },
  {
    id: "photo_passport",
    name: "Passport Photos (8x Set)",
    category: "PHOTO",
    enabled: true,
    rateLabel: "₹100.00 / 8-photo sheet",
    unitPricePaise: 10000,
    billingUnit: "per 8-photo sheet",
    mappedPrinter: "HP Smart Tank (Glossy Photo)",
    calibrationState: "CONFIRMED",
    notes: "Indian Passport standard 35x45mm repeats on glossy paper with precise cut guides."
  },
  {
    id: "photo_a4",
    name: "Full A4 Glossy Photo Sheet",
    category: "PHOTO",
    enabled: true,
    rateLabel: "₹40.00 / photo sheet",
    unitPricePaise: 4000,
    billingUnit: "per photo sheet",
    mappedPrinter: "HP Smart Tank (Glossy Photo)",
    calibrationState: "CONFIRMED",
    notes: "Edge-to-edge glossy print for certificates, portraits, or high-res photography."
  },
  {
    id: "doc_resume",
    name: "6-Template Professional Resume",
    category: "DOCUMENT",
    enabled: true,
    rateLabel: "Standard Document Rate (₹2-₹10)",
    unitPricePaise: 200,
    billingUnit: "per printed page",
    mappedPrinter: "HP Smart Tank (B&W)",
    calibrationState: "CONFIRMED",
    notes: "PDF generator with 6 ATS-friendly layout engines."
  },
  {
    id: "util_scan",
    name: "Camera Document Scanner to PDF",
    category: "UTILITY",
    enabled: true,
    rateLabel: "Free digital scan / Standard Print Rate",
    unitPricePaise: 200,
    billingUnit: "per scanned page",
    mappedPrinter: "HP Smart Tank (B&W)",
    calibrationState: "CONFIRMED",
    notes: "Phone camera capture with perspective boundary rectification."
  },
  {
    id: "util_id_card",
    name: "ID Card Front & Back (CR80 Copy)",
    category: "UTILITY",
    enabled: true,
    rateLabel: "₹5.00 / printed composite",
    unitPricePaise: 500,
    billingUnit: "per composite page",
    mappedPrinter: "HP Smart Tank (B&W)",
    calibrationState: "CONFIRMED",
    notes: "Standard 85.6x54mm ID alignment on single A4 sheet."
  },
  {
    id: "doc_office",
    name: "Word / PowerPoint Document Printing",
    category: "DOCUMENT",
    enabled: true,
    rateLabel: "Standard Document Rate (₹2-₹10)",
    unitPricePaise: 200,
    billingUnit: "per printed page",
    mappedPrinter: "HP Smart Tank (B&W)",
    calibrationState: "CONFIRMED",
    notes: "Server-side OpenXML conversion for .docx and .pptx."
  },
  {
    id: "doc_xerox",
    name: "Staff-Assisted Counter Xerox",
    category: "DOCUMENT",
    enabled: true,
    rateLabel: "₹2.00 / copy",
    unitPricePaise: 200,
    billingUnit: "per physical copy",
    mappedPrinter: "HP Smart Tank (B&W)",
    calibrationState: "CONFIRMED",
    notes: "Assisted counter photocopying workflow."
  }
];

export default function DashboardServicesPage() {
  const { user, role } = useAuth();
  const isManager = role === "OWNER" || role === "MANAGER";

  const [activeTab, setActiveTab] = useState<"SERVICES" | "IMAGE_PROCESSING">("SERVICES");

  const [configs, setConfigs] = useState<ServiceItemConfig[]>(INITIAL_SERVICE_CONFIGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Image Processing Owner Settings
  const [imgSettings, setImgSettings] = useState({
    autoEnhanceEnabled: true,
    defaultMode: "COLOR_ENHANCED", // 'COLOR_ENHANCED' | 'GRAYSCALE' | 'HIGH_CONTRAST'
    minQualityDpi: 150,
    shadowReductionStrength: 35,
    textSharpenStrength: 20
  });

  // Load from Firestore if existing
  useEffect(() => {
    async function loadConfig() {
      try {
        const ref = doc(db, "shops", PRIMARY_PILOT_SHOP.id, "serviceConfigs", "catalog");
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().items) {
          setConfigs(snap.data().items);
        }

        const imgRef = doc(db, "shops", PRIMARY_PILOT_SHOP.id, "settings", "imageProcessing");
        const imgSnap = await getDoc(imgRef);
        if (imgSnap.exists()) {
          setImgSettings(prev => ({ ...prev, ...imgSnap.data() }));
        }
      } catch (err) {
        console.warn("Using default service configurations:", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const toggleService = (id: string) => {
    if (!isManager) return;
    setConfigs(prev =>
      prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item)
    );
  };

  const updatePrinter = (id: string, printer: string) => {
    if (!isManager) return;
    setConfigs(prev =>
      prev.map(item => item.id === id ? { ...item, mappedPrinter: printer } : item)
    );
  };

  const handleSave = async () => {
    if (!isManager) {
      alert("Only verified Owner or Manager accounts can save service catalog changes.");
      return;
    }
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      if (activeTab === "SERVICES") {
        const ref = doc(db, "shops", PRIMARY_PILOT_SHOP.id, "serviceConfigs", "catalog");
        await setDoc(ref, {
          shopId: PRIMARY_PILOT_SHOP.id,
          items: configs,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || "owner"
        }, { merge: true });
      } else {
        const imgRef = doc(db, "shops", PRIMARY_PILOT_SHOP.id, "settings", "imageProcessing");
        await setDoc(imgRef, {
          ...imgSettings,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || "owner"
        }, { merge: true });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save settings";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
              Owner Controls
            </span>
            <span className="text-xs text-[#475569] font-medium">Services & Processing Engine</span>
          </div>
          <h2 className="text-xl font-black text-[#111827] tracking-tight mt-1 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-emerald-600" />
            <span>Services & Image Processing</span>
          </h2>
          <p className="text-xs text-[#475569] mt-0.5">
            Configure customer printing services, printer hardware mappings, and automatic image enhancement defaults for {PRIMARY_PILOT_SHOP.name}.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isManager && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? "Saving..." : "Save Settings"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("SERVICES")}
          className={`py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "SERVICES"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Services Catalog & Hardware</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("IMAGE_PROCESSING")}
          className={`py-2 px-4 rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === "IMAGE_PROCESSING"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Image Processing & Auto-Enhance</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: SERVICES TABLE */}
      {activeTab === "SERVICES" && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Active Service Roster</h3>
              <p className="text-xs text-[#475569] mt-0.5">
                Confirmed pricing: B&W ₹2, Duplex ₹3/sheet, Colour ₹10, Passport ₹100. Unconfigured rates remain unset.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              Shop ID: {PRIMARY_PILOT_SHOP.id}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white border-b border-[#E2E8F0] text-[#475569] font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Authoritative Rate</th>
                  <th className="py-3 px-4">Billing Unit</th>
                  <th className="py-3 px-4">Mapped Spooler Printer</th>
                  <th className="py-3 px-4">Calibration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {configs.map((svc) => (
                  <tr key={svc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-[#111827]">
                      <div className="flex items-center gap-2">
                        {svc.category === "DOCUMENT" && <FileText className="w-4 h-4 text-slate-500" />}
                        {svc.category === "PHOTO" && <Images className="w-4 h-4 text-emerald-600" />}
                        {svc.category === "UTILITY" && <ScanLine className="w-4 h-4 text-sky-600" />}
                        <div>
                          <div>{svc.name}</div>
                          <div className="text-[10px] text-[#64748B] font-normal">{svc.notes}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleService(svc.id)}
                        disabled={!isManager}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                          svc.enabled
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {svc.enabled ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Enabled</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Paused</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-[#111827]">
                      {svc.rateLabel}
                    </td>

                    <td className="py-3.5 px-4 text-[#475569]">
                      {svc.billingUnit}
                    </td>

                    <td className="py-3.5 px-4">
                      <input
                        type="text"
                        value={svc.mappedPrinter}
                        disabled={!isManager}
                        onChange={(e) => updatePrinter(svc.id, e.target.value)}
                        className="py-1 px-2 border border-[#CBD5E1] rounded-lg text-xs font-medium w-full max-w-[200px] bg-white text-[#111827] focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {svc.calibrationState}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: IMAGE PROCESSING CONFIGURATION */}
      {activeTab === "IMAGE_PROCESSING" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-[#E2E8F0] pb-3">
              <h3 className="text-sm font-bold text-[#111827]">Customer Image Auto-Enhance Controls</h3>
              <p className="text-xs text-[#475569] mt-0.5">
                Manage conservative enhancement defaults, print quality thresholds, and document boundary detection for uploaded images.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Auto Enhance Switch */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#0F172A] block">
                    Customer Auto-Enhance & Suggestions
                  </label>
                  <input
                    type="checkbox"
                    checked={imgSettings.autoEnhanceEnabled}
                    disabled={!isManager}
                    onChange={(e) => setImgSettings(p => ({ ...p, autoEnhanceEnabled: e.target.checked }))}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
                <p className="text-slate-500 text-[11px]">
                  When enabled, shows automatic document, portrait, or ID card suggestions with 1-click Auto Enhance on customer uploads.
                </p>
              </div>

              {/* Default Filter Mode */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <label className="font-bold text-[#0F172A] block">
                  Default Document Mode
                </label>
                <select
                  value={imgSettings.defaultMode}
                  disabled={!isManager}
                  onChange={(e) => setImgSettings(p => ({ ...p, defaultMode: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl border border-[#CBD5E1] bg-white font-semibold text-xs text-[#0F172A]"
                >
                  <option value="COLOR_ENHANCED">Clean Color (Preserves stamps, signatures & colors)</option>
                  <option value="GRAYSCALE">Grayscale Document</option>
                  <option value="HIGH_CONTRAST">High Contrast B&W (Receipts & Bills)</option>
                </select>
                <p className="text-slate-500 text-[11px]">
                  Clean Color safely pulls paper to white while keeping official blue/red stamps intact.
                </p>
              </div>

              {/* Minimum Quality Warning Threshold */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <label className="font-bold text-[#0F172A] block">
                  Print Resolution Warning Threshold
                </label>
                <select
                  value={imgSettings.minQualityDpi}
                  disabled={!isManager}
                  onChange={(e) => setImgSettings(p => ({ ...p, minQualityDpi: Number(e.target.value) }))}
                  className="w-full py-2 px-3 rounded-xl border border-[#CBD5E1] bg-white font-semibold text-xs text-[#0F172A]"
                >
                  <option value="150">150 DPI (Recommended — warn on severe pixelation)</option>
                  <option value="200">200 DPI (Standard commercial threshold)</option>
                  <option value="300">300 DPI (Strict fine-art & photo studio threshold)</option>
                </select>
                <p className="text-slate-500 text-[11px]">
                  Files below this DPI display an advisory warning suggesting a smaller print size, without blocking the order.
                </p>
              </div>

              {/* Shadow Reduction Preset */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex justify-between">
                  <label className="font-bold text-[#0F172A]">Default Shadow Reduction</label>
                  <span className="font-mono font-bold text-emerald-700">{imgSettings.shadowReductionStrength}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={imgSettings.shadowReductionStrength}
                  disabled={!isManager}
                  onChange={(e) => setImgSettings(p => ({ ...p, shadowReductionStrength: Number(e.target.value) }))}
                  className="w-full accent-emerald-600"
                />
                <p className="text-slate-500 text-[11px]">
                  Removes smartphone camera shadows while preserving faint pencil or ballpoint handwriting.
                </p>
              </div>
            </div>
          </div>

          {/* Engine Capabilities & Privacy Matrix */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-[#E2E8F0] pb-2">
              <h3 className="text-sm font-bold text-[#111827]">Processing Engine Capabilities & Privacy Contract</h3>
              <p className="text-xs text-[#475569] mt-0.5">
                Enhancement runs locally in browser (No third-party AI). Print files upload securely to private Firebase Storage only for print dispatch.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-900 block">EXIF Orientation Normalization</strong>
                  <span className="text-emerald-700 text-[11px]">Active — Browser Canvas corrects camera sensor rotation.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-900 block">Document Boundary & Corner Detection</strong>
                  <span className="text-emerald-700 text-[11px]">Active — Edge gradient analysis with editable corner handles.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-900 block">Deskew & Text Edge Sharpening</strong>
                  <span className="text-emerald-700 text-[11px]">Active — 3x3 unsharp mask filter enhances text readability.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-900 block">Passport Face Guides (35x45mm)</strong>
                  <span className="text-emerald-700 text-[11px]">Active — Official Indian passport oval & eye-level guidelines.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800 block">Zero Third-Party Cloud Telemetry</strong>
                  <span className="text-slate-600 text-[11px]">Enforced — Customer images are never sent to external AI servers.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-900 block">Generative Background Inpainting</strong>
                  <span className="text-amber-700 text-[11px]">Honestly Unavailable — Generative facial alteration disabled to preserve authentic document identity.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
