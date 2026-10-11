"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { PRIMARY_PILOT_SHOP } from "@s2p/shared";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary Caught]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-8 space-y-5 shadow-xs">
        <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-[#111827]">
            Dashboard Notice
          </h2>
          <p className="text-xs text-[#475569] leading-relaxed">
            {error?.message || "An unexpected error occurred while loading this dashboard view."}
          </p>
          {error?.digest && (
            <p className="text-[10px] font-mono text-slate-400">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/dashboard"
            className="flex-1 py-2.5 px-4 rounded-xl border border-[#E2E8F0] hover:bg-slate-50 text-[#111827] font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Overview</span>
          </Link>
        </div>

        <p className="text-[11px] text-slate-400 pt-1">
          {PRIMARY_PILOT_SHOP.name} · SOS Print
        </p>
      </div>
    </div>
  );
}
