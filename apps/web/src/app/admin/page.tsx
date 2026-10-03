"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Store,
  Printer,
  IndianRupee,
  Users,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function PlatformAdminPage() {
  const [shops, setShops] = useState([
    {
      id: "shop-1",
      name: "Om Sai Xerox & Digital Print",
      slug: "om-sai-print",
      owner: "Vinod Rao (9876543210)",
      city: "Hyderabad",
      plan: "Pro (₹399/mo)",
      status: "ACTIVE",
      totalOrders: 642,
    },
    {
      id: "shop-2",
      name: "Sharma Xerox & Printing Hub",
      slug: "sharma-print-hub",
      owner: "Ramesh Sharma (9811223344)",
      city: "Bengaluru",
      plan: "Business (₹599/mo)",
      status: "ACTIVE",
      totalOrders: 189,
    },
    {
      id: "shop-3",
      name: "Sai Balaji Stationery",
      slug: "sai-balaji",
      owner: "K. Balaji (9900112233)",
      city: "Vijayawada",
      plan: "Free Starter",
      status: "PENDING_VERIFICATION",
      totalOrders: 12,
    },
  ]);

  const toggleShopStatus = (shopId: string) => {
    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId ? { ...s, status: s.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" } : s
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#121018] text-white flex flex-col">
      {/* Admin Top Nav */}
      <header className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-[#191624]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#20C878] text-[#121018] flex items-center justify-center font-bold">
            VP
          </div>
          <span className="font-extrabold text-base font-heading">
            Vintha Platform Superadmin
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F23868]/20 text-[#F23868] border border-[#F23868]/30">
            INTERNAL AUDIT ONLY
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link href="/dashboard" className="text-white/60 hover:text-white">
            Switch to Shop Dashboard
          </Link>
          <span className="text-white/20">•</span>
          <span className="text-[#20C878]">admin@vintha.ai</span>
        </div>
      </header>

      {/* Main Admin Metrics */}
      <main className="max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-8 flex-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading">Platform Telemetry & Operations</h1>
          <p className="text-xs text-white/60 mt-1">
            Global monitoring across all registered shops, PhonePe settlements, and paired Windows agents.
          </p>
        </div>

        {/* Global KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1C1827] rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] font-bold text-white/50 uppercase">Total Active Shops</span>
            <div className="text-3xl font-extrabold font-heading text-white">48</div>
            <p className="text-[11px] text-[#20C878] font-semibold">+6 this week</p>
          </div>

          <div className="bg-[#1C1827] rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] font-bold text-white/50 uppercase">Gross Platform Volume</span>
            <div className="text-3xl font-extrabold font-heading text-[#20C878]">₹1,84,920</div>
            <p className="text-[11px] text-white/50">PhonePe Verified</p>
          </div>

          <div className="bg-[#1C1827] rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] font-bold text-white/50 uppercase">Total Print Jobs</span>
            <div className="text-3xl font-extrabold font-heading text-[#6D3AE8]">12,840</div>
            <p className="text-[11px] text-white/50">99.1% Spooler success</p>
          </div>

          <div className="bg-[#1C1827] rounded-2xl p-5 border border-white/10 space-y-1">
            <span className="text-[11px] font-bold text-white/50 uppercase">Active Windows Agents</span>
            <div className="text-3xl font-extrabold font-heading text-white">52</div>
            <p className="text-[11px] text-[#20C878] font-semibold">Heartbeat active (25s)</p>
          </div>
        </div>

        {/* Shops Management Table */}
        <div className="bg-[#1C1827] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
              All Registered Shops
            </h3>
            <span className="text-xs text-white/50">Showing 3 registered print outlets</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-black/30 text-white/50 uppercase font-bold text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Shop Name</th>
                <th className="py-3 px-4">Public Slug</th>
                <th className="py-3 px-4">Owner Contact</th>
                <th className="py-3 px-4">Current Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {shops.map((s) => (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="py-3.5 px-4 font-bold text-white">{s.name}</td>
                  <td className="py-3.5 px-4 font-mono text-[#20C878]">
                    <Link href={`/shop/${s.slug}`} target="_blank" className="hover:underline">
                      /shop/{s.slug}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-white/70">{s.owner}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#6D3AE8]">{s.plan}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === "ACTIVE"
                          ? "bg-[#20C878]/20 text-[#20C878]"
                          : s.status === "SUSPENDED"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-300"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => toggleShopStatus(s.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        s.status === "ACTIVE"
                          ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                          : "bg-[#20C878]/20 text-[#20C878] hover:bg-[#20C878]/30"
                      }`}
                    >
                      {s.status === "ACTIVE" ? "Suspend Shop" : "Restore Shop"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
