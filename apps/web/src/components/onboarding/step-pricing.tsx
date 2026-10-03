"use client";

import React from "react";

interface StepPricingProps {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export function StepPricing({ formData, updateField }: StepPricingProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold font-heading">Step 4: Configure Your Print Rates</h2>
        <p className="text-sm text-black/60 mt-1">
          Set the exact rates you want to charge your customers per page, side, and service fee.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-xl border border-black/10 bg-[#FAFAF8]">
          <label className="block text-xs font-bold text-black/70 mb-1">A4 B&W Single Side</label>
          <div className="flex items-center">
            <span className="text-sm font-bold mr-1">₹</span>
            <input
              type="number"
              step="0.5"
              value={formData.a4BwSingle}
              onChange={(e) => updateField("a4BwSingle", parseFloat(e.target.value) || 0)}
              className="w-full font-bold text-sm bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-black/10 bg-[#FAFAF8]">
          <label className="block text-xs font-bold text-black/70 mb-1">A4 B&W Double Side</label>
          <div className="flex items-center">
            <span className="text-sm font-bold mr-1">₹</span>
            <input
              type="number"
              step="0.5"
              value={formData.a4BwDouble}
              onChange={(e) => updateField("a4BwDouble", parseFloat(e.target.value) || 0)}
              className="w-full font-bold text-sm bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-black/10 bg-[#FAFAF8]">
          <label className="block text-xs font-bold text-black/70 mb-1">A4 Colour Single</label>
          <div className="flex items-center">
            <span className="text-sm font-bold mr-1">₹</span>
            <input
              type="number"
              step="1"
              value={formData.a4ColorSingle}
              onChange={(e) => updateField("a4ColorSingle", parseFloat(e.target.value) || 0)}
              className="w-full font-bold text-sm bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-black/10 bg-[#FAFAF8]">
          <label className="block text-xs font-bold text-black/70 mb-1">A4 Colour Double</label>
          <div className="flex items-center">
            <span className="text-sm font-bold mr-1">₹</span>
            <input
              type="number"
              step="1"
              value={formData.a4ColorDouble}
              onChange={(e) => updateField("a4ColorDouble", parseFloat(e.target.value) || 0)}
              className="w-full font-bold text-sm bg-transparent outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-3.5 rounded-xl border border-black/10 bg-[#FAFAF8]">
          <label className="block text-xs font-bold text-black/70 mb-1">A3 B&W Price</label>
          <div className="flex items-center">
            <span className="text-sm font-bold mr-1">₹</span>
            <input
              type="number"
              step="1"
              value={formData.a3BwSingle}
              onChange={(e) => updateField("a3BwSingle", parseFloat(e.target.value) || 0)}
              className="w-full font-bold text-sm bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-black/10 bg-[#FAFAF8]">
          <label className="block text-xs font-bold text-black/70 mb-1">A3 Colour Price</label>
          <div className="flex items-center">
            <span className="text-sm font-bold mr-1">₹</span>
            <input
              type="number"
              step="1"
              value={formData.a3ColorSingle}
              onChange={(e) => updateField("a3ColorSingle", parseFloat(e.target.value) || 0)}
              className="w-full font-bold text-sm bg-transparent outline-none"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-black/10 bg-[#FAFAF8]">
          <label className="block text-xs font-bold text-black/70 mb-1">Photo Print Price</label>
          <div className="flex items-center">
            <span className="text-sm font-bold mr-1">₹</span>
            <input
              type="number"
              step="1"
              value={formData.photoSingle}
              onChange={(e) => updateField("photoSingle", parseFloat(e.target.value) || 0)}
              className="w-full font-bold text-sm bg-transparent outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-3.5 rounded-xl border border-black/10 bg-white">
          <label className="block text-xs font-bold text-black/70 mb-1">Service Fee per Order</label>
          <div className="flex items-center">
            <span className="text-sm font-bold mr-1">₹</span>
            <input
              type="number"
              step="0.5"
              value={formData.serviceFee}
              onChange={(e) => updateField("serviceFee", parseFloat(e.target.value) || 0)}
              className="w-full font-bold text-sm outline-none"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-black/10 bg-white">
          <label className="block text-xs font-bold text-black/70 mb-1">Minimum Order Amount</label>
          <div className="flex items-center">
            <span className="text-sm font-bold mr-1">₹</span>
            <input
              type="number"
              step="1"
              value={formData.minOrderAmount}
              onChange={(e) => updateField("minOrderAmount", parseFloat(e.target.value) || 0)}
              className="w-full font-bold text-sm outline-none"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-black/10 bg-white">
          <label className="block text-xs font-bold text-black/70 mb-1">Max Pages Allowed</label>
          <input
            type="number"
            value={formData.maxAllowedPages}
            onChange={(e) => updateField("maxAllowedPages", parseInt(e.target.value, 10) || 100)}
            className="w-full font-bold text-sm outline-none"
          />
        </div>
      </div>
    </div>
  );
}
