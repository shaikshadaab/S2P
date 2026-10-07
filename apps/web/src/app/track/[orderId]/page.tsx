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
  Clock,
  Loader2,
  AlertCircle,
  QrCode,
  Banknote,
  Smartphone,
  Printer,
  Sparkles,
  ExternalLink,
  Compass,
  Maximize2,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface UpiQrData {
  uri: string;
  qrDataUrl: string;
  amountRupees: string;
  upiId: string;
  payeeName: string;
  providerLabel: string;
  reference: string;
}

export default function OrderTrackingPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [upiQrData, setUpiQrData] = useState<UpiQrData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Manual UPI Claim State
  const [customerUtr, setCustomerUtr] = useState<string>("");
  const [isClaimingPaid, setIsClaimingPaid] = useState<boolean>(false);
  const [claimError, setClaimError] = useState<string | null>(null);

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

          // If manual UPI and not yet paid, fetch deterministic UPI QR
          if (data.order.paymentMethod === "MANUAL_UPI" && data.order.paymentStatus !== "PAID" && !upiQrData) {
            try {
              const qrRes = await fetch(`/api/orders/${params.orderId}/upi-qr`);
              const qrData = await qrRes.json();
              if (qrRes.ok && qrData.success) {
                setUpiQrData(qrData);
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
  }, [params.orderId, upiQrData]);

  const handleClaimPaid = async () => {
    if (!order) return;
    setIsClaimingPaid(true);
    setClaimError(null);

    try {
      const res = await fetch(`/api/orders/${order.id}/claim-manual-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utr: customerUtr.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit payment claim");
      }
      // Optimistic update
      setOrder((prev) => prev ? {
        ...prev,
        paymentStatus: "MANUAL_UPI_REVIEW_PENDING",
        customerClaimedUtr: customerUtr.trim() || undefined,
        customerClaimedPaidAt: new Date().toISOString()
      } : null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission error";
      setClaimError(msg);
    } finally {
      setIsClaimingPaid(false);
    }
  };

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
  const isManualUpi = order.paymentMethod === "MANUAL_UPI";
  const isUpiReviewPending = order.paymentStatus === "MANUAL_UPI_REVIEW_PENDING";
  const isUpiNotFound = order.paymentStatus === "MANUAL_UPI_NOT_FOUND";
  const isUpiPending = order.paymentStatus === "UPI_PENDING" || (isManualUpi && !isPaid && !isUpiReviewPending && !isUpiNotFound);
  const isCashPending = order.paymentStatus === "CASH_PENDING";

  const formattedAmount = order.totalPaise
    ? (order.totalPaise / 100).toFixed(2)
    : (order.totalAmount || 0).toFixed(2);

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

        {/* Payment Section */}
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
                  : isUpiReviewPending
                  ? "bg-blue-950 text-blue-300 border border-blue-500/30"
                  : isUpiNotFound
                  ? "bg-rose-950 text-rose-300 border border-rose-500/30"
                  : "bg-amber-950 text-amber-300 border border-amber-500/30"
              }`}
            >
              {isPaid
                ? "Paid & Confirmed"
                : isUpiReviewPending
                ? "Waiting for Staff Verification"
                : isUpiNotFound
                ? "Payment Not Found"
                : isCashPending
                ? "Cash Pending at Counter"
                : "UPI Pending Verification"}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-[#1f2937] pt-2 text-xs">
            <span className="text-slate-400">Authoritative Order Total</span>
            <span className="text-lg font-black text-emerald-400 font-mono">₹{formattedAmount}</span>
          </div>

          {/* MANUAL UPI: 1. PENDING STAGE */}
          {isManualUpi && isUpiPending && !isPaid && (
            <div className="bg-[#0b1016] border border-emerald-500/30 rounded-xl p-4 text-center space-y-3 mt-2">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block">
                  {upiQrData?.providerLabel || "PhonePe / UPI"}
                </span>
                <span className="text-[11px] text-slate-400">
                  Scan QR with PhonePe, GPay, Paytm or any UPI app
                </span>
              </div>

              {upiQrData?.qrDataUrl ? (
                <div className="w-48 h-48 bg-white p-2 rounded-xl mx-auto shadow flex items-center justify-center">
                  <img src={upiQrData.qrDataUrl} alt="UPI Payment QR" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-48 h-48 bg-slate-900 border border-slate-700 rounded-xl mx-auto flex flex-col items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
                  <span className="text-[10px] text-slate-400">Generating UPI QR...</span>
                </div>
              )}

              <div className="space-y-1 text-xs text-slate-300">
                <div className="text-[11px] font-mono">
                  UPI ID: <strong className="text-emerald-400">{upiQrData?.upiId || "Shop UPI"}</strong>
                </div>
                {upiQrData?.payeeName && (
                  <div className="text-[10px] text-slate-400">
                    Payee: <span className="text-slate-200">{upiQrData.payeeName}</span>
                  </div>
                )}
                {upiQrData?.reference && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Ref: {upiQrData.reference}
                  </div>
                )}
              </div>

              {upiQrData?.uri && (
                <a
                  href={upiQrData.uri}
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Pay with PhonePe / UPI App</span>
                </a>
              )}

              {/* Optional UTR and I'VE PAID CTA */}
              <div className="border-t border-[#1f2937] pt-3 text-left space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  UPI Transaction Ref / UTR (Optional)
                </label>
                <input
                  type="text"
                  value={customerUtr}
                  onChange={(e) => setCustomerUtr(e.target.value)}
                  placeholder="e.g. 4239XXXXXXXX"
                  maxLength={50}
                  className="w-full px-3 py-2 bg-[#16202c] border border-[#2d3748] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />

                {claimError && (
                  <p className="text-[11px] text-rose-400 font-medium">{claimError}</p>
                )}

                <button
                  type="button"
                  disabled={isClaimingPaid}
                  onClick={handleClaimPaid}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                >
                  {isClaimingPaid ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Claim...</span>
                    </>
                  ) : (
                    <span>I&apos;VE PAID</span>
                  )}
                </button>

                <p className="text-[10px] text-amber-300/90 text-center pt-1 font-medium">
                  Your print will start after the shop confirms your payment.
                </p>
              </div>
            </div>
          )}

          {/* MANUAL UPI: 2. REVIEW PENDING STAGE */}
          {isManualUpi && isUpiReviewPending && !isPaid && (
            <div className="bg-[#0b141d] border border-blue-500/40 rounded-xl p-4 text-center space-y-2.5 mt-2">
              <Clock className="w-8 h-8 text-blue-400 mx-auto" />
              <h4 className="text-xs font-bold text-white">Waiting for Payment Verification</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                You marked this payment as completed. Staff at the counter is checking their PhonePe / UPI account. Your print will start once verified.
              </p>
              {order.customerClaimedUtr && (
                <div className="text-[10px] text-slate-400 font-mono bg-[#162232] p-2 rounded border border-blue-500/20">
                  Submitted UTR: <strong className="text-white">{order.customerClaimedUtr}</strong>
                </div>
              )}
              <div className="text-[10px] text-slate-500">
                Claimed: {order.customerClaimedPaidAt ? new Date(order.customerClaimedPaidAt).toLocaleTimeString() : "Just now"}
              </div>
            </div>
          )}

          {/* MANUAL UPI: 3. NOT FOUND STAGE */}
          {isManualUpi && isUpiNotFound && !isPaid && (
            <div className="bg-[#1c1012] border border-rose-500/40 rounded-xl p-4 text-center space-y-2.5 mt-2">
              <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
              <h4 className="text-xs font-bold text-white">Payment Not Found</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The shopkeeper was unable to locate your payment. Please check your UPI app transaction history or show your screen to the staff at the counter.
              </p>
              <button
                type="button"
                onClick={() => handleClaimPaid()}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition inline-block"
              >
                Retry / Recheck Payment
              </button>
            </div>
          )}

          {/* CASH PENDING */}
          {isCashPending && (
            <div className="bg-[#16202c] border border-amber-500/30 rounded-lg p-3 text-xs text-slate-300 space-y-1">
              <span className="text-amber-400 font-bold block">Cash Payment Required</span>
              <p>Please pay ₹{formattedAmount} in cash to the shopkeeper at the counter to start printing.</p>
            </div>
          )}

          {/* CONFIRMED / PAID */}
          {isPaid && (
            <div className="bg-[#0b1a13] border border-emerald-500/40 rounded-lg p-3 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle className="w-4 h-4" />
                <span>Payment Confirmed</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Payment verified. Your print job is queued for printing.
              </p>
            </div>
          )}
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