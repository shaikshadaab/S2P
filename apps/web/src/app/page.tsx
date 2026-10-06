import Link from "next/link";
import { QrCode, Monitor, Printer, ShieldCheck, Cpu, ArrowRight } from "lucide-react";
import { BRAND_NAME, BRAND_FULL_NAME, PRIMARY_PILOT_SHOP } from "@s2p/shared";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#090d0b] text-[#f8fafc] flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-[#1c2621] bg-[#0b0f0e]/80 backdrop-blur px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-xl text-white tracking-wider shadow-lg shadow-emerald-950/50">
              {BRAND_NAME}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-lg">{BRAND_FULL_NAME}</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Phase 0 Foundation
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Pilot Deployment: <span className="text-emerald-400 font-semibold">{PRIMARY_PILOT_SHOP.name}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/s/shakeel-online-services"
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-[#161e1b] text-slate-300 hover:text-white hover:bg-[#1f2923] border border-[#24322c] transition"
            >
              Customer QR View
            </Link>
            <Link
              href="/dashboard"
              className="text-xs font-semibold px-3.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm transition"
            >
              Shop Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-medium mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>REAL ARCHITECTURE � ZERO HARDCODED FAKE DATA</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
            Scan-to-Print Operating System
          </h1>
          <p className="text-base text-slate-400 leading-relaxed">
            Engineered exclusively for <strong className="text-slate-200">{PRIMARY_PILOT_SHOP.name}</strong>.
            Connects self-service customer uploads directly to physical Windows print queues without requiring Wi-Fi printers or cloud drivers.
          </p>
        </div>

        {/* Two Main Portals */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* 1. Customer PWA Portal */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-8 flex flex-col justify-between hover:border-emerald-600/50 transition relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
            <div>
              <div className="w-12 h-12 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                <QrCode className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Customer Experience</span>
                <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Mobile PWA</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Customer Scan-to-Print</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Mobile-first self-service interface opened via counter QR scan. Uploads documents, validates page counts, applies authoritative shop rates, and provides order collection tokens.
              </p>
              <ul className="text-xs text-slate-300 space-y-2 mb-8">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Shop slug auto-selected: <code className="text-emerald-400">/s/shakeel-online-services</code>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  PDF & Image support (A4/A3, B&W, Color, Duplex)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Cash at counter & Manual UPI verification
                </li>
              </ul>
            </div>
            <Link
              href="/s/shakeel-online-services"
              className="inline-flex items-center justify-between w-full px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-lg shadow-emerald-950/40"
            >
              <span>Launch Customer Web Shell</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 2. Shop Dashboard Portal */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-8 flex flex-col justify-between hover:border-emerald-600/50 transition relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
            <div>
              <div className="w-12 h-12 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-emerald-400 mb-6">
                <Monitor className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Shop Operating System</span>
                <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Desktop Terminal</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Shop Counter Dashboard</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Windows desktop-optimized management console for shop operators. Manages live orders, counter walk-ins, print queue leases, rate cards, and Windows Print Agent pairing.
              </p>
              <ul className="text-xs text-slate-300 space-y-2 mb-8">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Real zero-state order board (No fake metrics)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Navigation shells: Orders, POS, Queue, Printers, Pricing, Settings
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Pairing controller for .NET 8 Windows Print Agent
                </li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-between w-full px-5 py-3 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-white font-semibold text-sm border border-slate-700 transition"
            >
              <span>Launch Shop Dashboard Shell</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Phase 0 Architecture Status Box */}
        <div className="bg-[#0e1411] border border-[#1f2923] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Phase 0 Foundation Checklist</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-[#131b17] border border-[#1d2b23] p-3 rounded-lg">
              <span className="text-emerald-400 font-bold block mb-1">? Firebase Architecture</span>
              <span className="text-slate-400">firestore.rules, storage.rules (PRIVATE), emulator config, indexes.</span>
            </div>
            <div className="bg-[#131b17] border border-[#1d2b23] p-3 rounded-lg">
              <span className="text-emerald-400 font-bold block mb-1">? Shared Types & Logic</span>
              <span className="text-slate-400">@s2p/shared: Pricing Engine, State Machines, 15/15 unit tests passing.</span>
            </div>
            <div className="bg-[#131b17] border border-[#1d2b23] p-3 rounded-lg">
              <span className="text-emerald-400 font-bold block mb-1">? Windows Print Agent</span>
              <span className="text-slate-400">.NET 8 S2P.PrintService & S2P.Tray solutions structured.</span>
            </div>
            <div className="bg-[#131b17] border border-[#1d2b23] p-3 rounded-lg">
              <span className="text-emerald-400 font-bold block mb-1">? Zero Fake Policy</span>
              <span className="text-slate-400">Zero mock orders, zero fake revenue, unbuilt features clearly disabled.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1c2621] bg-[#0b0f0e] px-6 py-6 text-center text-xs text-slate-500">
        <p className="font-medium">
          {BRAND_NAME} � {BRAND_FULL_NAME} � Developed for {PRIMARY_PILOT_SHOP.name}
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          Strictly original S2P platform � Multi-tenant architecture prepared for Indian print shops
        </p>
      </footer>
    </main>
  );
}
