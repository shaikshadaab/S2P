"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Printer, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#121018] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#1E1035] flex items-center justify-center text-white shadow-md">
            <Printer className="w-5 h-5 text-[#FF2D78]" />
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold font-heading text-[#1E1035]">
              vintha
            </span>
            <span className="text-2xl font-black text-[#FF2D78] ml-0.5">
              Print
            </span>
          </div>
        </Link>
        <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold font-heading text-[#121018]">
          Reset Shop Password
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-black/60">
          Enter your registered email address to receive password reset instructions.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-3xl border border-black/10 shadow-sm space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="font-extrabold text-base text-[#121018]">Password Reset Link Sent</h4>
              <p className="text-xs text-black/60">
                If an account exists with <strong className="text-[#121018]">{email}</strong>, a secure reset link has been dispatched.
              </p>
              <div className="pt-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF2D78] hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Login</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-black/70 uppercase mb-1">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-[#FF2D78] outline-none text-sm font-medium"
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] text-white font-bold text-sm shadow-md shadow-pink-500/20 transition-all active:scale-95"
              >
                Send Reset Link
              </button>

              <div className="text-center pt-2">
                <Link href="/login" className="text-xs font-semibold text-black/60 hover:text-black">
                  Remember your password? Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
