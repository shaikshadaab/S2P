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
  X,
  Star,
  ExternalLink,
  MessageSquare
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
  const [verificationState, setVerificationState] = useState<string>("UNVERIFIED");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Google Review URL State
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string>("");
  const [isSavingGoogle, setIsSavingGoogle] = useState<boolean>(false);
  const [googleSuccess, setGoogleSuccess] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Test QR Modal State
  const [showTestModal, setShowTestModal] = useState<boolean>(false);
  const [testQrDataUrl, setTestQrDataUrl] = useState<string | null>(null);
  const [testUpiUri, setTestUpiUri] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const [payRes, shopRes] = await Promise.all([
          fetch(`/api/shops/${PRIMARY_PILOT_SHOP.id}/payment-settings`),
          fetch(`/api/shops/${PRIMARY_PILOT_SHOP.id}/settings`)
        ]);

        const payData = await payRes.json();
        if (payRes.ok && payData.success && payData.settings && isMounted) {
          setUpiEnabled(Boolean(payData.settings.enabled));
          setUpiId(payData.settings.upiId || "");
          setPayeeName(payData.settings.payeeName || PRIMARY_PILOT_SHOP.name);
          setProviderLabel(payData.settings.providerLabel || "PhonePe / UPI");
          setVerificationState(payData.settings.verificationState || "UNVERIFIED");
          setIsVerified(Boolean(payData.settings.isVerified));
        }

        const shopData = await shopRes.json();
        if (shopRes.ok && shopData.success && shopData.settings && isMounted) {
          setGoogleReviewUrl(shopData.settings.googleReviewUrl || "");
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
      const res = await fetch(`/api/shops/${PRIMARY_PILOT_SHOP.id}/payment-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: upiEnabled,
          upiId,
          payeeName,
          providerLabel
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update payment settings");
      }

      setVerificationState("UNVERIFIED");
      setIsVerified(false);
      setSaveSuccess("UPI settings updated. Status reset to UNVERIFIED until owner tests with physical device.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving payment settings";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGoogleReviewUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGoogle(true);
    setGoogleSuccess(null);
    setGoogleError(null);

    try {
      const res = await fetch(`/api/shops/${PRIMARY_PILOT_SHOP.id}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleReviewUrl
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save Google review URL");
      }

      setGoogleSuccess("Google Review URL updated! Customers who complete orders will now see the review option.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving Google review URL";
      setGoogleError(msg);
    } finally {
      setIsSavingGoogle(false);
    }
  };

  const handleOpenTestModal = async () => {
    if (!upiId || !upiId.includes("@")) {
      alert("Please enter a valid UPI ID (e.g., name@okaxis) before generating a test QR.");
      return;
    }

    try {
      const uri = UpiPaymentUtils.generateUpiPaymentUri({
        upiId,
        payeeName: payeeName || PRIMARY_PILOT_SHOP.name,
        amountRupees: 1.0,
        orderToken: 'TEST',
        reference: `S2P-TEST-${Date.now().toString(36).toUpperCase()}`
      });

      const qr = await UpiPaymentUtils.generateUpiQrDataUrl(uri);
      setTestUpiUri(uri);
      setTestQrDataUrl(qr);
      setShowTestModal(true);
    } catch (err) {
      alert("Failed to generate test QR: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleMarkTested = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/shops/${PRIMARY_PILOT_SHOP.id}/payment-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_TESTED" })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to mark verified");
      }

      setVerificationState("DEVICE_TESTED");
      setIsVerified(true);
      setShowTestModal(false);
      setSaveSuccess("UPI settings verified! Marked as DEVICE_TESTED.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to verify");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#0F172A]">Shop Settings & Configuration</h1>
              <p className="text-xs text-[#64748B] mt-0.5">
                Authoritative parameters and operational links for {PRIMARY_PILOT_SHOP.name}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold font-mono self-start sm:self-auto">
            {role || "OWNER"}
          </span>
        </div>
      </div>

      {/* Google Business Review Settings */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Google Business Review Integration</h2>
              <p className="text-xs text-[#64748B]">
                Optionally invite customers to leave a public review on your Google Business profile after prints are collected.
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            googleReviewUrl
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}>
            {googleReviewUrl ? "CONFIGURED" : "OPTIONAL / UNSET"}
          </span>
        </div>

        {googleSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{googleSuccess}</span>
          </div>
        )}

        {googleError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{googleError}</span>
          </div>
        )}

        <form onSubmit={handleSaveGoogleReviewUrl} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
              Google Review Profile Link (Direct Review URL)
            </label>
            <div className="relative">
              <input
                type="url"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/YOUR_CODE/review or https://search.google.com/local/writereview?placeid=..."
                className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-[#64748B] mt-1.5 leading-relaxed">
              When configured, completed customer orders will display a voluntary &ldquo;Review us on Google&rdquo; button alongside the internal rating. If left blank, no Google button will appear.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isSavingGoogle}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingGoogle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Google Review Link</span>
            </button>

            {googleReviewUrl && (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl border border-[#CBD5E1] hover:bg-slate-50 text-xs font-bold text-[#0F172A] transition flex items-center gap-1.5"
              >
                <span>Test Link</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            )}
          </div>
        </form>
      </div>

      {/* Manual UPI Payment Settings */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0F172A]">Manual UPI & PhonePe Settings</h2>
              <p className="text-xs text-[#64748B]">
                Configure the shop&apos;s authoritative UPI ID and payee details for customer counter payments.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              isVerified || verificationState === 'DEVICE_TESTED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {isVerified || verificationState === 'DEVICE_TESTED' ? 'DEVICE_TESTED' : 'UNVERIFIED'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
              STAFF_CONFIRMATION
            </span>
          </div>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        <form onSubmit={handleSavePaymentSettings} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-[#E2E8F0] rounded-xl">
            <input
              type="checkbox"
              id="upiEnabled"
              checked={upiEnabled}
              onChange={(e) => setUpiEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <label htmlFor="upiEnabled" className="text-xs font-bold text-[#0F172A] cursor-pointer">
              Enable Manual UPI / PhonePe Payments on Kiosk & Web
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Shop UPI ID (VPA)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. shakeel@okhdfcbank"
                required={upiEnabled}
                className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-mono text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Must contain @ symbol</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1">Merchant Payee Name</label>
              <input
                type="text"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder={PRIMARY_PILOT_SHOP.name}
                required={upiEnabled}
                className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1">Customer Provider Label</label>
            <input
              type="text"
              value={providerLabel}
              onChange={(e) => setProviderLabel(e.target.value)}
              placeholder="PhonePe / UPI / GPay"
              className="w-full px-3 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Payment Settings</span>
            </button>

            <button
              type="button"
              onClick={handleOpenTestModal}
              className="py-2.5 px-4 rounded-xl border border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] font-bold text-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Generate Test QR (₹1.00)</span>
            </button>
          </div>
        </form>
      </div>

      {/* Shop Profile Reference */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-3">
          <Building className="w-5 h-5 text-emerald-600" />
          <h2 className="text-sm font-bold text-[#0F172A]">Business Details (Immutable Constants)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8F0]">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Shop Name</span>
            <span className="font-bold text-[#0F172A] mt-0.5 block">{PRIMARY_PILOT_SHOP.name}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8F0]">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Shop Identifier</span>
            <span className="font-mono text-emerald-700 font-bold mt-0.5 block">{PRIMARY_PILOT_SHOP.id}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8F0]">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Location</span>
            <span className="font-semibold text-[#0F172A] mt-0.5 block">Guntur, Andhra Pradesh</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8F0]">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Official WhatsApp</span>
            <span className="font-mono font-bold text-[#0F172A] mt-0.5 block">+91 95815 29381</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8F0]">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Production URL Target</span>
            <span className="font-mono font-bold text-emerald-700 mt-0.5 block">sos-print.vercel.app</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-[#E2E8F0]">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Payment Model</span>
            <span className="font-semibold text-[#0F172A] mt-0.5 block">Razorpay + Counter Cash/UPI</span>
          </div>
        </div>
      </div>

      {/* Test QR Modal */}
      {showTestModal && testQrDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-[#E2E8F0]">
            <div className="flex justify-between items-center pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A]">Owner Device Test QR (₹1.00)</h3>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-[#E2E8F0]">
              <img src={testQrDataUrl} alt="Test UPI QR" className="w-48 h-48 rounded-lg shadow-xs" />
              <div className="text-[11px] font-mono font-bold text-[#0F172A] mt-2">₹1.00 Authorization Test</div>
              <div className="text-[10px] text-slate-500 mt-0.5 text-center break-all">VPA: {upiId}</div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              Scan this QR with PhonePe/GPay on your smartphone to confirm your merchant name and bank account match.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleMarkTested}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Confirm Tested
              </button>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="py-2.5 px-4 rounded-xl border border-[#CBD5E1] text-[#0F172A] font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
