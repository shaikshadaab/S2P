"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface StepSlugProps {
  formData: any;
  updateField: (field: string, value: any) => void;
}

export function StepSlug({ formData, updateField }: StepSlugProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold font-heading">Step 3: Unique Public Shop URL</h2>
        <p className="text-sm text-black/60 mt-1">
          This permanent link will be encoded in your counter QR code. Customers can also bookmark it on their phone.
        </p>
      </div>

      <div className="p-6 bg-[#FAFAF8] rounded-2xl border border-black/10 space-y-4">
        <label className="block text-xs font-bold text-black/70 uppercase">Your Shop Web Address</label>
        <div className="flex items-center rounded-xl border-2 border-[#20C878] bg-white overflow-hidden shadow-sm">
          <span className="px-4 py-3 bg-black/5 text-xs sm:text-sm font-mono text-black/60 border-r border-black/10">
            https://vintha.ai/shop/
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
            placeholder="your-shop-slug"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-[#18AA64] font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Slug is available! Your permanent URL: /shop/{formData.slug}</span>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-black/10 bg-white flex items-center justify-between text-xs text-black/60">
        <span>The QR code will stay permanently connected to this shop even if shop details change.</span>
      </div>
    </div>
  );
}
