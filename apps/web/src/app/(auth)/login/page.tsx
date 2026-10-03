"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, ArrowRight, ShieldCheck, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("om-sai-print");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Please enter your registered shop slug, email, or mobile number.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your account password.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#121018] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-11 h-11 rounded-2xl bg-[#1E1035] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Printer className="w-5 h-5 text-[#FF2D78]" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold tracking-tight text-[#1E1035] font-heading">
              vintha
            </span>
            <span className="text-2xl font-black text-[#FF2D78] ml-0.5">
              Print
            </span>
            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF2D78]/20 text-[#FF2D78] uppercase">
              Free
            </span>
          </div>
        </Link>
        <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold font-heading text-[#121018]">
          Shop Owner & Staff Login
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-black/60">
          Sign in to manage your printers, view live walk-in queue, and print posters.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-black/10 shadow-sm space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                Shop Slug, Email or Mobile
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 focus:border-[#FF2D78] outline-none text-sm font-medium"
                  placeholder="e.g. om-sai-print or 9876543210"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-black/70 uppercase">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-[#FF2D78] hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 focus:border-[#FF2D78] outline-none text-sm font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-pink-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{loading ? "Signing in..." : "Login to Shop Dashboard"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-black/5 text-center text-xs text-black/60">
            Don&apos;t have a shop registered yet?{" "}
            <Link href="/onboarding" className="font-extrabold text-[#FF2D78] hover:underline ml-1">
              Create Free Account (100% Free)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
