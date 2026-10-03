"use client";

import React from "react";
import Link from "next/link";
import { Printer, Heart, Download } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1E1035] text-white pt-14 pb-8 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <Printer className="w-5 h-5 text-[#FF2D78]" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">
                Vintha <span className="text-[#FF2D78]">Print</span>
              </span>
            </Link>
            <p className="text-sm text-white/70 max-w-sm leading-relaxed">
              The 100% free QR-based printing system for cyber cafes, photocopy shops, and stationery centers across India.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold text-[#FF2D78]">
              <span>Zero Fees • Zero Subscriptions • Completely Free</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white/40">Shop Dashboard</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">Overview</Link>
              </li>
              <li>
                <Link href="/dashboard/qr-posters" className="hover:text-white transition-colors">QR & Poster</Link>
              </li>
              <li>
                <Link href="/dashboard/orders" className="hover:text-white transition-colors">Live Orders</Link>
              </li>
              <li>
                <Link href="/dashboard/printers" className="hover:text-white transition-colors">Printers & Agent</Link>
              </li>
              <li>
                <Link href="/dashboard/settings" className="hover:text-white transition-colors">Settings</Link>
              </li>
              <li>
                <Link href="/dashboard/help" className="hover:text-white transition-colors">Setup Guide & Help</Link>
              </li>
            </ul>
          </div>

          {/* Software & Agent */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white/40">Windows Software</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/downloads/VinthaPrintAgent-Windows.zip" className="hover:text-[#FF2D78] transition-colors flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-[#FF2D78]" />
                  <span>Download Windows Agent (.zip)</span>
                </Link>
              </li>
              <li>
                <Link href="/shop/om-sai-print" className="hover:text-white transition-colors">Customer Upload Demo</Link>
              </li>
              <li>
                <Link href="/onboarding" className="hover:text-white transition-colors">Register Shop Account</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">Shop Login</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 gap-4">
          <p>© {new Date().getFullYear()} Vintha Print System. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-[#FF2D78] fill-current" /> for Indian Print Shops & Cyber Cafes
          </p>
        </div>
      </div>
    </footer>
  );
}
