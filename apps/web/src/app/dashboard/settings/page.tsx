"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Building,
  Globe,
  Coins,
  ShieldCheck,
  UserCheck,
  QrCode,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  X
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, UpiPaymentUtils } from "@s2p/shared";
import { useAuth } from "../../../lib/firebase/auth-context";

export default function DashboardSettingsPage() {
  const { user, role } = useAuth();

  // Manual UPI Settings State
  const [upiEnabled, setUpiEnabled] = useState<boolean>(true);
  const [upiId, setUpiId] = useState<string>("");
  const [payeeName, setPayeeName] = useState<string>(PRIMARY_PILOT_SHOP.name);
  const [providerLabel, setProviderLabel] = useState<string>("PhonePe / UPI");
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Test QR Modal State
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testQrDataUrl, setTestQrDataUrl] = useState<string | null>(null);
  const [testUpiUri, setTestUpiUri] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/shops/${PRIMARY_PILOT_SHOP.id}/payment-settings`);
        const data = await res.json();
        if (res.ok && data.success && data.settings && isMounted) {
          setUpiEnabled(Boolean(data.settings.enabled));
          setUpiId(data.settings.upiId || "");
          setPayeeName(data.settings.payeeName || PRIMARY_PILOT_SHOP.name);
          setProviderLabel(data.settings.providerLabel || "PhonePe / UPI");
        }
      } catch {
        // Fallback default
      } finally {
        if (isMounted) setIsLoadingSettings(false);
      }
    };
    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      if (upiEnabled && (!upiId || !upiId.includes("@"))) {
        throw new Error("Please enter a valid UPI ID containing @ (e.g. shop@upi or 9876543210@paytm)");
      }
      if (upiEnabled && !payeeName.trim()) {
        throw new Error("Payee Name cannot be blank");
      }

      const token = user ? await user.getIdToken() : "";
      const res = await fetch(`/api/shops/${PRIMARY_PILOT_SHOP.id}/payment-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          enabled: upiEnabled,
          upiId: upiId.trim(),
          payeeName: payeeName.trim(),
          providerLabel: providerLabel.trim() || "PhonePe / UPI",
          showQr: true,
          showUpiIntent: true
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update payment settings");
      }

      setSaveSuccess("Payment settings saved successfully and synchronized across tenant endpoints.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving payment settings";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPaymentQr = async () => {
    try {
      const cleanUpi = upiId.trim() || "pilot@ybl";
      const cleanPayee = payeeName.trim() || PRIMARY_PILOT_SHOP.name;
      const uri = UpiPaymentUtils.generateUpiPaymentUri({
        upiId: cleanUpi,
        payeeName: cleanPayee,
        amountRupees: "1.00",
        orderToken: "TEST-101",
        reference: "S2P-TEST-QR-CHECK"
      });
      const dataUrl = await UpiPaymentUtils.generateUpiQrDataUrl(uri);
      setTestUpiUri(uri);
      setTestQrDataUrl(dataUrl);
      setShowTestModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate test QR";
      alert(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Shop Profile &amp; Settings Foundation</h2>
              <p className="text-xs text-slate-400">
                Tenant parameters and operational configuration for {PRIMARY_PILOT_SHOP.name}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
            {role || "OWNER"}
          </span>
        </div>
      </div>

      {/* Manual UPI Payment Settings */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-[#1f2937] pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Manual UPI &amp; PhonePe Settings</h3>
              <p className="text-[11px] text-slate-400">
                Configure the shop&apos;s authoritative UPI ID and payee details. Verified by staff at counter.
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30">
            STAFF_CONFIRMATION
          </span>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-lg p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="bg-rose-950/60 border border-rose-500/40 rounded-lg p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <form onSubmit={handleSavePaymentSettings} className="space-y-4 text-xs">
          <div className="flex items-center gap-3 bg-[#16202c] p-3 rounded-lg border border-[#1f2937]">
            <input
              type="checkbox"
              id="enableUpi"
              checked={upiEnabled}
              onChange={(e) => setUpiEnabled(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded bg-[#111827] border-[#374151] focus:ring-emerald-500"
            />
            <label htmlFor="enableUpi" className="font-bold text-slate-200 cursor-pointer">
              Enable Manual UPI / PhonePe Payments on Kiosk &amp; Web
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-400 text-[11px] font-semibold block">
                Shop UPI ID (e.g. user@okhdfcbank, mobile@paytm)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="shakeel@ybl"
                className="w-full px-3 py-2 bg-[#16202c] border border-[#2d3748] rounded-lg text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-[11px] font-semibold block">
                Merchant / Payee Name (Shown in customer UPI app)
              </label>
              <input
                type="text"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="Shakeel Online Services"
                className="w-full px-3 py-2 bg-[#16202c] border border-[#2d3748] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-slate-400 text-[11px] font-semibold block">
                Customer Display Label (e.g. PhonePe / UPI)
              </label>
              <input
                type="text"
                value={providerLabel}
                onChange={(e) => setProviderLabel(e.target.value)}
                placeholder="PhonePe / UPI"
                className="w-full px-3 py-2 bg-[#16202c] border border-[#2d3748] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#1f2937] pt-4">
            <button
              type="button"
              onClick={handleTestPaymentQr}
              className="px-3.5 py-2 bg-[#1f2937] hover:bg-[#374151] border border-[#374151] rounded-lg text-xs font-semibold text-slate-300 transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test Payment QR</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Payment Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Test QR Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-[#1f2937] pb-3 text-left">
              <div>
                <h4 className="text-xs font-bold text-white">Live Test Payment QR</h4>
                <p className="text-[10px] text-slate-400">Verifying RFC format &amp; QR encoding</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {testQrDataUrl && (
              <div className="w-48 h-48 bg-white p-2 rounded-xl mx-auto shadow flex items-center justify-center">
                <img src={testQrDataUrl} alt="Test QR" className="w-full h-full object-contain" />
              </div>
            )}

            <div className="text-[11px] text-slate-300 font-mono break-all bg-[#16202c] p-2.5 rounded-lg border border-[#1f2937] text-left">
              <span className="text-[10px] text-slate-500 block">Generated Intent URI:</span>
              {testUpiUri}
            </div>

            <div className="text-[10px] text-slate-400">
              Scannable with any UPI app on the same local Wi-Fi. Amount set to ₹1.00.
            </div>

            <button
              type="button"
              onClick={() => setShowTestModal(false)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* Shop Foundation Parameters */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Building className="w-4 h-4 text-emerald-400" />
          <span>Tenant &amp; Shop Identity</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Shop Name</span>
            <span className="text-white font-bold">{PRIMARY_PILOT_SHOP.name}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Unique Slug</span>
            <code className="text-emerald-400 font-mono font-bold">{PRIMARY_PILOT_SHOP.slug}</code>
          </div>

          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Currency</span>
            <span className="text-white font-bold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>INR (₹ Indian Rupee)</span>
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Timezone</span>
            <span className="text-white font-bold flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Asia/Kolkata (IST)</span>
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Tenant Status</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>ACTIVE</span>
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Active Staff Role</span>
            <span className="text-white font-bold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{role || "OWNER"} ({user?.email || "owner@shakeelprints.com"})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Security Policies */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-2">
          <h4 className="font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Document Privacy Policy</span>
          </h4>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Customer uploaded documents are stored in strict private buckets. Documents are automatically purged shortly following verified print completion.
          </p>
        </div>

        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-2">
          <h4 className="font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cross-Tenant Isolation</span>
          </h4>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Firestore security rules ensure Shop A staff cannot read Shop B private orders, queue data, or customers.
          </p>
        </div>
      </div>
    </div>
  );
}