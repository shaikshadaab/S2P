"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Printer,
  ArrowRight,
  ArrowLeft,
  Store,
  Link as LinkIcon,
  Laptop,
  Check,
  Sparkles,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    shopName: "Om Sai Xerox & Digital Print",
    ownerName: "Ramesh Sharma",
    mobile: "9876543210",
    whatsappNumber: "9876543210",
    email: "ramesh@sharmaprint.in",
    password: "Password@123",
    businessCategory: "Xerox, Print & Cyber Cafe",
    address: "Shop No. 4, Anand Complex, Near Metro Station, Sector 15",
    city: "Hyderabad",
    state: "Telangana",
    pinCode: "500081",
    slug: "om-sai-print",
    pairingCode: "892145",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "shopName" && currentStep === 1) {
        next.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      return next;
    });
  };

  const validateStep = (step: number) => {
    setValidationError(null);
    if (step === 1) {
      if (!formData.shopName.trim()) {
        setValidationError("Please enter your Shop Name.");
        return false;
      }
      if (!formData.ownerName.trim()) {
        setValidationError("Please enter Owner Name.");
        return false;
      }
      if (!formData.mobile.trim() || formData.mobile.length < 10) {
        setValidationError("Please enter a valid 10-digit mobile number.");
        return false;
      }
      if (!formData.address.trim()) {
        setValidationError("Please enter shop counter address.");
        return false;
      }
    } else if (step === 2) {
      if (!formData.slug.trim()) {
        setValidationError("Please enter a valid URL slug for your shop.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await fetch("/api/shops/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          paymentMode: "free",
        }),
      });
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: "Shop & Owner", icon: Store },
    { num: 2, title: "QR Link & Slug", icon: LinkIcon },
    { num: 3, title: "Agent & Poster", icon: Laptop },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#121018] flex flex-col">
      {/* Top Header */}
      <header className="border-b border-black/5 bg-white py-4 px-6 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#1E1035] flex items-center justify-center text-white shadow-md">
              <Printer className="w-4 h-4 text-[#FF2D78]" />
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-bold font-heading text-[#1E1035]">
                vintha
              </span>
              <span className="text-xl font-black text-[#FF2D78] ml-0.5">
                Print
              </span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF2D78]/20 text-[#FF2D78] uppercase">
                100% Free
              </span>
            </div>
          </Link>
          <div className="text-xs text-black/60 font-semibold">
            Step {currentStep} of 3: <strong className="text-[#121018]">{steps[currentStep - 1].title}</strong>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 py-8 flex-1 w-full">
        {/* Stepper Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative max-w-md mx-auto">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-black/10 -translate-y-1/2 -z-10 rounded-full" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-[#FF2D78] -translate-y-1/2 -z-10 transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
            {steps.map((s) => {
              const Icon = s.icon;
              const isPast = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div key={s.num} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs transition-all ${
                      isPast
                        ? "bg-[#FF2D78] text-white shadow-md shadow-pink-500/25"
                        : isCurrent
                        ? "bg-[#1E1035] text-white ring-4 ring-[#FF2D78]/25 shadow-md"
                        : "bg-white border border-black/15 text-black/40"
                    }`}
                  >
                    {isPast ? <Check className="w-5 h-5 stroke-[3]" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-[11px] font-bold mt-1.5 ${
                      isCurrent ? "text-[#121018]" : "text-black/40"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-black/10 shadow-sm space-y-6">
          {validationError && (
            <div className="p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* STEP 1: SHOP & OWNER */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold font-heading text-[#121018]">
                  Step 1: Shop & Owner Information
                </h2>
                <p className="text-xs sm:text-sm text-black/60 mt-1">
                  Tell us about your print shop. This will be shown on customer upload pages and posters.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                    Shop Name (दुकान का नाम) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.shopName}
                    onChange={(e) => updateField("shopName", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#FF2D78] outline-none text-sm font-semibold"
                    placeholder="e.g. Om Sai Xerox & Print"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                    Owner Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={(e) => updateField("ownerName", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#FF2D78] outline-none text-sm font-medium"
                    placeholder="e.g. Ramesh Sharma"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-black/10 bg-black/5 text-xs font-bold text-black/60">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      required
                      value={formData.mobile}
                      onChange={(e) => updateField("mobile", e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 py-2.5 rounded-r-xl border border-black/10 focus:border-[#FF2D78] outline-none text-sm font-medium"
                      placeholder="9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                    WhatsApp Helpline No.
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-black/10 bg-black/5 text-xs font-bold text-black/60">
                      +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={formData.whatsappNumber}
                      onChange={(e) => updateField("whatsappNumber", e.target.value.replace(/\D/g, ""))}
                      className="w-full px-4 py-2.5 rounded-r-xl border border-black/10 focus:border-[#FF2D78] outline-none text-sm font-medium"
                      placeholder="Customer WhatsApp inquiries"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                  Full Shop Counter Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#FF2D78] outline-none text-sm font-medium"
                  placeholder="Shop number, building name, road or landmark"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-black/70 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-black/10 focus:border-[#FF2D78] outline-none text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black/70 uppercase mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-black/10 focus:border-[#FF2D78] outline-none text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black/70 uppercase mb-1">PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pinCode}
                    onChange={(e) => updateField("pinCode", e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2.5 rounded-xl border border-black/10 focus:border-[#FF2D78] outline-none text-sm font-medium"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-pink-50/50 rounded-2xl border border-[#FF2D78]/20 flex items-center gap-2.5 text-xs text-[#1E1035] font-medium">
                <ShieldCheck className="w-4 h-4 text-[#FF2D78] shrink-0" />
                <span>100% Free Forever · No credit card or payment gateway setup required.</span>
              </div>
            </div>
          )}

          {/* STEP 2: UNIQUE SHOP SLUG & QR CODE URL */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold font-heading text-[#121018]">
                  Step 2: Permanent Public QR Scan Link
                </h2>
                <p className="text-xs sm:text-sm text-black/60 mt-1">
                  This permanent web link will be encoded into your shop counter QR poster.
                </p>
              </div>

              <div className="p-6 bg-[#FAFAF8] rounded-2xl border border-black/10 space-y-4">
                <label className="block text-xs font-bold text-black/70 uppercase">
                  Your Custom Shop Link
                </label>
                <div className="flex items-center rounded-2xl border-2 border-[#FF2D78] bg-white overflow-hidden shadow-xs">
                  <span className="px-4 py-3 bg-black/5 text-xs sm:text-sm font-mono text-black/60 border-r border-black/10">
                    vintha-print.netlify.app/shop/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      updateField(
                        "slug",
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    className="w-full px-4 py-3 outline-none text-sm font-mono font-bold text-[#121018]"
                    placeholder="om-sai-print"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Slug is reserved for your shop! Full scan URL: /shop/{formData.slug}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-black/10 bg-white flex items-center justify-between text-xs text-black/60">
                <span>Customers can scan your counter QR poster or bookmark this link on their mobile.</span>
              </div>
            </div>
          )}

          {/* STEP 3: AGENT & POSTER PREVIEW */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold font-heading text-[#121018]">
                  Step 3: Windows Print Agent & Poster Ready
                </h2>
                <p className="text-xs sm:text-sm text-black/60 mt-1">
                  Your shop is ready! Download the counter agent software and pair it with your shop.
                </p>
              </div>

              {/* Windows Print Agent Box */}
              <div className="p-6 rounded-3xl bg-[#1E1035] text-white space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Laptop className="w-5 h-5 text-[#FF2D78]" />
                    <span className="font-extrabold text-sm">Vintha Windows Print Agent</span>
                  </div>
                  <span className="text-[10px] bg-[#FF2D78]/20 text-[#FF2D78] font-bold px-2.5 py-0.5 rounded-full uppercase">
                    100% Free Spooler
                  </span>
                </div>

                <p className="text-xs text-white/70 leading-relaxed">
                  Run the agent on your shop counter computer. It connects your HP, Canon, Epson, or Brother printer to receive walk-in print jobs automatically.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href="/downloads/VinthaPrintAgentSetup.exe"
                    download="VinthaPrintAgentSetup.exe"
                    className="inline-flex items-center gap-2 bg-[#FF2D78] hover:bg-[#E0246A] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-pink-500/20 transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Installer (.exe)</span>
                  </a>

                  <a
                    href="/downloads/VinthaPrintAgent-Windows.zip"
                    download="VinthaPrintAgent-Windows.zip"
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition-all"
                  >
                    <span>Download ZIP Archive</span>
                  </a>
                </div>
              </div>

              {/* 6-Digit Pairing Code Box */}
              <div className="p-6 rounded-3xl border-2 border-dashed border-[#FF2D78] bg-pink-50/30 text-center space-y-2">
                <span className="text-xs font-bold text-[#FF2D78] uppercase tracking-wider block">
                  Your 6-Digit Counter Computer Pairing Code
                </span>
                <div className="text-4xl sm:text-5xl font-extrabold font-mono tracking-widest text-[#121018]">
                  {formData.pairingCode}
                </div>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(formData.pairingCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="text-xs font-bold text-black/70 hover:text-black flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-black/10 shadow-xs"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-black/50">Enter this code in your agent software to pair your shop printer.</p>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-black/10">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-5 py-2.5 rounded-xl border border-black/10 font-bold text-xs text-[#121018] hover:bg-black/5 flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-pink-500/20 transition-all active:scale-95"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl bg-[#1E1035] hover:bg-black text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-purple-950/20 transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF2D78]" />
                    <span>Completing Shop Registration...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#FF2D78]" />
                    <span>Open Shop Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
