"use client";

import React from "react";

interface StepShopProps {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export function StepShop({ formData, updateField }: StepShopProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold font-heading">Step 2: Shop & Counter Information</h2>
        <p className="text-sm text-black/60 mt-1">This information appears on your customer print portal and QR posters.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-black/70 uppercase mb-1">Shop Name</label>
          <input
            type="text"
            value={formData.shopName}
            onChange={(e) => updateField("shopName", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium"
            placeholder="e.g. Om Sai Xerox & Print"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-black/70 uppercase mb-1">Business Category</label>
          <input
            type="text"
            value={formData.businessCategory}
            onChange={(e) => updateField("businessCategory", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium"
            placeholder="e.g. Xerox, Stationery & Cyber Cafe"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-black/70 uppercase mb-1">Full Shop Address</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => updateField("address", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium"
          placeholder="Shop number, landmark, road or market name"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold text-black/70 uppercase mb-1">City</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => updateField("city", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-black/70 uppercase mb-1">State</label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => updateField("state", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-black/70 uppercase mb-1">PIN Code</label>
          <input
            type="text"
            maxLength={6}
            value={formData.pinCode}
            onChange={(e) => updateField("pinCode", e.target.value.replace(/\D/g, ""))}
            className="w-full px-3 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-black/70 uppercase mb-1">Shop WhatsApp Helpline</label>
          <input
            type="tel"
            maxLength={10}
            value={formData.whatsappNumber}
            onChange={(e) => updateField("whatsappNumber", e.target.value.replace(/\D/g, ""))}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium"
            placeholder="Customer WhatsApp inquiries"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-black/70 uppercase mb-1">GST Number (Optional)</label>
          <input
            type="text"
            value={formData.gstNumber}
            onChange={(e) => updateField("gstNumber", e.target.value.toUpperCase())}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium font-mono"
            placeholder="22AAAAA0000A1Z5"
          />
        </div>
      </div>
    </div>
  );
}
