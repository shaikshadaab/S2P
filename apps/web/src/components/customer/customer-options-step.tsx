"use client";

import React from "react";
import { Copy, FileSpreadsheet, Layers, Sliders, Palette, FileText } from "lucide-react";

interface CustomerOptionsStepProps {
  totalPages: number;
  options: any;
  setOptions: (opts: any) => void;
}

export function CustomerOptionsStep({ totalPages, options, setOptions }: CustomerOptionsStepProps) {
  const update = (field: string, val: any) => {
    setOptions((prev: any) => ({ ...prev, [field]: val }));
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Range Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-black/70 uppercase tracking-wider">
            Step 2: Select Pages to Print
          </label>
          <span className="text-xs text-black/50 font-medium">Total: {totalPages} pages</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {["all", "odd", "even", "custom"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                if (mode === "all" || mode === "odd" || mode === "even") {
                  update("pageRangeText", mode);
                } else {
                  update("pageRangeText", "1-" + Math.min(3, totalPages));
                }
              }}
              className={`py-2 px-1 rounded-xl text-xs font-bold uppercase transition-all ${
                (mode === "custom" && !["all", "odd", "even"].includes(options.pageRangeText)) ||
                options.pageRangeText === mode
                  ? "bg-[#121018] text-white shadow-sm"
                  : "bg-white border border-black/10 text-black/70 hover:border-black/20"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Custom Range input if selected */}
        {!["all", "odd", "even"].includes(options.pageRangeText) && (
          <div className="p-3 bg-white rounded-xl border border-black/10 space-y-1">
            <label className="text-[11px] font-bold text-black/60 uppercase">Enter Page Range</label>
            <input
              type="text"
              value={options.pageRangeText}
              onChange={(e) => update("pageRangeText", e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-black/15 font-mono text-xs font-bold"
              placeholder="e.g. 1-3, 5, 8-10"
            />
            <p className="text-[10px] text-black/40">Use commas for individual pages, hyphen for ranges.</p>
          </div>
        )}
      </div>

      {/* 2. Color Mode */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-black/70 uppercase tracking-wider block">
          Step 3: Print Options
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => update("colorMode", "bw")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              options.colorMode === "bw"
                ? "border-2 border-[#121018] bg-[#121018] text-white shadow-md"
                : "border-black/10 bg-white text-black/70 hover:border-black/20"
            }`}
          >
            <span className="block font-extrabold text-sm">Black & White</span>
            <span className={`block text-[11px] mt-0.5 ${options.colorMode === "bw" ? "text-white/70" : "text-black/50"}`}>
              Standard monochrome print
            </span>
          </button>

          <button
            type="button"
            onClick={() => update("colorMode", "color")}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              options.colorMode === "color"
                ? "border-2 border-[#20C878] bg-[#E8FAF1] text-[#18AA64] shadow-md font-bold"
                : "border-black/10 bg-white text-black/70 hover:border-black/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-[#121018]">Colour Print</span>
              <Palette className="w-4 h-4 text-[#20C878]" />
            </div>
            <span className="block text-[11px] text-black/50 mt-0.5 font-normal">
              High-resolution full color
            </span>
          </button>
        </div>
      </div>

      {/* 3. Single vs Double Sided (Duplex) */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-black/70 uppercase tracking-wider block">
          Sides & Duplex
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => update("isDuplex", false)}
            className={`p-3 rounded-xl border text-left transition-all ${
              !options.isDuplex
                ? "border-2 border-[#20C878] bg-[#E8FAF1]/40 font-bold"
                : "border-black/10 bg-white text-black/60"
            }`}
          >
            <span className="text-xs block text-[#121018]">Single-Sided</span>
            <span className="text-[10px] text-black/40 block">1 side per sheet</span>
          </button>

          <button
            type="button"
            onClick={() => update("isDuplex", true)}
            className={`p-3 rounded-xl border text-left transition-all ${
              options.isDuplex
                ? "border-2 border-[#20C878] bg-[#E8FAF1]/40 font-bold"
                : "border-black/10 bg-white text-black/60"
            }`}
          >
            <span className="text-xs block text-[#121018]">Double-Sided (Duplex)</span>
            <span className="text-[10px] text-black/40 block">Save paper • Flip both sides</span>
          </button>
        </div>
      </div>

      {/* 4. Copies & Pages per Sheet */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white rounded-xl border border-black/10">
          <label className="text-[11px] font-bold text-black/60 uppercase block mb-1.5">Number of Copies</label>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => update("copies", Math.max(1, (options.copies || 1) - 1))}
              className="w-8 h-8 rounded-lg bg-black/5 hover:bg-black/10 font-bold text-base flex items-center justify-center"
            >
              -
            </button>
            <span className="text-base font-extrabold font-mono">{options.copies || 1}</span>
            <button
              type="button"
              onClick={() => update("copies", Math.min(100, (options.copies || 1) + 1))}
              className="w-8 h-8 rounded-lg bg-[#20C878] text-white hover:bg-[#18AA64] font-bold text-base flex items-center justify-center shadow-sm"
            >
              +
            </button>
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-black/10">
          <label className="text-[11px] font-bold text-black/60 uppercase block mb-1.5">Pages Per Sheet</label>
          <select
            value={options.pagesPerSheet || 1}
            onChange={(e) => update("pagesPerSheet", parseInt(e.target.value, 10))}
            className="w-full text-xs font-bold py-1.5 px-2 rounded-lg border border-black/10 bg-[#FAFAF8] outline-none"
          >
            <option value={1}>1 Page / Sheet</option>
            <option value={2}>2 Pages / Sheet (Save 50%)</option>
            <option value={4}>4 Pages / Sheet</option>
          </select>
        </div>
      </div>
    </div>
  );
}
