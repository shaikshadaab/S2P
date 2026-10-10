"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BRAND_NAME,
  BRAND_FULL_NAME,
  PRIMARY_PILOT_SHOP
} from "@s2p/shared";
import {
  Menu,
  X,
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
  QrCode,
  BarChart3,
  Users,
  Activity,
  Star,
  LayoutGrid,
  FileText,
  CreditCard,
  Sparkles
} from "lucide-react";
import { useAuth } from "../../lib/firebase/auth-context";
import { SosLogo } from "@/components/common/SosLogo";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: ShoppingBag, status: "Overview" },
  { label: "Guided Setup", href: "/dashboard/setup", icon: Sparkles, status: "Station Setup" },
  { label: "Counter", href: "/dashboard/counter", icon: Calculator, status: "Cashier" },
  { label: "Orders", href: "/dashboard/orders", icon: FileText, status: "Live Feed" },
  { label: "Print Queue", href: "/dashboard/queue", icon: Layers, status: "Queue" },
  { label: "Rates", href: "/dashboard/pricing", icon: Tag, status: "Active Rates" },
  { label: "Printers", href: "/dashboard/printers", icon: Printer, status: "Devices" },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard, status: "Audit" },
  { label: "Shop QR & Poster", href: "/dashboard/standee", icon: QrCode, status: "Printable QR" },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3, status: "Analytics" },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, status: "Shop Info" },
  { label: "Diagnostics", href: "/dashboard/diagnostics", icon: Activity, status: "Health" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, member, role, loading, membershipError, refreshMembership, logout } = useAuth();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

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
      <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col items-center justify-center p-6 selection:bg-emerald-600 selection:text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-xl text-white tracking-wider shadow-md shadow-emerald-700/20">
            {BRAND_NAME}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#475569]">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
            <span>Verifying authorized shop membership for {PRIMARY_PILOT_SHOP.name}...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col items-center justify-center p-6 selection:bg-emerald-600 selection:text-white">
        <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center space-y-5 shadow-lg">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-[#111827] tracking-tight">Authentication Required</h2>
            <p className="text-xs text-[#475569] leading-relaxed">
              Administrative screens for <strong>{PRIMARY_PILOT_SHOP.name}</strong> are strictly protected. Logged-out visitors cannot view live orders or printer queues.
            </p>
          </div>
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide shadow-xs transition flex items-center justify-center gap-2"
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
      <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col items-center justify-center p-6 selection:bg-emerald-600 selection:text-white">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-8 text-center space-y-5 shadow-lg">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            {isLookupError ? (
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            ) : (
              <ShieldAlert className="w-7 h-7 text-red-600" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-[#111827] tracking-tight">
              {isLookupError ? "Membership Verification Error" : "No Active Shop Membership"}
            </h2>
            <p className="text-xs text-[#475569] leading-relaxed">
              {isLookupError ? (
                <>
                  Unable to verify staff membership for <strong>{user.email}</strong> due to a database or network lookup error. Authorization has failed closed for security.
                </>
              ) : (
                <>
                  Authenticated as <span className="font-mono text-emerald-700 font-bold">{user.email}</span>, but this account does not possess an active staff or owner membership for <strong>{PRIMARY_PILOT_SHOP.name}</strong>. Access is denied.
                </>
              )}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            {isLookupError && (
              <button
                type="button"
                onClick={() => refreshMembership()}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs tracking-wide transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Verification</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold text-xs tracking-wide transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out & Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex flex-col lg:flex-row selection:bg-emerald-600 selection:text-white">
      {/* Sidebar */}
      <div className="lg:hidden bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <SosLogo variant="horizontal" size="sm" href="/dashboard" />
        </div>
        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          {role || member?.role || "OWNER"}
        </span>
      </div>

      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col justify-between shadow-2xl z-10">
            <div>
              <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
                <SosLogo variant="horizontal" size="sm" href="/dashboard" />
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold shadow-xs"
                          : "text-[#475569] hover:text-[#111827] hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? "text-emerald-700" : "text-[#475569]"}`} />
                        <span>{item.label}</span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-[#475569]">
                        {item.status}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="p-4 border-t border-[#E2E8F0] bg-slate-50 text-[11px] flex items-center justify-between">
              <span className="font-bold text-[#111827] truncate max-w-[160px]">{user.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 text-xs font-bold cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-[#E2E8F0] bg-white flex-col justify-between shrink-0 shadow-xs">
        <div>
          {/* Brand & Shop Header */}
          <div className="p-5 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <SosLogo variant="horizontal" size="md" href="/dashboard" />
            </div>
            <div className="mt-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span className="font-semibold truncate">Authoritative Owner Console</span>
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
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold shadow-xs"
                      : "text-[#475569] hover:text-[#111827] hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? "text-emerald-700" : "text-[#475569]"}`} />
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? "bg-emerald-200/60 text-emerald-900 font-bold"
                        : "bg-slate-100 text-[#475569]"
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
        <div className="p-4 border-t border-[#E2E8F0] bg-slate-50 text-[11px] space-y-3">
          {/* User & Role Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#111827] truncate">
                  {user.displayName || user.email?.split("@")[0] || "Staff"}
                </div>
                <div className="text-[10px] text-[#475569] truncate">
                  {user.email || "Staff Account"}
                </div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
              {role || member?.role || "STAFF"}
            </span>
          </div>

          {/* Windows Agent Status */}
          <Link
            href="/dashboard/printers"
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:border-emerald-300 text-[11px] text-[#475569] hover:text-[#111827] transition"
          >
            <div className="flex items-center gap-2">
              <Laptop className="w-3.5 h-3.5 text-emerald-600" />
              <span>Windows Agent</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
              <span>v1.0.0</span>
              <Download className="w-3 h-3" />
            </span>
          </Link>

          {/* Customer Kiosk Deep-link & Logout */}
          <div className="flex items-center gap-2 pt-1">
            <Link
              href={`/s/${PRIMARY_PILOT_SHOP.slug}`}
              target="_blank"
              className="flex-1 py-1.5 px-2 rounded-lg bg-white border border-[#E2E8F0] hover:bg-slate-100 text-[#475569] hover:text-[#111827] text-[10px] font-semibold text-center transition flex items-center justify-center gap-1"
            >
              <span>View Kiosk</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="py-1.5 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold transition flex items-center gap-1"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-h-screen min-w-0">
        {children}
      </main>
    </div>
  );
}
