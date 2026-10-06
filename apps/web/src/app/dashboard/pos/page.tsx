import React from "react";
import { Calculator, Clock } from "lucide-react";
import { PRIMARY_PILOT_SHOP } from "@s2p/shared";

export default function DashboardPosPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Counter POS System</h2>
            <p className="text-xs text-slate-400">
              Walk-in order entry terminal for {PRIMARY_PILOT_SHOP.name} staff
            </p>
          </div>
        </div>

        <div className="bg-[#161e1b] border border-[#24322c] rounded-lg p-5 space-y-3 text-xs leading-relaxed text-slate-300">
          <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
            <Clock className="w-4 h-4" />
            <span>Planned for Phase 9</span>
          </div>
          <p>
            The Counter POS is specifically designed for high-speed walk-in customers at Shakeel Online Services.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-400">
            <li>Single-screen document upload or scan ingestion.</li>
            <li>Instant page count extraction and live rate preview.</li>
            <li>One-click Cash or Manual UPI collection with printed token generation.</li>
            <li>Direct assignment to physical print queue without customer phone required.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
