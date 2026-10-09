"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Pause,
  QrCode,
  Banknote,
  Printer,
  User,
  Phone,
  FileText,
  Star,
  MessageSquare,
  ShieldCheck
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, Order, getOrderStatusDisplay } from "@s2p/shared";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase/config";
import { useAuth } from "../../../lib/firebase/auth-context";

function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return "—";
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length >= 10) {
    const tenDigits = digitsOnly.slice(-10);
    return `+91 ${tenDigits.slice(0, 3)}*** **${tenDigits.slice(-2)}`;
  }
  return phone;
}

export default function DashboardOrdersView() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/orders?shopId=${PRIMARY_PILOT_SHOP.id}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load orders");
      }
      setOrders(data.orders || []);
      if (selectedOrder) {
        const refreshed = (data.orders || []).find((o: Order) => o.id === selectedOrder.id);
        if (refreshed) setSelectedOrder(refreshed);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching orders";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }

    setIsLoading(true);
    let unsubscribe = () => {};
    try {
      const q = query(
        collection(db, "orders"),
        where("shopId", "==", PRIMARY_PILOT_SHOP.id)
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const liveOrders: Order[] = [];
          snapshot.forEach((doc) => {
            liveOrders.push(doc.data() as Order);
          });
          liveOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(liveOrders);
          setIsLoading(false);

          if (selectedOrder) {
            const refreshed = liveOrders.find((o) => o.id === selectedOrder.id);
            if (refreshed) setSelectedOrder(refreshed);
          }
        },
        (err) => {
          console.warn("[Dashboard onSnapshot] Fallback to secure API polling:", err);
          fetchOrders();
        }
      );
    } catch {
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }

    return () => unsubscribe();
  }, [user, selectedOrder?.id]);

  const handleConfirmManualUpi = async () => {
    if (!selectedOrder) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch(`/api/orders/${selectedOrder.id}/confirm-manual-upi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to confirm manual UPI payment");
      }
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Confirmation error";
      setActionError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMarkManualUpiNotFound = async () => {
    if (!selectedOrder) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch(`/api/orders/${selectedOrder.id}/mark-manual-upi-not-found`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update payment status");
      }
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error";
      setActionError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleQueueForPrint = async () => {
    if (!selectedOrder) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch(`/api/orders/${selectedOrder.id}/queue-print`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ shopId: PRIMARY_PILOT_SHOP.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to queue order for print");
      }
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to queue order";
      setActionError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStaffAction = async (action: string, note?: string) => {
    if (!selectedOrder) return;
    setIsActionLoading(true);
    setActionError(null);

    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch("/api/orders/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          action,
          note
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Action failed");
      }

      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute action";
      setActionError(msg);
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeFilter === "NEW" && o.status !== "RECEIVED") return false;
      if (activeFilter === "PENDING_VERIFICATION" && o.paymentStatus !== "MANUAL_UPI_REVIEW_PENDING" && o.paymentStatus !== "UPI_PENDING") return false;
      if (activeFilter === "PENDING_PAYMENT" && o.paymentStatus !== "CASH_PENDING" && o.paymentStatus !== "UPI_PENDING" && o.paymentStatus !== "MANUAL_UPI_REVIEW_PENDING") return false;
      if (activeFilter === "ACCEPTED" && o.status !== "ACCEPTED") return false;
      if (activeFilter === "PRINTING" && o.status !== "PRINTING") return false;
      if (activeFilter === "READY" && o.status !== "READY") return false;
      if (activeFilter === "COMPLETED" && o.status !== "COMPLETED") return false;
      if (activeFilter === "CANCELLED" && o.status !== "CANCELLED") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = o.orderNumber.toLowerCase().includes(q);
        const matchesName = o.customerName.toLowerCase().includes(q);
        const matchesPhone = o.customerMobile?.includes(q);
        if (!matchesNum && !matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [orders, activeFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <span>Orders Board</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time feed of walk-in and self-service QR customer print orders for {PRIMARY_PILOT_SHOP.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchOrders}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#CBD5E1] text-xs font-bold text-[#0F172A] rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: "ALL", label: `All (${orders.length})` },
            { id: "NEW", label: `New (${orders.filter((o) => o.status === "RECEIVED").length})` },
            { id: "PENDING_VERIFICATION", label: `Pending UPI (${orders.filter((o) => o.paymentStatus === "MANUAL_UPI_REVIEW_PENDING" || (o.paymentMethod === "MANUAL_UPI" && o.paymentStatus === "UPI_PENDING")).length})` },
            { id: "PENDING_PAYMENT", label: `Unpaid (${orders.filter((o) => o.paymentStatus !== "PAID").length})` },
            { id: "ACCEPTED", label: `Accepted (${orders.filter((o) => o.status === "ACCEPTED").length})` },
            { id: "READY", label: `Ready (${orders.filter((o) => o.status === "READY").length})` },
            { id: "COMPLETED", label: `Done (${orders.filter((o) => o.status === "COMPLETED").length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 border border-[#E2E8F0]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, name, phone..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-slate-50 text-[11px] font-bold text-[#64748B] border-b border-[#E2E8F0] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer (Masked)</th>
                <th className="py-3 px-4">Pages &amp; Config</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No orders match current filter
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const statusMeta = getOrderStatusDisplay(o.status);
                  const item = o.items?.[0];
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#0F172A]">
                        {o.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#0F172A]">{o.customerName}</div>
                        <div className="text-[10px] text-slate-500 font-mono tracking-tight">
                          {maskPhoneNumber(o.customerMobile)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        {o.items && o.items.length > 1 ? (
                          <>
                            <div className="font-bold text-emerald-700">
                              {o.items.length} items &bull; {o.items.reduce((acc, it) => acc + (it.selectedPageCount || 1) * (it.config?.copies || 1), 0)} pages total
                            </div>
                            <div className="text-slate-500 text-[10px] truncate max-w-[200px]">
                              {o.items.map((it, idx) => `#${idx + 1}: ${it.config?.paperSize || 'A4'} ${it.config?.colorMode === 'COLOR' ? 'Color' : 'B&W'}`).join(', ')}
                            </div>
                          </>
                        ) : (
                          <>
                            <div>{item?.selectedPageCount || 1} pages &bull; {item?.config?.copies || 1} copies</div>
                            <div className="text-slate-500 text-[10px]">
                              {item?.config?.paperSize || 'A4'} &bull; {item?.config?.colorMode === "BW" ? "B&W" : "Color"} &bull; {item?.config?.duplexMode === "DOUBLE" ? "Duplex" : "Single"}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-700 text-sm">
                        ₹{o.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          o.paymentStatus === 'PAID'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : o.paymentStatus === 'MANUAL_UPI_REVIEW_PENDING'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                        {new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          className="px-3 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-[#CBD5E1] rounded-xl text-[11px] font-bold text-[#0F172A] transition shadow-xs cursor-pointer"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl text-[#0F172A]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Staff Order Review</span>
                <h2 className="text-lg font-black text-[#0F172A] font-mono">{selectedOrder.orderNumber}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Customer & Payment Status */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-[#E2E8F0]">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Customer</span>
                <span className="font-black text-[#0F172A] text-sm block">{selectedOrder.customerName}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-slate-700 font-mono text-xs font-bold">{selectedOrder.customerMobile}</span>
                  <a
                    href={`tel:${(selectedOrder.customerPhone || selectedOrder.customerMobile).replace(/\D/g, '')}`}
                    className="p-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                    title="Call Customer"
                  >
                    <Phone className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://wa.me/${(selectedOrder.customerPhone || selectedOrder.customerMobile).replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(`Hello ${selectedOrder.customerName}, regarding your print order ${selectedOrder.orderNumber} at Shakeel Online Services:`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                    title="WhatsApp Customer"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </a>
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  WhatsApp Updates: {selectedOrder.marketingConsent ? "Opted In" : "None"}
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] block uppercase font-bold">Payment ({selectedOrder.paymentMethod})</span>
                <span className="text-lg font-black text-emerald-700 font-mono">₹{selectedOrder.totalAmount.toFixed(2)}</span>
                <span className={`text-[10px] font-bold block mt-0.5 ${
                  selectedOrder.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {selectedOrder.paymentStatus}
                </span>
              </div>
            </div>

            {/* Customer Review (if any) */}
            {selectedOrder.review && !selectedOrder.review.skipped && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>Customer Feedback ({selectedOrder.review.rating} / 5 Stars)</span>
                  </span>
                  <span className="text-[10px] text-amber-700">Private Review</span>
                </div>
                {selectedOrder.review.comment && (
                  <p className="text-[#334155] italic">&ldquo;{selectedOrder.review.comment}&rdquo;</p>
                )}
              </div>
            )}

            {/* Item Configuration */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-[#0F172A] uppercase tracking-wider text-[11px]">Print Configuration</span>
              {selectedOrder.items?.map((item) => (
                <div key={item.id} className="bg-slate-50 border border-[#E2E8F0] rounded-xl p-3 space-y-1">
                  <div className="flex justify-between font-bold text-[#0F172A]">
                    <span>{item.selectedPageCount} Pages &times; {item.config?.copies} Copies</span>
                    <span className="text-emerald-700">{item.config?.paperSize} &bull; {item.config?.colorMode}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Sides: {item.config?.duplexMode} ({item.printedSides} sides total)</span>
                    <span>Sheets: {item.estimatedSheets}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px] border-t border-slate-200 pt-1">
                    <span>Orientation: <strong className="text-[#0F172A] font-mono">{item.config?.orientation || "AUTO"}</strong></span>
                    <span>Scaling: <strong className="text-[#0F172A] font-mono">{item.config?.scaling || "FIT"}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="border-t border-[#E2E8F0] pt-4 space-y-2">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">Staff Handling Actions</span>

              <div className="grid grid-cols-2 gap-2">
                {selectedOrder.status === 'ACCEPTED' && selectedOrder.paymentStatus === 'PAID' && (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={handleQueueForPrint}
                    className="col-span-2 py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Queue For Print</span>
                  </button>
                )}

                {selectedOrder.status === "RECEIVED" && (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleStaffAction("ACCEPT_ORDER")}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Order</span>
                  </button>
                )}

                {selectedOrder.paymentStatus === "CASH_PENDING" && (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleStaffAction("CONFIRM_CASH_PAID")}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Confirm Cash (₹{selectedOrder.totalAmount.toFixed(2)})</span>
                  </button>
                )}

                {(selectedOrder.paymentStatus === "MANUAL_UPI_REVIEW_PENDING" || (selectedOrder.paymentMethod === "MANUAL_UPI" && selectedOrder.paymentStatus !== "PAID")) && (
                  <>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={handleConfirmManualUpi}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm UPI Paid</span>
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={handleMarkManualUpiNotFound}
                      className="py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>UPI Not Found</span>
                    </button>
                  </>
                )}

                {selectedOrder.status === "PRINTING" && (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleStaffAction("MARK_READY")}
                    className="col-span-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Prints Ready</span>
                  </button>
                )}

                {selectedOrder.status === "READY" && (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleStaffAction("MARK_COMPLETED")}
                    className="col-span-2 py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Collected &bull; Handover to Customer</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
