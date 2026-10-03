"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Phone,
  MessageSquare,
  Sparkles,
  RefreshCw,
  FileText,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { getCustomerStatusDisplay, OrderStatus } from "@vintha/shared";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = (params.id as string) || "VNT-8942";

  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Poll for live status update every 3 seconds
  useEffect(() => {
    const fetchOrderStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (data.success) {
          setOrderData(data);
        }
      } catch {
        // Fallback demo state
      } finally {
        setLoading(false);
      }
    };

    fetchOrderStatus();
    const interval = setInterval(fetchOrderStatus, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  const order = orderData?.order || {
    id: orderId,
    status: "PRINTING" as OrderStatus,
    customerName: "Customer",
    fileName: "Document.pdf",
    printableSides: 4,
    physicalSheets: 2,
    copies: 1,
    colorMode: "bw",
    paperSize: "A4",
    isDuplex: true,
    pageRangeText: "all",
    createdAt: new Date().toISOString(),
  };

  const shop = orderData?.shop || {
    name: "Om Sai Xerox & Digital Print",
    address: "Shop Counter",
    mobile: "9876543210",
    whatsapp: "9876543210",
  };

  const statusInfo = getCustomerStatusDisplay(order.status);

  const stepsList = [
    { title: "Uploaded", step: 1 },
    { title: "In Queue", step: 3 },
    { title: "Printing", step: 4 },
    { title: "Done", step: 5 },
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1E1035] flex flex-col justify-between">
      {/* Header */}
      <header className="bg-white border-b border-black/5 py-4 px-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 font-extrabold text-sm text-[#1E1035]">
            <div className="w-8 h-8 rounded-xl bg-[#1E1035] text-white flex items-center justify-center shadow-sm">
              <Printer className="w-4 h-4 text-[#FF2D78]" />
            </div>
            <span>QR Print <span className="text-[#FF2D78]">System</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-[#1E1035]/5 text-[#1E1035] px-3 py-1 rounded-lg">
              {order.id}
            </span>
          </div>
        </div>
      </header>

      {/* Main Status Container */}
      <main className="max-w-xl mx-auto px-4 py-8 w-full space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-black/5 shadow-sm text-center space-y-4">
          <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center transition-all shadow-sm ${
            order.status === "COMPLETED"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : order.status === "FAILED"
              ? "bg-rose-50 text-rose-600 border border-rose-100"
              : "bg-purple-50 text-[#1E1035] border border-purple-100"
          }`}>
            {order.status === "COMPLETED" ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            ) : order.status === "FAILED" ? (
              <AlertTriangle className="w-10 h-10 text-rose-600" />
            ) : (
              <Printer className="w-10 h-10 text-[#FF2D78] animate-pulse" />
            )}
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FF2D78]/10 text-[#FF2D78]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% Free Instant Print</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1E1035] mt-2">
              {statusInfo.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#1E1035]/70 mt-1 max-w-sm mx-auto">
              {statusInfo.description}
            </p>
          </div>

          {/* Step Progression Bar */}
          <div className="pt-4 border-t border-black/5">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#1E1035]/60 mb-2">
              {stepsList.map((s, idx) => (
                <span
                  key={idx}
                  className={statusInfo.stepIndex >= s.step ? "text-[#FF2D78]" : "text-[#1E1035]/30"}
                >
                  {s.title}
                </span>
              ))}
            </div>
            <div className="w-full h-2.5 bg-black/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1E1035] to-[#FF2D78] transition-all duration-500 rounded-full"
                style={{
                  width:
                    order.status === "COMPLETED"
                      ? "100%"
                      : order.status === "PRINTING" || order.status === "CLAIMED"
                      ? "75%"
                      : order.status === "QUEUED"
                      ? "50%"
                      : "25%",
                }}
              />
            </div>
          </div>
        </div>

        {/* Order Details Summary Card */}
        <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-black/5">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-[#1E1035]/80">
              Print Job Details
            </h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Free Service
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#1E1035]/40 block text-[11px] font-medium">Shop Counter</span>
              <span className="font-bold text-[#1E1035] text-sm">{shop.name}</span>
            </div>
            <div>
              <span className="text-[#1E1035]/40 block text-[11px] font-medium">Customer Name</span>
              <span className="font-bold text-[#1E1035] text-sm">{order.customerName}</span>
            </div>
            <div>
              <span className="text-[#1E1035]/40 block text-[11px] font-medium">Document / File</span>
              <span className="font-bold text-[#1E1035] truncate block">{order.fileName || "Uploaded Document"}</span>
            </div>
            <div>
              <span className="text-[#1E1035]/40 block text-[11px] font-medium">Print Configuration</span>
              <span className="font-bold text-[#1E1035]">
                {order.colorMode === "color" ? "Full Color" : "Black & White"} • {order.paperSize || "A4"}
              </span>
            </div>
            <div className="col-span-2 bg-[#F8F7FA] p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-[#1E1035]/60 block font-medium">Paper Quantity</span>
                <span className="font-extrabold text-[#1E1035] text-sm">
                  {order.physicalSheets} Sheets ({order.isDuplex ? "Duplex / Double Sided" : "Single Sided"})
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#1E1035]/60 block font-medium">Copies</span>
                <span className="font-extrabold text-[#FF2D78] text-sm">{order.copies}x</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-black/5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 text-xs font-bold text-[#1E1035] flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Print Token Slip</span>
            </button>

            <span className="text-[11px] text-[#1E1035]/60 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#FF2D78]" />
              <span>Auto-refreshing</span>
            </span>
          </div>
        </div>

        {/* Counter Help Contact */}
        <div className="bg-[#1E1035] text-white rounded-3xl p-5 shadow-lg flex items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-sm">Need Help at the Counter?</h4>
            <p className="text-xs text-white/70 mt-0.5">Collect your printed sheets directly from the tray.</p>
          </div>

          <div className="flex items-center gap-2">
            {shop.whatsapp && (
              <a
                href={`https://wa.me/91${shop.whatsapp}?text=Order%20${order.id}%20Status%20Inquiry`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-xl bg-[#FF2D78] hover:bg-[#E0246A] text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}
            {shop.mobile && (
              <a
                href={`tel:${shop.mobile}`}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="text-center py-4 text-xs text-[#1E1035]/40 font-medium">
        Free QR Print System • Live Auto-Update
      </footer>
    </div>
  );
}
