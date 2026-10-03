"use client";

import React from "react";
import { User, Phone, Smartphone, CheckCircle2 } from "lucide-react";

interface CustomerDetailsStepProps {
  details: {
    customerName: string;
    customerMobile: string;
    customerWhatsapp: string;
  };
  setDetails: (fn: (prev: any) => any) => void;
}

export function CustomerDetailsStep({ details, setDetails }: CustomerDetailsStepProps) {
  const update = (field: string, val: string) => {
    setDetails((prev: any) => ({ ...prev, [field]: val }));
  };

  const handleUseQuickNumber = () => {
    setDetails((prev: any) => ({
      ...prev,
      customerMobile: "9581529381",
      customerWhatsapp: "9581529381",
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-black/70 uppercase tracking-wider">
          Step 4: Contact Details & PhonePe UPI
        </label>
        <span className="text-[11px] text-[#20C878] font-bold">No signup required</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold text-black/60 uppercase mb-1">Your Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-black/35 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={details.customerName}
              onChange={(e) => update("customerName", e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-xs sm:text-sm font-semibold bg-white"
              placeholder="e.g. Rahul Sharma"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-black/60 uppercase">
              10-Digit Mobile (For PhonePe & SMS Receipt)
            </label>
            {details.customerMobile !== "9581529381" && (
              <button
                type="button"
                onClick={handleUseQuickNumber}
                className="text-[11px] text-[#6D3AE8] font-bold hover:underline"
              >
                Use 9581529381
              </button>
            )}
          </div>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-black/10 bg-black/5 text-xs font-bold text-black/60">
              +91
            </span>
            <input
              type="tel"
              required
              maxLength={10}
              value={details.customerMobile}
              onChange={(e) => update("customerMobile", e.target.value.replace(/\D/g, ""))}
              className="w-full px-3 py-2.5 rounded-r-xl border border-black/10 focus:border-[#20C878] outline-none text-xs sm:text-sm font-semibold bg-white"
              placeholder="9581529381"
            />
          </div>
        </div>

        {/* PhonePe VPA Preview */}
        <div className="p-2.5 bg-[#F0EBFC] border border-[#6D3AE8]/20 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#6D3AE8]" />
            <span className="text-[#121018] font-medium">
              PhonePe UPI ID: <strong className="font-mono text-[#6D3AE8]">{details.customerMobile ? `${details.customerMobile}@ybl` : "9581529381@ybl"}</strong>
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#20C878] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Instant Pay Ready
          </span>
        </div>
      </div>
    </div>
  );
}