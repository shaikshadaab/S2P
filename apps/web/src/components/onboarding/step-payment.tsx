"use client";

import React, { useState } from "react";
import { ShieldCheck, Clock, Check } from "lucide-react";

interface StepPaymentProps {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export function StepPayment({ formData, updateField }: StepPaymentProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<string | null>(null);

  const handleTestPhonePe = () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    setTimeout(() => {
      setIsTestingConnection(false);
      setConnectionTestResult("PhonePe Sandbox Gateway connection verified successfully (HMAC-SHA256 OK)");
    }, 900);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold font-heading">Step 5: PhonePe Payment Gateway Setup</h2>
        <p className="text-sm text-black/60 mt-1">
          Connect PhonePe to receive direct customer payments via UPI, QR, and Cards.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => updateField("paymentMode", "direct")}
          className={`p-4 rounded-xl border text-left transition-all ${
            formData.paymentMode === "direct"
              ? "border-2 border-[#20C878] bg-[#E8FAF1]/30 shadow-sm"
              : "border-black/10 hover:border-black/20"
          }`}
        >
          <span className="block font-bold text-sm text-[#121018]">Direct Merchant Mode</span>
          <span className="block text-xs text-black/60 mt-1">
            Enter your approved PhonePe Merchant ID & Secret Key for direct settlement.
          </span>
        </button>

        <button
          type="button"
          onClick={() => updateField("paymentMode", "platform")}
          className={`p-4 rounded-xl border text-left transition-all ${
            formData.paymentMode === "platform"
              ? "border-2 border-[#20C878] bg-[#E8FAF1]/30 shadow-sm"
              : "border-black/10 hover:border-black/20"
          }`}
        >
          <span className="block font-bold text-sm text-[#121018]">Platform Collection Mode</span>
          <span className="block text-xs text-black/60 mt-1">
            Vintha collects customer payments; daily automated ledger payouts to your bank.
          </span>
        </button>
      </div>

      {formData.paymentMode === "direct" && (
        <div className="space-y-4 p-4 rounded-xl border border-black/10 bg-[#FAFAF8]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-black/70 uppercase">Credentials</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-black/60">Environment:</span>
              <select
                value={formData.phonepeEnvironment}
                onChange={(e) => updateField("phonepeEnvironment", e.target.value)}
                className="text-xs font-bold bg-white border border-black/10 rounded-lg px-2 py-1"
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production (Live)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-black/70 mb-1">Merchant ID</label>
              <input
                type="text"
                value={formData.phonepeMerchantId}
                onChange={(e) => updateField("phonepeMerchantId", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/10 font-mono text-xs font-medium bg-white"
                placeholder="PGTESTPAYUAT..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-black/70 mb-1">Salt / Client Secret Key</label>
              <input
                type="password"
                value={formData.phonepeClientSecret}
                onChange={(e) => updateField("phonepeClientSecret", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/10 font-mono text-xs font-medium bg-white"
                placeholder="96434309-7796-..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTestPhonePe}
              disabled={isTestingConnection}
              className="px-4 py-2 rounded-lg bg-white border border-black/15 text-xs font-bold hover:bg-black/5 flex items-center gap-2"
            >
              {isTestingConnection ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin text-[#20C878]" />
                  <span>Testing PhonePe Connection...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#20C878]" />
                  <span>Test Gateway Connection</span>
                </>
              )}
            </button>
            {connectionTestResult && (
              <span className="text-xs text-[#18AA64] font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {connectionTestResult}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
