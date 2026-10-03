"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Printer,
  LayoutDashboard,
  QrCode,
  ListOrdered,
  Laptop,
  Settings,
  HelpCircle,
  ExternalLink,
  Menu,
  X,
  Bell,
  Sparkles,
  Download,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Exact 6 sections specified by user
  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/qr-posters", label: "QR & Poster", icon: QrCode },
    { href: "/dashboard/orders", label: "Orders", icon: ListOrdered },
    { href: "/dashboard/printers", label: "Printers & Agent", icon: Laptop },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
    { href: "/dashboard/help", label: "Help & Guide", icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#121018] flex">
      {/* DESKTOP SIDEBAR - Dark Purple as specified */}
      <aside className="hidden lg:flex w-64 bg-[#1E1035] text-[#F4F4F5] flex-col justify-between shrink-0 border-r border-[#2C184D] shadow-xl">
        <div className="p-5">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 pb-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF2D78] to-[#9333EA] flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-bold font-heading text-white">vintha</span>
              <span className="text-xl font-extrabold font-heading text-[#FF2D78] ml-0.5">Print</span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#FF2D78]/20 text-[#FF2D78] uppercase">Free</span>
            </div>
          </Link>

          {/* Active Shop Card */}
          <div className="mt-5 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">Om Sai Xerox & Print</p>
              <p className="text-[10px] text-white/50 font-mono">/shop/om-sai-print</p>
            </div>
            <Link
              href="/shop/om-sai-print"
              target="_blank"
              className="text-[#FF2D78] hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Open Mobile Upload Page"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#FF2D78] text-white font-bold shadow-md shadow-pink-500/25"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Quick Agent Download & Version */}
        <div className="p-5 border-t border-white/10 space-y-3">
          <a
            href="/downloads/VinthaPrintAgent-Windows.zip"
            download="VinthaPrintAgent-Windows.zip"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/10"
          >
            <Download className="w-3.5 h-3.5 text-[#FF2D78]" />
            <span>Download Agent</span>
          </a>
          <div className="text-[10px] text-white/40 text-center font-mono">
            Vintha Print v2.0 • 100% Free
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-black/5 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-black/60 hover:text-black rounded-lg hover:bg-black/5"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-black/70">Shop Online · Auto-Printing Active</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/shop/om-sai-print"
              target="_blank"
              className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold flex items-center gap-1.5 hover:bg-purple-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#FF2D78]" />
              <span>Customer Scan Page</span>
            </Link>

            <Link
              href="/dashboard/qr-posters"
              className="px-4 py-1.5 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95 transition-all"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Print Shop Poster</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* MOBILE SIDEBAR MODAL */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 bg-[#1E1035] text-white p-5 flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <div className="flex items-baseline">
                  <span className="text-xl font-bold font-heading text-white">vintha</span>
                  <span className="text-xl font-extrabold font-heading text-[#FF2D78] ml-0.5">Print</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-6 space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                        isActive
                          ? "bg-[#FF2D78] text-white font-bold"
                          : "text-white/70 hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10">
              <a
                href="/downloads/VinthaPrintAgent-Windows.zip"
                download="VinthaPrintAgent-Windows.zip"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 text-white text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5 text-[#FF2D78]" />
                <span>Download Windows Agent</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
