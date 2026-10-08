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
  Settings2
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
    notes: "High vibrancy color printing on standard 75-80 GSM paper."
  },
  {
    id: "passport_photos",
    name: "Passport Photos (Set)",
    category: "PHOTO",
    enabled: true,
    rateLabel: "₹100.00 / configured set",
    unitPricePaise: 10000,
    billingUnit: "per configured set (8 photos)",
    mappedPrinter: "HP Smart Tank (Photo Tray)",
    calibrationState: "READY",
    notes: "Standard 35×45 mm size with cut guides. Exact count & dimensions await owner physical check."
  },
  {
    id: "photo_sheets",
    name: "Photo Prints & Grids",
    category: "PHOTO",
    enabled: true,
    rateLabel: "Rate by Sheet Size",
    unitPricePaise: 0,
    billingUnit: "per sheet",
    mappedPrinter: "HP Smart Tank (Glossy)",
    calibrationState: "READY",
    notes: "1/2/4/6/9/12 photos per sheet on 4×6 inch or A4 photo stock."
  },
  {
    id: "resume_builder",
    name: "Resume Builder",
    category: "DOCUMENT",
    enabled: true,
    rateLabel: "Standard Print Rate",
    unitPricePaise: 200,
    billingUnit: "per printed page",
    mappedPrinter: "HP Smart Tank (B&W)",
    calibrationState: "READY",
    notes: "6 searchable templates with live multi-page preview and instant PDF export."
  },
  {
    id: "scan_to_pdf",
    name: "Camera Scan to PDF",
    category: "UTILITY",
    enabled: true,
    rateLabel: "Free digital PDF / Print rate",
    unitPricePaise: 0,
    billingUnit: "per scan",
    mappedPrinter: "Digital PDF / Windows Spooler",
    calibrationState: "READY",
    notes: "Phone camera or flatbed scan. Perspective correction & auto contrast."
  },
  {
    id: "id_copy",
    name: "ID Card Front / Back Copy",
    category: "UTILITY",
    enabled: true,
    rateLabel: "Standard A4 Print Rate",
    unitPricePaise: 200,
    billingUnit: "per output sheet",
    mappedPrinter: "HP Smart Tank (B&W)",
    calibrationState: "READY",
    notes: "Aadhaar, PAN, Voter, Driving License formatted side-by-side on A4 sheet."
  },
  {
    id: "nup_print",
    name: "Mini / N-up Printing (2/4-up)",
    category: "DOCUMENT",
    enabled: true,
    rateLabel: "Billed by Output Sheet",
    unitPricePaise: 300,
    billingUnit: "per physical sheet",
    mappedPrinter: "HP Smart Tank",
    calibrationState: "READY",
    notes: "Paper-saving mode. 2 or 4 pages per sheet priced strictly by physical output sheets."
  },
  {
    id: "office_print",
    name: "Word / PowerPoint Printing",
    category: "DOCUMENT",
    enabled: true,
    rateLabel: "Standard Print Rate",
    unitPricePaise: 200,
    billingUnit: "per printed side",
    mappedPrinter: "HP Smart Tank",
    calibrationState: "NEEDS_CALIBRATION",
    notes: "DOCX/PPTX OpenXML conversion. Macros rejected. Checkout warned for non-standard fonts."
  },
  {
    id: "xerox_assist",
    name: "Xerox & Counter Photocopy",
    category: "UTILITY",
    enabled: true,
    rateLabel: "₹2.00 / single, ₹3.00 / duplex",
    unitPricePaise: 200,
    billingUnit: "per page",
    mappedPrinter: "HP Smart Tank / Flatbed Scanner",
    calibrationState: "READY",
    notes: "Operator assisted walk-in photocopy using scanner glass."
  },
  {
    id: "large_a3",
    name: "Large Format Printing (A3)",
    category: "DOCUMENT",
    enabled: true,
    rateLabel: "A3 Custom Rate",
    unitPricePaise: 1000,
    billingUnit: "per A3 side",
    mappedPrinter: "HP Smart Tank (Manual Feed)",
    calibrationState: "AWAITING_HARDWARE",
    notes: "A3 supported where tray accepts wide sheets. A2/A1 require external plotter."
  }
];

export default function DashboardServicesPage() {
  const { user, role } = useAuth();
  const isManager = role === "OWNER" || role === "MANAGER";

  const [configs, setConfigs] = useState<ServiceItemConfig[]>(INITIAL_SERVICE_CONFIGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load from Firestore if existing
  useEffect(() => {
    async function loadConfig() {
      try {
        const ref = doc(db, "shops", PRIMARY_PILOT_SHOP.id, "serviceConfigs", "catalog");
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().items) {
          setConfigs(snap.data().items);
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
      const ref = doc(db, "shops", PRIMARY_PILOT_SHOP.id, "serviceConfigs", "catalog");
      await setDoc(ref, {
        shopId: PRIMARY_PILOT_SHOP.id,
        items: configs,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || "owner"
      }, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save service configurations";
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
            <span className="text-xs text-[#475569] font-medium">10 Customer Printing Services</span>
          </div>
          <h2 className="text-xl font-black text-[#111827] tracking-tight mt-1 flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-emerald-600" />
            <span>Services Catalog &amp; Hardware Mapping</span>
          </h2>
          <p className="text-xs text-[#475569] mt-0.5">
            Enable or pause customer services, configure billing units, and map each service to capable physical printers for {PRIMARY_PILOT_SHOP.name}.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isManager && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? "Saving..." : "Save Catalog"}</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Services catalog and printer mappings saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Services Table Card */}
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
                <th className="py-3 px-4">Mapped Printer</th>
                <th className="py-3 px-4">Calibration</th>
                <th className="py-3 px-4 text-right">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {configs.map((svc) => (
                <tr key={svc.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#111827]">{svc.name}</div>
                    <div className="text-[11px] text-[#475569] max-w-xs">{svc.notes}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      svc.enabled
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${svc.enabled ? "bg-emerald-600" : "bg-slate-400"}`} />
                      {svc.enabled ? "Enabled" : "Paused"}
                    </span>
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
                      disabled={!isManager}
                      value={svc.mappedPrinter}
                      onChange={(e) => updatePrinter(svc.id, e.target.value)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-[#E2E8F0] bg-white text-[#111827] w-48 focus:border-emerald-500 focus:outline-none"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      svc.calibrationState === "CONFIRMED"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : svc.calibrationState === "READY"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : svc.calibrationState === "NEEDS_CALIBRATION"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-purple-50 text-purple-800 border-purple-200"
                    }`}>
                      {svc.calibrationState.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      disabled={!isManager}
                      onClick={() => toggleService(svc.id)}
                      className={`p-1.5 rounded-lg transition ${
                        svc.enabled
                          ? "text-emerald-600 hover:bg-emerald-50"
                          : "text-slate-400 hover:bg-slate-100"
                      }`}
                      title={svc.enabled ? "Pause Service" : "Enable Service"}
                    >
                      {svc.enabled ? (
                        <ToggleRight className="w-6 h-6" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
