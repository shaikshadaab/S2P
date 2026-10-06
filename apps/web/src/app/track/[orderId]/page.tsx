"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BRAND_NAME,
  BRAND_FULL_NAME,
  PRIMARY_PILOT_SHOP,
  Order,
  getOrderStatusDisplay
} from "@s2p/shared";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  QrCode,
  Banknote,
  Smartphone,
  Printer,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  Compass,
  Maximize2
} from "lucide-react";

export default function OrderTrackingPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [shopUpiConfig, setShopUpiConfig] = useState<{ upiId?: string; merchantName?: string; isEnabled?: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders?orderId=${params.orderId}`);
        const data = await res.json();
        if (!res.ok || !data.success || !data.order) {
          throw new Error(data.error || "Order not found");
        }
        if (isMounted) {
          setOrder(data.order);
          setIsLoading(false);

          // Fetch authoritative shop UPI config
          if (data.order.shopId && !shopUpiConfig) {
            try {
              const shopRes = await fetch(`/api/shops/${data.order.shopId}/options`);
              const shopData = await shopRes.json();
              if (shopData.success && shopData.upiConfig) {
                setShopUpiConfig(shopData.upiConfig);
              }
            } catch {
              // Ignore failure
            }
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : "Failed to load order";
          setError(msg);
          setIsLoading(false);
        }
      }
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [params.orderId, shopUpiConfig]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090d0b] text-[#f8fafc] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <p className="text-xs text-slate-400 font-semibold">Connecting to Near-Real-Time Order Feed...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#090d0b] text-[#f8fafc] flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
        <h2 className="text-base font-bold text-white mb-1">Order Not Found</h2>
        <p className="text-xs text-slate-400 max-w-xs mb-4">{error || "This order may have expired or does not exist."}</p>
        <Link
          href="/s/shakeel-online-services"
          className="px-4 py-2 bg-emerald-600 rounded-lg text-xs font-bold text-white hover:bg-emerald-500 transition"
        >
          Return to Print Kiosk
        </Link>
      </div>
    );
  }

  const statusMeta = getOrderStatusDisplay(order.status);
  const isPaid = order.paymentStatus === "PAID";
  const isUpiPending = order.paymentStatus === "UPI_PENDING";
  const isCashPending = order.paymentStatus === "CASH_PENDING";

  const hasValidUpi = Boolean(shopUpiConfig?.isEnabled && shopUpiConfig?.upiId);
  const upiId = shopUpiConfig?.upiId || "";
  const merchantName = shopUpiConfig?.merchantName || PRIMARY_PILOT_SHOP.name;

  const upiDeepLink = hasValidUpi
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${order.totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`S2P Order ${order.orderNumber}`)}`
    : "";
  const qrCodeUrl = hasValidUpi
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeepLink)}`
    : "";

  return (
    <div className="min-h-screen bg-[#090d0b] text-[#f8fafc] flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <header className="border-b border-[#1c2621] bg-[#0b0f0e] px-4 py-3 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-sm text-white">
              {BRAND_NAME}
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase leading-none">
                Near-Real-Time Order Tracking
              </div>
              <h1 className="text-xs font-extrabold text-white leading-tight">
                {PRIMARY_PILOT_SHOP.name}
              </h1>
            </div>
          </div>
          <Link
            href="/s/shakeel-online-services"
            className="text-[11px] text-slate-400 hover:text-white p-1 rounded transition flex items-center gap-1"
          >
            <span>New Print</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto w-full px-4 py-6 flex-1 space-y-4">
        {/* Order Identifier Card */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 flex items-center justify-between shadow">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Order Number</span>
            <span className="text-lg font-black text-white font-mono tracking-wide">{order.orderNumber}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Customer</span>
            <span className="text-xs font-bold text-white block">{order.customerName}</span>
            <span className="text-[10px] text-slate-400 font-mono">{order.customerMobile}</span>
          </div>
        </div>

        {/* Current Status Card */}
        <div className="bg-[#121c17] border border-emerald-500/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Order Status
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              {statusMeta.label}
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {statusMeta.customerDescription}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 pt-1">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>Secure polling feed &bull; Refreshed: {new Date(order.updatedAt).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Print Configuration Details Card */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-emerald-400" /> Print Configuration
            </span>
            <span className="text-[10px] text-slate-400">Order Items</span>
          </div>

          <div className="space-y-2 text-xs">
            {order.items?.map((item) => (
              <div key={item.id} className="bg-[#16202c] border border-[#1f2937] rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-white">
                  <span>{item.selectedPageCount} Pages &times; {item.config?.copies} Copies</span>
                  <span className="text-emerald-400">{item.config?.paperSize} &bull; {item.config?.colorMode}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Sides: {item.config?.duplexMode} ({item.printedSides} sides total)</span>
                  <span>Sheets: {item.estimatedSheets}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 border-t border-[#1f2937] pt-1">
                  <span className="flex items-center gap-1">
                    <Compass className="w-3 h-3 text-emerald-400" />
                    Orientation: <span className="text-slate-200 font-semibold">{item.config?.orientation || "AUTO"}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Maximize2 className="w-3 h-3 text-emerald-400" />
                    Scaling: <span className="text-slate-200 font-semibold">{item.config?.scaling || "FIT"}</span>
                  </span>
                </div>
                {item.config?.finishing && item.config.finishing !== "NONE" && (
                  <div className="text-[10px] text-amber-400">
                    Finishing: {item.config.finishing}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Status Card & UPI QR if Pending */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              {order.paymentMethod === "CASH" ? <Banknote className="w-4 h-4 text-emerald-400" /> : <QrCode className="w-4 h-4 text-emerald-400" />}
              Payment Status
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                isPaid
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-950 text-amber-300 border border-amber-500/30"
              }`}
            >
              {isPaid ? "Paid & Confirmed" : isCashPending ? "Cash Pending at Counter" : "UPI Pending Verification"}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-[#1f2937] pt-2 text-xs">
            <span className="text-slate-400">Total Amount Due</span>
            <span className="text-lg font-black text-emerald-400 font-mono">?{order.totalAmount.toFixed(2)}</span>
          </div>

          {/* If UPI Pending, show active QR code or fallback instructions */}
          {isUpiPending && (
            <div className="bg-[#0b1016] border border-emerald-500/30 rounded-xl p-4 text-center space-y-3 mt-2">
              {hasValidUpi ? (
                <>
                  <span className="text-xs font-bold text-white block">Scan to Complete Payment</span>
                  <div className="w-44 h-44 bg-white p-2 rounded-xl mx-auto shadow flex items-center justify-center">
                    <img src={qrCodeUrl} alt="UPI Payment QR" className="w-full h-full" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-300 font-mono block">UPI ID: {upiId}</span>
                    <span className="text-[10px] text-slate-400">Scan via GPay, PhonePe, Paytm, or BHIM</span>
                  </div>
                  <a
                    href={upiDeepLink}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Open UPI App on Device</span>
                  </a>
                </>
              ) : (
                <div className="text-xs text-amber-300 py-2">
                  <p className="font-semibold">UPI Payment Currently Unavailable</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Please pay ?{order.totalAmount.toFixed(2)} in cash to staff at the counter.
                  </p>
                </div>
              )}
              <span className="text-[10px] text-amber-300/80 block">
                Staff at counter will verify payment receipt.
              </span>
            </div>
          )}

          {isCashPending && (
            <div className="bg-[#16202c] border border-amber-500/30 rounded-lg p-3 text-xs text-slate-300 space-y-1">
              <span className="text-amber-400 font-bold block">Cash Payment Required</span>
              <p>Please pay ?{order.totalAmount.toFixed(2)} in cash to the shopkeeper at the counter to start printing.</p>
            </div>
          )}
        </div>

        {/* Timeline Events */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Order Progress
          </h3>
          <div className="space-y-3 pl-2 border-l border-emerald-500/30">
            {order.timeline?.map((evt, idx) => (
              <div key={evt.id || idx} className="relative pl-4">
                <div className="absolute -left-[13px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-[#111827]" />
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-white">{evt.status}</span>
                  <span className="text-[10px] text-slate-400">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
                {evt.note && <p className="text-[11px] text-slate-300 mt-0.5">{evt.note}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Assurance Banner */}
        <div className="bg-[#0e1713] border border-emerald-500/30 rounded-xl p-3 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-300 leading-relaxed">
            Your uploaded document is kept private and automatically deleted shortly after successful printing.
          </p>
        </div>
      </main>

      <footer className="border-t border-[#1c2621] bg-[#0b0f0e] px-4 py-3 text-center text-[10px] text-slate-500">
        {BRAND_NAME} &bull; {BRAND_FULL_NAME} &bull; Order #{order.orderNumber}
      </footer>
    </div>
  );
}
