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
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuth } from "../../lib/firebase/auth-context";
import { BRAND_NAME, PRIMARY_PILOT_SHOP } from "@s2p/shared";
import { SosLogo } from "@/components/common/SosLogo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  const { user, login, resetPassword, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);

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
      await login(email.trim(), password);
      router.push(nextUrl);
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      if (
        fbErr.code === "auth/invalid-credential" ||
        fbErr.code === "auth/user-not-found" ||
        fbErr.code === "auth/wrong-password"
      ) {
        setError("Invalid email or password. Please verify your credentials or use Forgot Password.");
      } else if (fbErr.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please wait a few minutes or reset your password.");
      } else {
        setError(fbErr.message || "Authentication failed. Please verify your network connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your registered email address first.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(cleanEmail);
      setResetSuccess(`Password reset email sent to ${cleanEmail}. Check your inbox or spam folder.`);
      setShowForgot(false);
    } catch (err: unknown) {
      const fbErr = err as { message?: string };
      setError(fbErr.message || "Failed to send password reset email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 shadow-md space-y-5">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {resetSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{resetSuccess}</span>
        </div>
      )}

      {!showForgot ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1.5">
              Owner / Staff Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shaikshadaab16@gmail.com"
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
              />
            </div>
            <p className="text-[11px] text-[#475569] mt-1">
              Authorized Firebase account registered for {PRIMARY_PILOT_SHOP.name}.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#111827]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-10 pr-11 py-2.5 text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
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
          <div className="text-left space-y-1">
            <h3 className="text-sm font-bold text-[#111827]">Reset Owner Password</h3>
            <p className="text-xs text-[#475569]">
              Enter your registered Firebase email address. A password reset link will be sent to your inbox.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111827] mb-1.5">
              Registered Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="shaikshadaab16@gmail.com"
                className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="flex-1 py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-[#475569] hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      <header className="border-b border-[#E2E8F0] px-6 py-4 bg-white shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#475569] hover:text-[#111827] transition font-bold text-xs">
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-xs text-[#475569] font-mono font-medium">Owner &amp; Staff Access Portal</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-3">
              <SosLogo variant="horizontal" size="lg" />
            </div>
            <h1 className="text-2xl font-black text-[#111827] tracking-tight">
              Owner &amp; Staff Sign In
            </h1>
            <p className="text-xs text-[#475569] max-w-sm mx-auto">
              Secure administrative access for {PRIMARY_PILOT_SHOP.name}. Customers do not require an account to upload or print documents.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center text-xs text-[#475569] flex items-center justify-center gap-2 shadow-xs">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                <span>Loading sign in terminal...</span>
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fail-Closed Membership Authorization</span>
            </div>
            <p className="text-[10px] text-[#64748B]">
              Only approved staff for shop {PRIMARY_PILOT_SHOP.id} can view orders or printer queues.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E2E8F0] py-4 text-center text-xs text-[#64748B] bg-white">
        &copy; {new Date().getFullYear()} {BRAND_NAME} &bull; Shakeel Online Services, Guntur.
      </footer>
    </div>
  );
}
