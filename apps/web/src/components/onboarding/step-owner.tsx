"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

interface StepOwnerProps {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export function StepOwner({ formData, updateField }: StepOwnerProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold font-heading">Step 1: Create Shop Owner Account</h2>
        <p className="text-sm text-black/60 mt-1">Register the primary owner account to manage your print shop.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-black/70 uppercase mb-1">Full Name</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium"
            placeholder="e.g. Ramesh Sharma"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-black/70 uppercase mb-1">10-Digit Mobile Number</label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-black/10 bg-black/5 text-xs font-bold text-black/60">
              +91
            </span>
            <input
              type="tel"
              maxLength={10}
              value={formData.mobile}
              onChange={(e) => updateField("mobile", e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-2.5 rounded-r-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium"
              placeholder="9876543210"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-black/70 uppercase mb-1">Email Address</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => updateField("email", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium"
          placeholder="ramesh@sharmaprint.in"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-black/70 uppercase mb-1">Account Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => updateField("password", e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#20C878] outline-none text-sm font-medium"
          placeholder="Minimum 8 characters"
        />
      </div>

      <div className="p-3.5 bg-[#E8FAF1] rounded-xl border border-[#20C878]/30 flex items-center gap-2.5 text-xs text-[#18AA64] font-medium">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>Zero spam guarantee. OTP and instant email verification will be enabled.</span>
      </div>
    </div>
  );
}
