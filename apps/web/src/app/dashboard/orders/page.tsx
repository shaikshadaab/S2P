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
  FileText
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, Order, getOrderStatusDisplay } from "@s2p/shared";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase/config";
import { useAuth } from "../../../lib/firebase/auth-context";

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
      const token = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/orders/${selectedOrder.id}/confirm-manual-upi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to confirm manual UPI payment');
      }
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Confirmation error';
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
      const token = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/orders/${selectedOrder.id}/mark-manual-upi-not-found`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update payment status');
      }
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
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
      const token = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/orders/${selectedOrder.id}/queue-print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ shopId: PRIMARY_PILOT_SHOP.id })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to queue order for print');
      }
      await fetchOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to queue order';
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
    <div className="space-y-6 max-w-6xl">
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <span>Orders Board</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time feed of walk-in and self-service QR customer print orders for {PRIMARY_PILOT_SHOP.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchOrders}
            className="px-3 py-1.5 bg-[#1f2937] hover:bg-[#374151] border border-[#374151] text-xs font-semibold text-slate-300 rounded-lg flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: "ALL", label: `All (${orders.length})` },
            { id: "NEW", label: `New (${orders.filter((o) => o.status === "RECEIVED").length})` },
            { id: "PENDING_VERIFICATION", label: `Pending Verification (${orders.filter((o) => o.paymentStatus === "MANUAL_UPI_REVIEW_PENDING" || (o.paymentMethod === "MANUAL_UPI" && o.paymentStatus === "UPI_PENDING")).length})` },
            { id: "PENDING_PAYMENT", label: `Unpaid (${orders.filter((o) => o.paymentStatus !== "PAID").length})` },
            { id: "ACCEPTED", label: `Accepted (${orders.filter((o) => o.status === "ACCEPTED").length})` },
            { id: "READY", label: `Ready (${orders.filter((o) => o.status === "READY").length})` },
            { id: "COMPLETED", label: `Done (${orders.filter((o) => o.status === "COMPLETED").length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition shrink-0 ${
                activeFilter === tab.id
                  ? "bg-emerald-600 text-white"
                  : "bg-[#111827] text-slate-400 hover:text-white border border-[#1f2937]"
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
            className="w-full pl-8 pr-3 py-1.5 bg-[#111827] border border-[#1f2937] rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/50 border border-rose-500/40 rounded-xl p-3 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#16202c] text-[11px] font-bold text-slate-400 border-b border-[#1f2937] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Pages & Config</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Order Status</th>
                <th className="py-3 px-4">Created Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2937]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No orders match current filter
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const statusMeta = getOrderStatusDisplay(o.status);
                  const item = o.items?.[0];
                  return (
                    <tr key={o.id} className="hover:bg-[#16202c]/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {o.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{o.customerName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{o.customerMobile}</div>
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        {o.items && o.items.length > 1 ? (
                          <>
                            <div className="font-bold text-emerald-400">
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
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                        ₹{o.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.paymentStatus === "PAID"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-950 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {o.paymentStatus === "PAID" ? "Paid" : o.paymentStatus === "MANUAL_UPI_REVIEW_PENDING" ? "Review Pending" : o.paymentStatus === "MANUAL_UPI_NOT_FOUND" ? "Not Found" : o.paymentMethod === "CASH" ? "Cash Pending" : "UPI Pending"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1f2937] text-slate-300 border border-[#374151]">
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(o.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          className="px-2.5 py-1 bg-[#1f2937] hover:bg-emerald-600 hover:text-white border border-[#374151] rounded text-[11px] font-semibold text-slate-300 transition"
                        >
                          View Details
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1f2937] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between border-b border-[#1f2937] pb-3">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Staff Order Review</span>
                <h3 className="text-base font-bold text-white font-mono">{selectedOrder.orderNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="bg-rose-950/60 border border-rose-500/40 rounded-lg p-2.5 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Customer & Payment Status */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#16202c] p-3 rounded-xl border border-[#1f2937]">
              <div>
                <span className="text-slate-500 text-[10px] block">Customer</span>
                <span className="font-bold text-white block">{selectedOrder.customerName}</span>
                <span className="text-slate-400 font-mono text-[11px]">{selectedOrder.customerMobile}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] block">Payment ({selectedOrder.paymentMethod})</span>
                <span className="text-base font-black text-emerald-400 font-mono">₹{selectedOrder.totalAmount.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 block">{selectedOrder.paymentStatus}</span>
              </div>
            </div>

            {/* Item Configuration */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Print Configuration</span>
              {selectedOrder.items?.map((item) => (
                <div key={item.id} className="bg-[#1f2937]/50 border border-[#374151] rounded-lg p-2.5 space-y-1">
                  <div className="flex justify-between font-semibold text-white">
                    <span>{item.selectedPageCount} Pages &times; {item.config?.copies} Copies</span>
                    <span>{item.config?.paperSize} &bull; {item.config?.colorMode}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Sides: {item.config?.duplexMode} ({item.printedSides} sides total)</span>
                    <span>Sheets: {item.estimatedSheets}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px] border-t border-[#374151]/40 pt-1">
                    <span>Orientation: <strong className="text-slate-200 font-mono">{item.config?.orientation || "AUTO"}</strong></span>
                    <span>Scaling: <strong className="text-slate-200 font-mono">{item.config?.scaling || "FIT"}</strong></span>
                  </div>
                  {item.config?.finishing !== "NONE" && (
                    <div className="text-amber-400 text-[11px]">Finishing: {item.config?.finishing}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="border-t border-[#1f2937] pt-3 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Staff Actions</span>

              <div className="grid grid-cols-2 gap-2">
                
                {selectedOrder.status === 'ACCEPTED' && selectedOrder.paymentStatus === 'PAID' && (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={handleQueueForPrint}
                    className="col-span-2 py-2.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
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
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Order</span>
                  </button>
                )}

                {selectedOrder.paymentStatus === "CASH_PENDING" && (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleStaffAction("MARK_CASH_PAID")}
                    className="py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Mark Cash Paid</span>
                  </button>
                )}

                {/* MANUAL UPI VERIFICATION CONTROLS */}
                {selectedOrder.paymentMethod === "MANUAL_UPI" && selectedOrder.paymentStatus !== "PAID" && (
                  <div className="col-span-2 bg-[#0d1824] border border-blue-500/30 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">Manual UPI Verification</span>
                      <span className="font-mono text-[11px] text-slate-300">Ref: {selectedOrder.manualPaymentReference || 'None'}</span>
                    </div>

                    {selectedOrder.customerClaimedUtr && (
                      <div className="text-[11px] text-slate-300 bg-[#162232] p-2 rounded border border-blue-500/20 flex justify-between">
                        <span className="text-slate-400">Customer UTR:</span>
                        <strong className="font-mono text-white">{selectedOrder.customerClaimedUtr}</strong>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={handleConfirmManualUpi}
                        className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Payment</span>
                      </button>

                      <button
                        type="button"
                        disabled={isActionLoading}
                        onClick={handleMarkManualUpiNotFound}
                        className="py-2.5 px-3 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Not Received</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedOrder.status !== "ON_HOLD" && selectedOrder.status !== "COMPLETED" && selectedOrder.status !== "CANCELLED" && (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleStaffAction("HOLD_ORDER")}
                    className="py-2 px-3 bg-[#1f2937] hover:bg-amber-600 hover:text-white text-slate-300 border border-[#374151] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Put On Hold</span>
                  </button>
                )}

                {selectedOrder.status !== "COMPLETED" && selectedOrder.status !== "CANCELLED" && (
                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => handleStaffAction("CANCEL_ORDER")}
                    className="py-2 px-3 bg-[#1f2937] hover:bg-rose-600 hover:text-white text-slate-300 border border-[#374151] rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel Order</span>
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