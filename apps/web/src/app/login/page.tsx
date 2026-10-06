"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  Loader2
} from "lucide-react";
import { useAuth } from "../../lib/firebase/auth-context";
import { BRAND_NAME, BRAND_FULL_NAME, PRIMARY_PILOT_SHOP } from "@s2p/shared";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  const { user, login, resetPassword, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  const isEmulator =
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" &&
    process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (!authLoading && user) {
      router.push(nextUrl);
    }
  }, [user, authLoading, nextUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push(nextUrl);
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      if (
        fbErr.code === "auth/invalid-credential" ||
        fbErr.code === "auth/user-not-found" ||
        fbErr.code === "auth/wrong-password"
      ) {
        setError("Invalid email or password. Please verify your credentials.");
      } else if (fbErr.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.");
      } else {
        setError(fbErr.message || "Authentication failed. Please verify connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your registered email address above.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(email);
      setResetSuccess(`Password reset email sent to ${email}. Check your inbox.`);
      setShowForgot(false);
    } catch (err: unknown) {
      const fbErr = err as { message?: string };
      setError(fbErr.message || "Failed to send password reset email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-6 sm:p-8 shadow-2xl">
      {isEmulator && (
        <div className="mb-5 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between">
          <span className="font-mono">Emulator Environment</span>
          <span className="text-[10px] text-amber-400/80">Use seeded staff accounts</span>
        </div>
      )}

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {resetSuccess && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>{resetSuccess}</span>
        </div>
      )}

      {!showForgot ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@shakeelprints.com"
                className="w-full bg-[#161e1b] border border-[#24322c] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 transition"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#161e1b] border border-[#24322c] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-950/60 transition flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div className="text-left mb-2">
            <h3 className="text-sm font-bold text-white">Reset Password</h3>
            <p className="text-xs text-slate-400 mt-1">
              We will send a password restoration link to your registered email address.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@shakeelprints.com"
                className="w-full bg-[#161e1b] border border-[#24322c] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="flex-1 py-2.5 rounded-xl bg-[#161e1b] border border-[#24322c] text-slate-300 hover:text-white text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition"
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#090d0b] text-[#f8fafc] flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <header className="border-b border-[#1c2621] px-6 py-4 bg-[#0b0f0e]/80 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-slate-300 hover:text-white transition">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-semibold">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400 font-mono">Staff Authentication Portal</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-2xl text-white tracking-wider shadow-xl shadow-emerald-950/80 mx-auto mb-4 border border-emerald-500/30">
              {BRAND_NAME}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {BRAND_FULL_NAME}
            </h1>
            <p className="text-xs text-emerald-400 font-semibold tracking-wide uppercase mt-1">
              {PRIMARY_PILOT_SHOP.name}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Staff &amp; Owner Authentication Terminal
            </p>
          </div>

          <Suspense
            fallback={
              <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>Loading authentication terminal...</span>
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <div className="mt-6 text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Tenant RBAC &amp; Tenant Isolation Active</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Only authorized staff of {PRIMARY_PILOT_SHOP.name} can access administrative print queues.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#1c2621] py-4 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} {BRAND_FULL_NAME}. Operating System for {PRIMARY_PILOT_SHOP.name}.
      </footer>
    </div>
  );
}
