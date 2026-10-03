"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  ListOrdered,
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  QrCode,
  Laptop,
  AlertTriangle,
  Download,
  Sparkles,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [agentOnline, setAgentOnline] = useState(true);
  const [activePrinter, setActivePrinter] = useState("HP51C8E5 (HP Smart Tank 580-590 series)");

  const loadData = () => {
    fetch("/api/orders?shopId=shop-om-sai-001")
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
      })
      .catch(() => {
        // Fallback demo orders
        setOrders([
          {
            id: "VNT-8942",
            customerName: "Rahul Sharma",
            customerMobile: "9876543210",
            status: "PRINTING",
            totalPages: 4,
            printableSides: 4,
            physicalSheets: 2,
            copies: 1,
            colorMode: "bw",
            createdAt: new Date().toISOString(),
          },
          {
            id: "VNT-8941",
            customerName: "Priya Patel",
            customerMobile: "9812345678",
            status: "QUEUED",
            totalPages: 2,
            printableSides: 2,
            physicalSheets: 2,
            copies: 2,
            colorMode: "color",
            createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
          },
          {
            id: "VNT-8940",
            customerName: "Sanjay Kumar",
            customerMobile: "9700011223",
            status: "COMPLETED",
            totalPages: 6,
            printableSides: 6,
            physicalSheets: 3,
            copies: 1,
            colorMode: "bw",
            createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
          },
        ]);
      });
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, []);

  const totalPrints = orders.reduce((acc, o) => acc + (o.physicalSheets || 1), 0);
  const queuedCount = orders.filter((o) => o.status === "QUEUED" || o.status === "PENDING_APPROVAL").length;
  const printingCount = orders.filter((o) => o.status === "PRINTING" || o.status === "CLAIMED").length;
  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Title & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#121018]">
              Shop Overview
            </h1>
            <p className="text-xs sm:text-sm text-black/60 mt-0.5">
              Live counter queue, printer status, and walk-in document stream.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-black/10 bg-white hover:bg-black/5 text-[#121018] shadow-xs transition-colors"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4 text-black/60" />
            </button>

            <Link
              href="/dashboard/qr-posters"
              className="px-4 py-2.5 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-pink-500/20 active:scale-95 transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>Print Shop Poster</span>
            </Link>
          </div>
        </div>

        {/* 1. AGENT & PRINTER STATUS HERO CARD */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-black/10 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                agentOnline ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              }`}>
                <Laptop className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${agentOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  <h3 className="font-extrabold text-lg text-[#121018]">
                    {agentOnline ? "Agent Online • Ready to Print" : "Agent Offline"}
                  </h3>
                </div>
                <p className="text-xs text-black/60">
                  {agentOnline ? (
                    <>Active Printer: <strong className="text-[#121018]">{activePrinter}</strong> • SHOP-COUNTER-PC</>
                  ) : (
                    "Windows Print Agent is not connected. Launch agent on shop computer to resume printing."
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/dashboard/printers"
                className="px-4 py-2 rounded-xl border border-black/10 hover:bg-black/5 text-xs font-bold text-[#121018] transition-colors"
              >
                Change Printer
              </Link>
              <a
                href="/downloads/VinthaPrintAgentSetup.exe"
                download="VinthaPrintAgentSetup.exe"
                className="px-4 py-2 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .exe</span>
              </a>
              <a
                href="/downloads/VinthaPrintAgent-Windows.zip"
                download="VinthaPrintAgent-Windows.zip"
                className="px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#FF2D78]" />
                <span>Download .zip</span>
              </a>
            </div>
          </div>
        </div>

        {/* 2. STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/10 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-black/50 uppercase tracking-wider block">Today's Jobs</span>
            <div className="text-3xl font-extrabold font-heading text-[#121018]">{orders.length}</div>
            <p className="text-[11px] text-black/40">Walk-in customer orders</p>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/10 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-black/50 uppercase tracking-wider block">Physical Sheets</span>
            <div className="text-3xl font-extrabold font-heading text-[#121018]">{totalPrints}</div>
            <p className="text-[11px] text-black/40">Total paper printed</p>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/10 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Queue Waiting</span>
            <div className="text-3xl font-extrabold font-heading text-amber-600">{queuedCount}</div>
            <p className="text-[11px] text-black/40">Next in line</p>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-black/10 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Completed</span>
            <div className="text-3xl font-extrabold font-heading text-emerald-600">{completedCount}</div>
            <p className="text-[11px] text-black/40">Ejected successfully</p>
          </div>
        </div>

        {/* 3. QUICK SETUP GUIDE (3 SIMPLE STEPS) */}
        <div className="bg-[#1E1035] text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FF2D78]" />
            <h3 className="font-extrabold text-base sm:text-lg">Quick Setup Checklist</h3>
          </div>
          <p className="text-xs text-white/70 max-w-2xl leading-relaxed">
            Follow these 3 simple steps to have walk-in customers print directly from their phone camera:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <span className="text-xs font-mono font-bold text-[#FF2D78]">Step 1</span>
              <h4 className="font-bold text-sm text-white">Print Shop Poster</h4>
              <p className="text-xs text-white/60">Display your QR code at the counter for customers to scan.</p>
              <Link href="/dashboard/qr-posters" className="text-xs text-[#FF2D78] hover:underline font-bold inline-block pt-1">
                View Poster →
              </Link>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <span className="text-xs font-mono font-bold text-[#FF2D78]">Step 2</span>
              <h4 className="font-bold text-sm text-white">Download Agent</h4>
              <p className="text-xs text-white/60">Install and pair with your shop's 6-digit code.</p>
              <div className="flex items-center gap-2 pt-1">
                <a href="/downloads/VinthaPrintAgentSetup.exe" download className="text-xs text-[#FF2D78] hover:underline font-bold">
                  Download .exe →
                </a>
                <span className="text-white/30">•</span>
                <a href="/downloads/VinthaPrintAgent-Windows.zip" download className="text-xs text-white/70 hover:underline">
                  .zip
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
              <span className="text-xs font-mono font-bold text-[#FF2D78]">Step 3</span>
              <h4 className="font-bold text-sm text-white">Select Printer</h4>
              <p className="text-xs text-white/60">Pick your USB/Network printer in Printers & Agent.</p>
              <Link href="/dashboard/printers" className="text-xs text-[#FF2D78] hover:underline font-bold inline-block pt-1">
                Manage Printers →
              </Link>
            </div>
          </div>
        </div>

        {/* 4. RECENT ORDERS TABLE */}
        <div className="bg-white rounded-3xl border border-black/10 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-black/5 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-[#121018]">Live Print Queue</h3>
              <p className="text-xs text-black/50">Real-time walk-in orders</p>
            </div>
            <Link
              href="/dashboard/orders"
              className="text-xs font-bold text-[#FF2D78] hover:underline flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAFAF8] text-black/50 font-bold border-b border-black/5">
                <tr>
                  <th className="py-3 px-6">Order ID</th>
                  <th className="py-3 px-6">Customer</th>
                  <th className="py-3 px-6">Document Details</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-medium">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-black/40">
                      No print jobs received yet. Scan your shop QR code to test!
                    </td>
                  </tr>
                ) : (
                  orders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-black/[0.02] transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-[#121018]">{order.id}</td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-[#121018] block">{order.customerName}</span>
                        <span className="text-[10px] text-black/40">{order.customerMobile}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="block font-semibold">
                          {order.totalPages || 1} Pgs • {order.copies || 1} Copy • {order.colorMode === "color" ? "🎨 Color" : "📄 B&W"}
                        </span>
                        <span className="text-[10px] text-black/40">
                          {order.paperSize || "A4"} • {order.isDuplex ? "Duplex" : "Single"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700"
                            : order.status === "PRINTING"
                            ? "bg-amber-50 text-amber-700 animate-pulse"
                            : order.status === "QUEUED"
                            ? "bg-blue-50 text-blue-700"
                            : order.status === "PENDING_APPROVAL"
                            ? "bg-purple-50 text-purple-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-black/50 text-[11px]">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
