"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Banknote,
  QrCode,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Printer,
  ShieldCheck,
  Check,
  X,
  FileText,
  User,
  Phone,
  Layers,
  ArrowRight
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, Order, getOrderStatusDisplay } from "@s2p/shared";
import { useAuth } from "../../../lib/firebase/auth-context";

function maskPhone(phone?: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    const ten = digits.slice(-10);
    return `+91 ${ten.slice(0, 3)}*** **${ten.slice(-2)}`;
  }
  return phone;
}

export default function CounterCashierPage() {
  const { user, role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"ALL" | "AWAITING_PAYMENT" | "AWAITING_CASH" | "AWAITING_UPI" | "PAID">("ALL");

  // Revealing contacts (map of orderId -> boolean)
  const [revealedContacts, setRevealedContacts] = useState<Record<string, boolean>>({});

  // Audio & Notification Toggles
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [desktopNotifEnabled, setDesktopNotifEnabled] = useState<boolean>(false);
  const prevOrderCountRef = useRef<number>(0);

  // Confirmation Modal state
  const [confirmModalOrder, setConfirmModalOrder] = useState<Order | null>(null);
  const [confirmModalMode, setConfirmModalMode] = useState<"CASH" | "UPI" | null>(null);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Synthesize gentle chime on new order
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // Adaptive server-authorized polling
  const fetchOrders = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/orders?shopId=${PRIMARY_PILOT_SHOP.id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load counter orders");
      }
      const fetched: Order[] = data.orders || [];

      // Check if new orders arrived
      if (fetched.length > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
        if (soundEnabled) playChime();
        if (desktopNotifEnabled && "Notification" in window && Notification.permission === "granted") {
          new Notification("New Print Order Arrived", {
            body: "A new document order was submitted at Shakeel Online Services counter.",
            icon: "/icon.png"
          });
        }
      }
      prevOrderCountRef.current = fetched.length;

      setOrders(fetched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching orders";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3500);
    return () => clearInterval(interval);
  }, [soundEnabled, desktopNotifEnabled]);

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  const toggleDesktopNotif = async () => {
    if (!desktopNotifEnabled) {
      if ("Notification" in window) {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          setDesktopNotifEnabled(true);
        } else {
          alert("Desktop notification permission was denied by browser.");
        }
      }
    } else {
      setDesktopNotifEnabled(false);
    }
  };

  const handleToggleReveal = (orderId: string) => {
    setRevealedContacts(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Confirm receipt of payment
  const handleExecutePaymentConfirmation = async () => {
    if (!confirmModalOrder || !confirmModalMode) return;
    setIsConfirming(true);
    setActionError(null);

    try {
      const token = user ? await user.getIdToken() : "";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      if (confirmModalMode === "UPI") {
        const res = await fetch(`/api/orders/${confirmModalOrder.id}/confirm-manual-upi`, {
          method: "POST",
          headers
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to confirm UPI payment");
        }
      } else {
        // Cash payment confirmation
        const res = await fetch("/api/orders/update-status", {
          method: "POST",
          headers,
          body: JSON.stringify({
            orderId: confirmModalOrder.id,
            action: "MARK_CASH_PAID",
            note: "Cash received and verified by counter staff."
          })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to confirm Cash payment");
        }
      }

      setConfirmModalOrder(null);
      setConfirmModalMode(null);
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Confirmation error";
      setActionError(msg);
    } finally {
      setIsConfirming(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filterMode === "AWAITING_PAYMENT" && o.paymentStatus === "PAID") return false;
      if (filterMode === "AWAITING_CASH" && (o.paymentMethod !== "CASH" || o.paymentStatus === "PAID")) return false;
      if (filterMode === "AWAITING_UPI" && (o.paymentMethod !== "MANUAL_UPI" || o.paymentStatus === "PAID")) return false;
      if (filterMode === "PAID" && o.paymentStatus !== "PAID") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = o.orderNumber.toLowerCase().includes(q);
        const matchesName = o.customerName.toLowerCase().includes(q);
        const matchesPhone = o.customerMobile?.includes(q);
        if (!matchesNum && !matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [orders, filterMode, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span>Counter Cashier • Realtime Spooler Dispatch</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111827] mt-0.5">
            Shop Counter Terminal
          </h1>
          <p className="text-xs text-[#475569] mt-0.5">
            Confirm customer Cash or direct UPI payments. Upon confirmation, paid orders are automatically queued to the Windows Print Agent.
          </p>
        </div>

        {/* Action Controls & Notifications */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={toggleSound}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              soundEnabled
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-white border-[#CBD5E1] text-[#475569] hover:bg-slate-50"
            }`}
            title={soundEnabled ? "Disable audio chime" : "Enable audio chime on new orders"}
          >
            {soundEnabled ? <Bell className="w-3.5 h-3.5 text-emerald-600" /> : <BellOff className="w-3.5 h-3.5" />}
            <span>Sound {soundEnabled ? "ON" : "OFF"}</span>
          </button>

          <button
            type="button"
            onClick={toggleDesktopNotif}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              desktopNotifEnabled
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-white border-[#CBD5E1] text-[#475569] hover:bg-slate-50"
            }`}
            title={desktopNotifEnabled ? "Desktop alerts enabled" : "Enable desktop browser notifications"}
          >
            <span>Desktop Alerts {desktopNotifEnabled ? "ON" : "OFF"}</span>
          </button>

          <button
            type="button"
            onClick={fetchOrders}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#475569] transition cursor-pointer"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterMode("ALL")}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              filterMode === "ALL" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-[#475569] hover:bg-slate-200"
            }`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setFilterMode("AWAITING_PAYMENT")}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              filterMode === "AWAITING_PAYMENT" ? "bg-amber-600 text-white shadow-xs" : "bg-slate-100 text-[#475569] hover:bg-slate-200"
            }`}
          >
            Awaiting Confirmation ({orders.filter(o => o.paymentStatus !== "PAID").length})
          </button>
          <button
            onClick={() => setFilterMode("AWAITING_CASH")}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              filterMode === "AWAITING_CASH" ? "bg-amber-600 text-white shadow-xs" : "bg-slate-100 text-[#475569] hover:bg-slate-200"
            }`}
          >
            Cash Pending ({orders.filter(o => o.paymentMethod === "CASH" && o.paymentStatus !== "PAID").length})
          </button>
          <button
            onClick={() => setFilterMode("AWAITING_UPI")}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              filterMode === "AWAITING_UPI" ? "bg-blue-600 text-white shadow-xs" : "bg-slate-100 text-[#475569] hover:bg-slate-200"
            }`}
          >
            UPI Review ({orders.filter(o => o.paymentMethod === "MANUAL_UPI" && o.paymentStatus !== "PAID").length})
          </button>
          <button
            onClick={() => setFilterMode("PAID")}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              filterMode === "PAID" ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-[#475569] hover:bg-slate-200"
            }`}
          >
            Paid ({orders.filter(o => o.paymentStatus === "PAID").length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order #, name, phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Orders List / Cards */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#111827]">No Orders In Counter View</h3>
          <p className="text-xs text-[#475569] max-w-sm mx-auto">
            When customers upload files at <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-bold">/print</code>, their orders appear here automatically for cash or UPI confirmation.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => {
            const isPaid = order.paymentStatus === "PAID";
            const isCash = order.paymentMethod === "CASH";
            const isUpi = order.paymentMethod === "MANUAL_UPI";
            const amountRupees = order.pricingSnapshot
              ? (order.pricingSnapshot.totalPaise / 100).toFixed(2)
              : ((order.totalAmount || 0)).toFixed(2);
            const isRevealed = revealedContacts[order.id];

            return (
              <div
                key={order.id}
                className={`bg-white border rounded-2xl p-5 shadow-xs transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  !isPaid
                    ? isCash
                      ? "border-amber-300 bg-amber-50/20"
                      : "border-blue-300 bg-blue-50/20"
                    : "border-[#E2E8F0] hover:border-slate-300"
                }`}
              >
                {/* Left Column: Order Meta, Customer & Items */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-sm text-[#111827]">
                      #{order.orderNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isPaid
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : order.paymentStatus === "MANUAL_UPI_REVIEW_PENDING"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}>
                      {isPaid ? "PAID & QUEUED" : order.paymentStatus === "MANUAL_UPI_REVIEW_PENDING" ? "UPI REVIEW PENDING" : isCash ? "CASH PENDING" : "AWAITING PAYMENT"}
                    </span>
                    <span className="text-[11px] text-[#64748B] flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#334155]">
                    <span className="font-bold text-[#111827] flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {order.customerName}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {isRevealed ? (order.customerMobile || "—") : maskPhone(order.customerMobile)}
                      <button
                        type="button"
                        onClick={() => handleToggleReveal(order.id)}
                        className="ml-1 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        title={isRevealed ? "Hide contact" : "Authorized View Full Phone"}
                      >
                        {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </span>
                  </div>

                  {/* Item / Print summary */}
                  <div className="text-[11px] text-[#64748B] flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" />
                      {order.items?.length || 1} document(s)
                    </span>
                    <span>•</span>
                    <span>
                      {(order.pricingSnapshot as any)?.lineItems?.[0]?.name || "A4 Document Print"}
                    </span>
                    {order.customerClaimedUtr && (
                      <span className="font-mono text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                        UTR: {order.customerClaimedUtr}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Column: Amount & Action Buttons */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E2E8F0]">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      {isCash ? "Cash Due" : "UPI Due"}
                    </div>
                    <div className="text-2xl font-black text-[#111827] font-mono">
                      ₹{amountRupees}
                    </div>
                  </div>

                  {/* Confirmation Buttons */}
                  {!isPaid ? (
                    <div className="flex items-center gap-2">
                      {isCash && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModalOrder(order);
                            setConfirmModalMode("CASH");
                          }}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm Cash Received</span>
                        </button>
                      )}

                      {isUpi && (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmModalOrder(order);
                            setConfirmModalMode("UPI");
                          }}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm UPI Received</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                      <Printer className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dispatched to Agent</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalOrder && confirmModalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="text-base font-black text-[#111827] flex items-center gap-2">
                {confirmModalMode === "CASH" ? (
                  <Banknote className="w-5 h-5 text-emerald-600" />
                ) : (
                  <QrCode className="w-5 h-5 text-blue-600" />
                )}
                <span>Confirm {confirmModalMode === "CASH" ? "Cash" : "Direct UPI"} Receipt</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setConfirmModalOrder(null);
                  setConfirmModalMode(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#334155]">
              <p>
                Have you verified receipt of the payment for this order?
              </p>

              <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Order Number:</span>
                  <span className="font-mono font-bold text-[#111827]">#{confirmModalOrder.orderNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Customer Name:</span>
                  <span className="font-bold text-[#111827]">{confirmModalOrder.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Exact Amount:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    ₹{confirmModalOrder.pricingSnapshot ? (confirmModalOrder.pricingSnapshot.totalPaise / 100).toFixed(2) : (confirmModalOrder.totalAmount || 0).toFixed(2)}
                  </span>
                </div>
                {confirmModalOrder.customerClaimedUtr && (
                  <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 font-mono">
                    <span className="text-slate-500">Claimed UTR:</span>
                    <span className="font-bold text-blue-700">{confirmModalOrder.customerClaimedUtr}</span>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Automatic Dispatch: Confirming receipt will immediately release this order to the connected Windows print agent.
                </span>
              </div>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmModalOrder(null);
                  setConfirmModalMode(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#475569] font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConfirming}
                onClick={handleExecutePaymentConfirmation}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <span>Confirm Receipt & Print</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
