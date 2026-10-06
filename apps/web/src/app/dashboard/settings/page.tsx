"use client";

import React from "react";
import { Settings, Shield, Building, Globe, Coins, ShieldCheck, UserCheck } from "lucide-react";
import { PRIMARY_PILOT_SHOP } from "@s2p/shared";
import { useAuth } from "../../../lib/firebase/auth-context";

export default function DashboardSettingsPage() {
  const { user, role } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Shop Profile &amp; Settings Foundation</h2>
              <p className="text-xs text-slate-400">
                Tenant parameters and operational configuration for {PRIMARY_PILOT_SHOP.name}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
            {role || "OWNER"}
          </span>
        </div>
      </div>

      {/* Shop Foundation Parameters */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 space-y-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Building className="w-4 h-4 text-emerald-400" />
          <span>Tenant &amp; Shop Identity</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Shop Name</span>
            <span className="text-white font-bold">{PRIMARY_PILOT_SHOP.name}</span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Unique Slug</span>
            <code className="text-emerald-400 font-mono font-bold">{PRIMARY_PILOT_SHOP.slug}</code>
          </div>

          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Currency</span>
            <span className="text-white font-bold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>INR (₹ Indian Rupee)</span>
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Timezone</span>
            <span className="text-white font-bold flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Asia/Kolkata (IST)</span>
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Tenant Status</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>ACTIVE</span>
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-[#161e1b] border border-[#24322c]">
            <span className="text-slate-400 block text-[11px] mb-1">Active Staff Role</span>
            <span className="text-white font-bold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{role || "OWNER"} ({user?.email || "owner@shakeelprints.com"})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Security Policies */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-2">
          <h4 className="font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Document Privacy Policy</span>
          </h4>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Customer uploaded documents are stored in strict private buckets. Documents are automatically purged after <strong>2 hours</strong> following print completion.
          </p>
        </div>

        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 space-y-2">
          <h4 className="font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cross-Tenant Isolation</span>
          </h4>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Firestore security rules ensure Shop A staff cannot read Shop B private orders, queue data, or customers.
          </p>
        </div>
      </div>
    </div>
  );
}
