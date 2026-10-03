"use client";

import React from "react";
import { Printer, MapPin, Phone, MessageSquare, ShieldCheck } from "lucide-react";
import { Shop } from "@vintha/shared";

interface CustomerHeaderProps {
  shop: Shop;
  printerOnline: boolean;
}

export function CustomerHeader({ shop, printerOnline }: CustomerHeaderProps) {
  return (
    <header className="bg-white border-b border-black/10 sticky top-0 z-30 shadow-sm">
      <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between">
        {/* Shop Info */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#121018] flex items-center justify-center text-white font-heading font-black text-lg shadow-sm">
            {shop.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-[#121018] leading-tight flex items-center gap-1.5">
              <span>{shop.name}</span>
              <span className="text-[10px] bg-[#20C878]/15 text-[#18AA64] font-bold px-1.5 py-0.5 rounded">
                Verified
              </span>
            </h1>
            <p className="text-xs text-black/55 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-[280px]">{shop.address}, {shop.city}</span>
            </p>
          </div>
        </div>

        {/* Action / Help Contact */}
        <div className="flex items-center gap-2">
          {shop.whatsappNumber && (
            <a
              href={`https://wa.me/91${shop.whatsappNumber}?text=Hi,%20I%20am%20at%20your%20counter%20printing%20via%20Vintha%20Print`}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-[#E8FAF1] text-[#20C878] hover:bg-[#20C878] hover:text-white transition-colors"
              title="WhatsApp Shop"
            >
              <MessageSquare className="w-4 h-4" />
            </a>
          )}
          {shop.mobile && (
            <a
              href={`tel:${shop.mobile}`}
              className="p-2 rounded-xl bg-black/5 text-[#121018] hover:bg-black hover:text-white transition-colors"
              title="Call Shop"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-[#FAFAF8] px-4 py-1.5 border-t border-black/5 flex items-center justify-between text-[11px] font-semibold max-w-xl mx-auto">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${shop.isOpen ? "bg-[#20C878]" : "bg-red-500"}`} />
          <span>{shop.isOpen ? "Shop is Open" : "Shop Closed"}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${printerOnline ? "bg-[#20C878]" : "bg-amber-400"}`} />
          <span>{printerOnline ? "Printer Ready (Online)" : "Printer Connecting..."}</span>
        </div>
      </div>
    </header>
  );
}
