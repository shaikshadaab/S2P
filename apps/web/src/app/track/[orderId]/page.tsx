"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
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
  AlertTriangle,
  ArrowLeft,
  CreditCard
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

  // Razorpay Online State
  const [isPayingRazorpay, setIsPayingRazorpay] = useState<boolean>(false);

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
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              paymentStatus: "MANUAL_UPI_REVIEW_PENDING",
              customerClaimedUtr: customerUtr.trim() || undefined,
              customerClaimedPaidAt: new Date().toISOString()
            }
          : null
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission error";
      setClaimError(msg);
    } finally {
      setIsClaimingPaid(false);
    }
  };

  const handlePayOnlineRazorpay = async () => {
    if (!order) return;
    setIsPayingRazorpay(true);
    try {
      const loadScript = () =>
        new Promise<boolean>((resolve) => {
          if ((window as any).Razorpay) return resolve(true);
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });

      const scriptLoaded = await loadScript();
      if (!scriptLoaded) {
        throw new Error("Unable to load Razorpay payment gateway.");
      }

      const createRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id })
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || "Failed to initialize payment.");
      }

      const options = {
        key: createData.keyId,
        amount: createData.amountPaise,
        currency: createData.currency || "INR",
        name: "Shakeel Online Services",
        description: `Order #${order.orderNumber}`,
        order_id: createData.rzpOrderId,
        prefill: {
          contact: order.customerMobile || ""
        },
        theme: {
          color: "#059669"
        },
        handler: async (resp: any) => {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.id,
              razorpayOrderId: resp.razorpay_order_id || createData.rzpOrderId,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            setOrder((prev) =>
              prev
                ? {
                    ...prev,
                    paymentStatus: "PAID",
                    status: "ACCEPTED",
                    paymentReference: resp.razorpay_payment_id
                  }
                : null
            );
          } else {
            alert(verifyData.error || "Payment verification failed.");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment error";
      alert(msg);
    } finally {
      setIsPayingRazorpay(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-xs text-slate-500 font-semibold">Connecting to Order Feed...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
        <h2 className="text-base font-bold text-slate-900 mb-1">Order Not Found</h2>
        <p className="text-xs text-slate-500 max-w-xs mb-4">{error || "This order may have expired or does not exist."}</p>
        <Link
          href="/s/shakeel-online-services"
          className="px-4 py-2 bg-emerald-600 rounded-lg text-xs font-bold text-white hover:bg-emerald-700 transition"
        >
          Return to Print Portal
        </Link>
      </div>
    );
  }

  const statusMeta = getOrderStatusDisplay(order.status);
  const formattedAmount = order.pricingSnapshot
    ? (order.pricingSnapshot.totalPaise / 100).toFixed(2)
    : "0.00";

  const isPaid = order.paymentStatus === "PAID";
  const isCashPending = order.paymentMethod === "CASH" && !isPaid;
  const isManualUpi = order.paymentMethod === "MANUAL_UPI";
  const isUpiPending = order.paymentStatus === "PENDING";
  const isUpiReviewPending = order.paymentStatus === "MANUAL_UPI_REVIEW_PENDING";
  const isUpiNotFound = order.paymentStatus === "MANUAL_UPI_NOT_FOUND";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-sm text-white">
              SOS
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider leading-none">
                Shakeel Online Services
              </div>
              <h1 className="text-xs font-black text-slate-900">
                Order #{order.orderNumber}
              </h1>
            </div>
          </div>
          <Link
            href="/s/shakeel-online-services"
            className="text-xs text-slate-500 hover:text-slate-900 p-1 rounded transition flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">New Print</span>
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto w-full px-4 py-6 flex-1 space-y-4">
        {/* Order Status Hero Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Current Status</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              {statusMeta.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 leading-snug">
            {statusMeta.customerDescription}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-2 border-t border-slate-100">
            <Clock className="w-3 h-3 text-emerald-600" />
            <span>Last updated: {new Date(order.updatedAt).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Payment Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              {order.paymentMethod === "CASH" ? (
                <Banknote className="w-4 h-4 text-emerald-600" />
              ) : (
                <QrCode className="w-4 h-4 text-emerald-600" />
              )}
              <span>Payment Details</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                isPaid
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : isUpiReviewPending
                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                  : isUpiNotFound
                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}
            >
              {isPaid
                ? "Paid & Confirmed"
                : isUpiReviewPending
                ? "Verification Pending"
                : isUpiNotFound
                ? "Payment Not Found"
                : isCashPending
                ? "Cash Pending at Counter"
                : "Awaiting Payment"}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-600 font-medium">Order Total</span>
            <span className="text-2xl font-black text-slate-900 font-mono">
              ₹{formattedAmount}
            </span>
          </div>

          {/* If manual UPI and PENDING */}
          {isManualUpi && isUpiPending && !isPaid && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-3">
              <span className="text-xs font-bold text-slate-900 block">
                {upiQrData?.providerLabel || "PhonePe / UPI QR"}
              </span>

              {upiQrData?.qrDataUrl ? (
                <div className="w-44 h-44 bg-white p-2 rounded-xl mx-auto shadow-sm border border-slate-200 flex items-center justify-center">
                  <img src={upiQrData.qrDataUrl} alt="UPI QR" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-44 h-44 bg-slate-100 rounded-xl mx-auto flex flex-col items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-1" />
                  <span className="text-[10px] text-slate-400">Loading QR...</span>
                </div>
              )}

              <div className="text-xs space-y-0.5 text-slate-600">
                <div className="font-mono text-[11px]">
                  UPI ID: <strong className="text-slate-900">{upiQrData?.upiId || "Shop Counter"}</strong>
                </div>
                {upiQrData?.reference && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    Ref: {upiQrData.reference}
                  </div>
                )}
              </div>

              {upiQrData?.uri && (
                <a
                  href={upiQrData.uri}
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Open in UPI App</span>
                </a>
              )}

              <div className="border-t border-slate-200 pt-3 text-left space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  Transaction Ref / UTR (Optional)
                </label>
                <input
                  type="text"
                  value={customerUtr}
                  onChange={(e) => setCustomerUtr(e.target.value)}
                  placeholder="e.g. 4239XXXXXXXX"
                  maxLength={50}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />

                {claimError && <p className="text-[11px] text-rose-600 font-medium">{claimError}</p>}

                <button
                  type="button"
                  disabled={isClaimingPaid}
                  onClick={handleClaimPaid}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                >
                  {isClaimingPaid ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>I&apos;VE PAID (Submit for Verification)</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* REVIEW PENDING */}
          {isManualUpi && isUpiReviewPending && !isPaid && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center space-y-2">
              <Clock className="w-7 h-7 text-blue-600 mx-auto" />
              <h4 className="text-xs font-bold text-blue-950">Waiting for Staff Verification</h4>
              <p className="text-xs text-blue-800 leading-relaxed">
                You marked payment as completed. Staff at the counter is checking their UPI records.
              </p>
              {order.customerClaimedUtr && (
                <div className="text-[10px] text-blue-900 font-mono bg-white p-2 rounded border border-blue-200">
                  UTR: {order.customerClaimedUtr}
                </div>
              )}
            </div>
          )}

          {/* NOT FOUND */}
          {isManualUpi && isUpiNotFound && !isPaid && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-center space-y-2">
              <AlertTriangle className="w-7 h-7 text-rose-600 mx-auto" />
              <h4 className="text-xs font-bold text-rose-950">Payment Not Found</h4>
              <p className="text-xs text-rose-800 leading-relaxed">
                Shopkeeper was unable to locate your payment. Please show your screen to counter staff.
              </p>
              <button
                type="button"
                onClick={handleClaimPaid}
                className="py-1.5 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
              >
                Re-submit UTR
              </button>
            </div>
          )}

          {/* CASH PENDING */}
          {isCashPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center space-y-2">
              <Banknote className="w-7 h-7 text-amber-600 mx-auto" />
              <h4 className="text-xs font-bold text-amber-950">Cash Payment at Counter</h4>
              <p className="text-xs text-amber-800">
                Please pay <strong>₹{formattedAmount}</strong> cash to the shopkeeper at Shakeel Online Services.
              </p>
            </div>
          )}

          {/* Option to pay online via Razorpay if not paid */}
          {!isPaid && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isPayingRazorpay}
                onClick={handlePayOnlineRazorpay}
                className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                {isPayingRazorpay ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Pay Online with UPI / Cards (Razorpay)</span>
              </button>
            </div>
          )}

          {/* PAID CONFIRMED */}
          {isPaid && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Payment Confirmed</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                Payment verified. Your document is prepared for printing.
              </p>
              {order.paymentReference && (
                <div className="text-[10px] text-emerald-900 font-mono pt-1">
                  Txn ID: {order.paymentReference}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Print Configuration Snapshot */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Print Preferences</span>
            </span>
            <span className="text-[10px] text-slate-400">Locked</span>
          </div>

          <div className="space-y-2 text-xs">
            {order.items?.map((item) => (
              <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>
                    {item.selectedPageCount} Pages &times; {item.config?.copies} Copies
                  </span>
                  <span className="text-emerald-700">
                    {item.config?.paperSize} &bull; {item.config?.colorMode}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Sides: {item.config?.duplexMode}</span>
                  <span>Sheets: {item.estimatedSheets}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 border-t border-slate-200 pt-1">
                  <span>Orientation: {item.config?.orientation || "AUTO"}</span>
                  <span>Scaling: {item.config?.scaling || "FIT"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zero-Trace Privacy Box */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Privacy Guaranteed</span>
            <span className="text-[11px] text-emerald-800">
              Your files are stored privately on secure cloud storage and automatically deleted after printing.
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
        Shakeel Online Services · Guntur, Andhra Pradesh · SOS Print
      </footer>
    </div>
  );
}
