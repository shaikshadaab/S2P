"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  ArrowUpRight,
  Loader2,
  FileText
} from "lucide-react";
import { PRIMARY_PILOT_SHOP, BRAND_FULL_NAME, Order } from "@s2p/shared";
import { useAuth } from "../../../lib/firebase/auth-context";

type FilterPeriod = "TODAY" | "WEEK" | "ALL";

export default function ReportsPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("TODAY");

  useEffect(() => {
    let isMounted = true;
    const fetchOrders = async () => {
      try {
        const res = await fetch(`/api/orders?shopId=${PRIMARY_PILOT_SHOP.id}`);
        const data = await res.json();
        if (res.ok && data.success && isMounted) {
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error("Failed to load orders for reports:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter orders by period
  const filteredOrders = orders.filter((o) => {
    if (filterPeriod === "ALL") return true;
    const orderDate = new Date(o.createdAt).getTime();
    const now = Date.now();
    if (filterPeriod === "TODAY") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return orderDate >= todayStart.getTime();
    }
    if (filterPeriod === "WEEK") {
      const weekStart = now - 7 * 24 * 60 * 60 * 1000;
      return orderDate >= weekStart;
    }
    return true;
  });

  // Calculate Metrics
  const paidOrders = filteredOrders.filter((o) => o.paymentStatus === "PAID");
  const totalRevenuePaise = paidOrders.reduce(
    (sum, o) => sum + (o.totalPaise || 0),
    0
  );
  const totalRevenueRupees = (totalRevenuePaise / 100).toFixed(2);

  const cashRevenuePaise = paidOrders
    .filter((o) => o.paymentMethod === "CASH")
    .reduce((sum, o) => sum + (o.totalPaise || 0), 0);

  const upiRevenuePaise = paidOrders
    .filter((o) => o.paymentMethod === "MANUAL_UPI")
    .reduce((sum, o) => sum + (o.totalPaise || 0), 0);

  const onlineRevenuePaise = paidOrders
    .filter((o) => o.paymentMethod === "ONLINE_GATEWAY")
    .reduce((sum, o) => sum + (o.totalPaise || 0), 0);

  // Printed Sheets and Sides
  let totalPrintedSides = 0;
  let totalSheets = 0;
  paidOrders.forEach((o) => {
    o.items?.forEach((item) => {
      totalPrintedSides += item.printedSides || 0;
      totalSheets += item.estimatedSheets || 0;
    });
  });

  const handleExportCsv = () => {
    const rows = [
      ["Order Number", "Date", "Status", "Payment Method", "Payment Status", "Total (INR)", "Sheets"],
      ...filteredOrders.map((o) => [
        o.orderNumber,
        new Date(o.createdAt).toLocaleString(),
        o.status,
        o.paymentMethod || "UNKNOWN",
        o.paymentStatus,
        ((o.totalPaise || 0) / 100).toFixed(2),
        String(o.items?.reduce((acc, i) => acc + (i.estimatedSheets || 0), 0) || 1)
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SOS-Report-${filterPeriod}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white tracking-tight">Business Reports & Financials</h1>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Authoritative Feed
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time daily print revenue, payment breakdown, and paper volume for {PRIMARY_PILOT_SHOP.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Period Buttons */}
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-1 flex">
            {(["TODAY", "WEEK", "ALL"] as FilterPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setFilterPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  filterPeriod === p
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {p === "TODAY" ? "Today" : p === "WEEK" ? "Last 7 Days" : "All Time"}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1f2937] hover:bg-[#374151] disabled:opacity-50 text-white text-xs font-bold rounded-xl border border-[#374151] transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-[#111827] border border-emerald-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/70 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-white font-mono">
              ₹{totalRevenueRupees}
            </span>
            <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{paidOrders.length} Paid Orders</span>
            </div>
          </div>
        </div>

        {/* Counter Cash Revenue */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Cash at Counter
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/40 text-emerald-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white font-mono">
              ₹{(cashRevenuePaise / 100).toFixed(2)}
            </span>
            <p className="mt-1 text-[11px] text-slate-500">
              Physical cash collected at till
            </p>
          </div>
        </div>

        {/* UPI & Online Gateway */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              UPI & Razorpay Online
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/40 text-emerald-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white font-mono">
              ₹{((upiRevenuePaise + onlineRevenuePaise) / 100).toFixed(2)}
            </span>
            <p className="mt-1 text-[11px] text-slate-500">
              Direct UPI + Online gateway payments
            </p>
          </div>
        </div>

        {/* Total Output Sheets */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Printed Sheets
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/40 text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white font-mono">
              {totalSheets} <span className="text-sm font-normal text-slate-400">sheets</span>
            </span>
            <p className="mt-1 text-[11px] text-slate-500">
              {totalPrintedSides} printed sides spooled
            </p>
          </div>
        </div>
      </div>

      {/* Orders Breakdown Table */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">
              Order Transactions ({filteredOrders.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {PRIMARY_PILOT_SHOP.id}
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs">Loading transaction records...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No orders found for the selected time window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1f2937]/50 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Output</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2937] text-slate-300">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#16202c]/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      #{o.orderNumber}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {o.customerName || "Customer"}
                      {o.customerMobile && (
                        <span className="block text-[10px] text-slate-500 font-mono">
                          {o.customerMobile}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-300">
                        {o.paymentMethod || "CASH"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          o.paymentStatus === "PAID"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-950 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px] font-mono">
                      {o.items?.reduce((acc, i) => acc + (i.printedSides || 0), 0) || 1} sides • {o.items?.reduce((acc, i) => acc + (i.estimatedSheets || 0), 0) || 1} sheets
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white">
                      ₹{((o.totalPaise || 0) / 100).toFixed(2)}
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
