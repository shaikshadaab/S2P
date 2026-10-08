"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BRAND_NAME,
  BRAND_FULL_NAME,
  PRIMARY_PILOT_SHOP
} from "@s2p/shared";
import {
  ShoppingBag,
  Calculator,
  Layers,
  Printer,
  Tag,
  Settings,
  ShieldCheck,
  ExternalLink,
  Laptop,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Download,
  QrCode
} from "lucide-react";
import { useAuth } from "../../lib/firebase/auth-context";

const NAV_ITEMS = [
  { label: "Orders", href: "/dashboard", icon: ShoppingBag, status: "Live Feed" },
  { label: "POS", href: "/dashboard/pos", icon: Calculator, status: "Phase 9" },
  { label: "Print Queue", href: "/dashboard/queue", icon: Layers, status: "Phase 10" },
  { label: "Printer Center", href: "/dashboard/printers", icon: Printer, status: "Phase 12" },
  { label: "Pricing & Rates", href: "/dashboard/pricing", icon: Tag, status: "Active Rates" },
  { label: "QR Standee", href: "/dashboard/standee", icon: QrCode, status: "Counter QR" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, status: "Active Phase 1" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, member, role, loading, membershipError, refreshMembership, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, pathname, router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d0b] text-[#f8fafc] flex flex-col items-center justify-center p-6 selection:bg-emerald-500 selection:text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-xl text-white tracking-wider shadow-lg shadow-emerald-950/60">
            {BRAND_NAME}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>Verifying authorized shop membership for {PRIMARY_PILOT_SHOP.name}...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#090d0b] text-[#f8fafc] flex flex-col items-center justify-center p-6 selection:bg-emerald-500 selection:text-white">
        <div className="max-w-md w-full bg-[#111827] border border-[#1f2937] rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-950/50 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-white tracking-tight">Authentication Required</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Administrative screens for <strong>{PRIMARY_PILOT_SHOP.name}</strong> are strictly protected. Logged-out visitors cannot view live orders or printer queues.
            </p>
          </div>
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-emerald-950/60 transition flex items-center justify-center gap-2"
          >
            Go to Staff Login
          </Link>
        </div>
      </div>
    );
  }

  // FAIL CLOSED: If user is authenticated but not an ACTIVE member of this shop, DENY access
  if (!member || member.status !== "ACTIVE") {
    const isLookupError = membershipError === "MEMBERSHIP_LOOKUP_FAILED";

    return (
      <div className="min-h-screen bg-[#090d0b] text-[#f8fafc] flex flex-col items-center justify-center p-6 selection:bg-emerald-500 selection:text-white">
        <div className="max-w-md w-full bg-[#111827] border border-red-900/40 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
            {isLookupError ? (
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            ) : (
              <ShieldAlert className="w-7 h-7 text-red-400" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {isLookupError ? "Membership Verification Error" : "No Active Shop Membership"}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isLookupError ? (
                <>
                  Unable to verify staff membership for <strong>{user.email}</strong> due to a database or network lookup error. Authorization has failed closed for security.
                </>
              ) : (
                <>
                  Authenticated as <span className="font-mono text-emerald-400">{user.email}</span>, but this account does not possess an active staff or owner membership for <strong>{PRIMARY_PILOT_SHOP.name}</strong>. Access is denied.
                </>
              )}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {isLookupError && (
              <button
                type="button"
                onClick={() => refreshMembership()}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs tracking-wide transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Verification</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-[#1f2937] hover:bg-[#374151] text-slate-200 font-bold text-xs tracking-wide transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out &amp; Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d0b] text-[#f8fafc] flex selection:bg-emerald-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1c2621] bg-[#0b0f0e] flex flex-col justify-between shrink-0">
        <div>
          {/* Brand & Shop Header */}
          <div className="p-5 border-b border-[#1c2621]">
            <div className="flex items-center gap-3">
            <a
              href="/S2P-Agent-Setup.exe"
              download="S2P-Agent-Setup.exe"
              className="text-xs font-bold px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition shadow"
              title="Download Windows Print Agent (.exe)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Agent (.exe)</span>
            </a>
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-xl text-white tracking-wider shadow-lg shadow-emerald-950/60">
                {BRAND_NAME}
              </div>
              <div>
                <div className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase leading-none">
                  {BRAND_FULL_NAME}
                </div>
                <div className="text-sm font-extrabold text-white leading-tight mt-0.5">
                  {PRIMARY_PILOT_SHOP.name}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 px-2 py-1 rounded bg-[#141d18] border border-[#1f2937] text-[10px] text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold truncate">Authoritative Tenant Auth</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-300 hover:text-white hover:bg-[#161e1b]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? "bg-emerald-700 text-white"
                        : "bg-[#1c2621] text-slate-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: User Profile, Role & Logout */}
        <div className="p-4 border-t border-[#1c2621] bg-[#090d0b] text-[11px] space-y-3">
          {/* User & Role Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {user.displayName || user.email?.split("@")[0] || "Staff"}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {user.email || "Staff Account"}
                </div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              {role || member?.role || "STAFF"}
            </span>
          </div>

          {/* Windows Agent Status */}
          <a
            href="/S2P-Agent-Setup.exe"
            download="S2P-Agent-Setup.exe"
            className="w-full py-1.5 px-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 hover:bg-emerald-900/50 text-emerald-300 text-[10px] font-bold flex items-center justify-center gap-1.5 transition"
            title="Download S2P Windows Print Agent Installer"
          >
            <Download className="w-3 h-3" />
            <span>Download S2P-Agent-Setup.exe</span>
          </a>
          <div className="flex items-center justify-between text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-slate-500" />
              <span>Windows Agent:</span>
            </span>
            <span className="text-amber-400 font-semibold font-mono text-[10px]">0 Paired</span>
          </div>

          {/* Actions: Hub link and Logout */}
          <div className="pt-2 border-t border-[#161e1b] flex items-center justify-between">
            <Link href="/" className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]">
              <span>Home Hub</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#1c2621] bg-[#0b0f0e]/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-white tracking-tight">
              {PRIMARY_PILOT_SHOP.name} Management Console
            </h1>
            <span className="text-xs bg-[#161e1b] border border-[#24322c] text-emerald-400 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Live Staff Session</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/s/shakeel-online-services"
              target="_blank"
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-[#161e1b] hover:bg-[#1f2923] text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition"
            >
              <span>View Customer QR Standee</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 p-6 overflow-y-auto bg-[#090d0b]">
          {children}
        </main>
      </div>
    </div>
  );
}


