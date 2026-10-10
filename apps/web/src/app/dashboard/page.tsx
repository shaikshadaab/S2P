"use client";

import React from "react";
import Link from "next/link";
import {
  Download,
  Laptop,
  Printer,
  FileCheck,
  QrCode,
  Calculator,
  Layers,
  FileText,
  Tag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { PRIMARY_PILOT_SHOP } from "@s2p/shared";
import DashboardOrdersView from "./orders/page";

export default function DashboardOverviewPage() {
  const setupSteps = [
    {
      num: 1,
      title: "Download Agent",
      desc: "Get SOS-Print-Agent-Package.zip (2.65 MB) on your shop Windows PC.",
      href: "/SOS-Print-Agent-Package.zip",
      download: "SOS-Print-Agent-Package.zip",
      icon: Download,
      cta: "Download ZIP",
      isExternal: false
    },
    {
      num: 2,
      title: "Pair Shop PC",
      desc: "Generate 5-min pairing code and enter it into the agent.",
      href: "/dashboard/setup",
      icon: Laptop,
      cta: "Guided Setup",
      isExternal: false
    },
    {
      num: 3,
      title: "Map Printer",
      desc: "Select your installed Windows printer for auto-dispatch.",
      href: "/dashboard/printers",
      icon: Printer,
      cta: "Configure",
      isExternal: false
    },
    {
      num: 4,
      title: "Test Print",
      desc: "Send an authorized test sheet to verify physical paper output.",
      href: "/dashboard/printers",
      icon: FileCheck,
      cta: "Run Test",
      isExternal: false
    },
    {
      num: 5,
      title: "Download Shop QR Poster",
      desc: "Print high-contrast A4 or A5 poster for counter standee.",
      href: "/dashboard/standee",
      icon: QrCode,
      cta: "Get Poster",
      isExternal: false
    }
  ];

  const quickNav = [
    {
      title: "Counter Cashier",
      subtitle: "Confirm Cash & Direct UPI payments",
      href: "/dashboard/counter",
      icon: Calculator,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200"
    },
    {
      title: "Orders Live Feed",
      subtitle: "Inspect items, pages, customer details",
      href: "/dashboard/orders",
      icon: FileText,
      color: "bg-blue-50 text-blue-800 border-blue-200"
    },
    {
      title: "Print Queue",
      subtitle: "Monitor active leases & agent rendering",
      href: "/dashboard/queue",
      icon: Layers,
      color: "bg-purple-50 text-purple-800 border-purple-200"
    },
    {
      title: "Printers & Agent",
      subtitle: "Windows Spooler agent pairing & status",
      href: "/dashboard/printers",
      icon: Printer,
      color: "bg-amber-50 text-amber-800 border-amber-200"
    },
    {
      title: "Shop QR & Poster",
      subtitle: "A4 / A5 printable standee with verified QR",
      href: "/dashboard/standee",
      icon: QrCode,
      color: "bg-teal-50 text-teal-800 border-teal-200"
    },
    {
      title: "Printing Rates",
      subtitle: "Manage B&W, color, duplex & passport rates",
      href: "/dashboard/pricing",
      icon: Tag,
      color: "bg-slate-100 text-slate-800 border-slate-300"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Overview Top Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Active Pilot Shop: {PRIMARY_PILOT_SHOP.id}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight mt-1">
            Shakeel Online Services — Shop Dashboard
          </h1>
          <p className="text-xs text-[#475569] mt-0.5">
            Owner administrative control center for self-service QR intake, counter cashier verification, and Windows agent spooler printing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/print"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold text-xs transition flex items-center gap-1.5"
          >
            <span>Preview Customer QR (/print)</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        </div>
      </div>

      {/* 5-Step Commissioning & Setup Pipeline Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Shop Commissioning & Setup Pipeline</span>
            </h2>
            <p className="text-[11px] text-[#475569]">
              Complete these 5 steps in order on your shop Windows computer to activate automated self-service printing.
            </p>
          </div>
          <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
            Step 1 → Step 5 Flow
          </div>
        </div>

        {/* 5 Sequential Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {setupSteps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between hover:border-emerald-300 transition group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                      {step.num}
                    </span>
                    <Icon className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-bold text-xs text-[#111827]">{step.title}</h3>
                  <p className="text-[11px] text-[#475569] mt-1 leading-snug">{step.desc}</p>
                </div>

                <div className="pt-3 mt-2 border-t border-[#E2E8F0]/60">
                  {step.download ? (
                    <a
                      href={step.href}
                      download={step.download}
                      className="w-full py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>{step.cta}</span>
                    </a>
                  ) : (
                    <Link
                      href={step.href}
                      className="w-full py-1.5 px-2 rounded-lg bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#111827] font-bold text-[11px] transition flex items-center justify-center gap-1 group-hover:border-emerald-400 shadow-2xs"
                    >
                      <span>{step.cta}</span>
                      <ChevronRight className="w-3 h-3 text-emerald-600" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickNav.map((nav) => {
          const Icon = nav.icon;
          return (
            <Link
              key={nav.href}
              href={nav.href}
              className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs hover:shadow-md hover:border-emerald-300 transition flex items-start gap-3.5 group cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${nav.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-[#111827] group-hover:text-emerald-700 transition">
                    {nav.title}
                  </h3>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-[11px] text-[#475569] mt-0.5 leading-snug">
                  {nav.subtitle}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Orders Live Feed */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-[#111827] flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Live Customer Orders</span>
            </h2>
            <p className="text-[11px] text-[#475569]">
              Realtime feed of customer uploads awaiting payment or ready for spooling.
            </p>
          </div>
          <Link
            href="/dashboard/counter"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Open Cashier Counter →</span>
          </Link>
        </div>

        <DashboardOrdersView />
      </div>
    </div>
  );
}
