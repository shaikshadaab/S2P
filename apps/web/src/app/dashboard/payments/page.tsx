"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Banknote,
  QrCode,
  ShieldCheck,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, Order } from "@s2p/shared";
import { useAuth } from "../../../lib/firebase/auth-context";

export default function DashboardPaymentsPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchPayments = async () => {
    try {
      const token = user ? await user.getIdToken() : "";
      const res = await fetch(`/api/orders?shopId=${PRIMARY_PILOT_SHOP.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.orders || []);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    const interval = setInterval(fetchPayments, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const paidOrders = orders.filter(o => o.paymentStatus === "PAID");
  const totalCollectedPaise = paidOrders.reduce((sum, o) => {
    return sum + (o.pricingSnapshot?.totalPaise || (o.totalAmount || 0) * 100);
  }, 0);

  const cashPaidOrders = paidOrders.filter(o => o.paymentMethod === "CASH");
  const cashTotalPaise = cashPaidOrders.reduce((sum, o) => {
    return sum + (o.pricingSnapshot?.totalPaise || (o.totalAmount || 0) * 100);
  }, 0);

  const upiPaidOrders = paidOrders.filter(o => o.paymentMethod === "MANUAL_UPI");
  const upiTotalPaise = upiPaidOrders.reduce((sum, o) => {
    return sum + (o.pricingSnapshot?.totalPaise || (o.totalAmount || 0) * 100);
  }, 0);

  const filteredOrders = paidOrders.filter(o => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        (o.paymentReference && o.paymentReference.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Payments & Reconciliation Audit</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#111827] mt-0.5">
            Counter Payments & Audits
          </h1>
          <p className="text-xs text-[#475569] mt-0.5">
            Authoritative cash and direct UPI reconciliation records for {PRIMARY_PILOT_SHOP.name}.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPayments}
          disabled={isLoading}
          className="p-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#475569] transition self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
            <span>Total Collected</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-[#111827] font-mono mt-2">
            ₹{(totalCollectedPaise / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-[#475569] mt-1 font-medium">
            {paidOrders.length} verified transactions
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
            <span>Counter Cash</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono mt-2">
            ₹{(cashTotalPaise / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-[#475569] mt-1 font-medium">
            {cashPaidOrders.length} cash orders verified
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
            <span>Direct UPI (9581529381@ybl)</span>
            <QrCode className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 font-mono mt-2">
            ₹{(upiTotalPaise / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-[#475569] mt-1 font-medium">
            {upiPaidOrders.length} direct transfers verified
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-bold text-sm text-[#111827]">
            Payment Receipts Audit ({filteredOrders.length})
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by order # or ref..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-[#CBD5E1] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            No verified payment transactions match your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Verified Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#111827]">
                      #{order.orderNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#111827]">
                      {order.customerName}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        order.paymentMethod === "CASH"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}>
                        {order.paymentMethod === "CASH" ? "CASH" : "DIRECT UPI"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-[#111827]">
                      ₹{(order.pricingSnapshot ? order.pricingSnapshot.totalPaise / 100 : (order.totalAmount || 0)).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {order.paymentReference || order.customerClaimedUtr || "Counter Verified"}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#64748B]">
                      {new Date(order.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
