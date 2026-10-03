"use client";

import React, { useState } from "react";
import { Smartphone, CheckCircle2, Play, RefreshCw, Printer, ShieldCheck, Sparkles, FileText, IndianRupee } from "lucide-react";
import { Language } from "./navbar";

interface LandingInteractiveDemoProps {
  lang: Language;
}

export function LandingInteractiveDemo({ lang }: LandingInteractiveDemoProps) {
  const [selectedDoc, setSelectedDoc] = useState<"notes" | "aadhaar" | "photo">("notes");
  const [colorMode, setColorMode] = useState<"bw" | "color">("bw");
  const [isDuplex, setIsDuplex] = useState<boolean>(true);
  const [copies, setCopies] = useState<number>(1);
  const [demoState, setDemoState] = useState<"config" | "paying" | "printing" | "success">("config");

  // Calculate pricing
  const basePages = selectedDoc === "notes" ? 4 : selectedDoc === "aadhaar" ? 2 : 1;
  const pageRate = colorMode === "color" ? 10 : isDuplex ? 1.5 : 2;
  const totalPrice = Math.round(basePages * pageRate * copies + 2); // +2 service fee

  const handleSimulatePayment = () => {
    setDemoState("paying");
    setTimeout(() => {
      setDemoState("printing");
      setTimeout(() => {
        setDemoState("success");
      }, 2000);
    }, 1500);
  };

  const handleReset = () => {
    setDemoState("config");
  };

  return (
    <section className="py-20 bg-[#121018] text-white relative overflow-hidden" id="demo">
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#20C878]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-[#20C878] text-xs font-bold mb-3 shadow-sm">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{lang === "hi" ? "करके देखो — लाइव इंटरएक्टिव डेमो" : "Try It Yourself — Live Interactive Demo"}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white tracking-tight">
            {lang === "hi" ? "📱 ग्राहक के फोन से कैसे प्रिंट निकलता है?" : "How Does It Work From Customer's Phone?"}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-white/60">
            {lang === "hi"
              ? "नीचे खुद विकल्प चुनकर PhonePe से प्रिंट टेस्ट करें और देखें कि दुकान के कंप्यूटर पर क्या होता है।"
              : "Experience the customer's exact 10-second mobile journey from QR scan to automatic printing."}
          </p>
        </div>

        {/* Interactive Split Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          {/* LEFT: Customer Phone Screen */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[340px] bg-white text-[#121018] rounded-[40px] p-4 shadow-2xl border-4 border-black/40 relative overflow-hidden">
              {/* Phone Speaker Notch */}
              <div className="w-28 h-4 bg-black/80 rounded-full mx-auto mb-4" />

              {/* Mobile Header */}
              <div className="flex items-center justify-between pb-3 border-b border-black/10">
                <div className="flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-[#20C878]" />
                  <span className="font-extrabold text-xs font-heading">Om Sai Xerox & Print</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#20C878] animate-pulse" />
              </div>

              {demoState === "config" && (
                <div className="space-y-4 pt-3 text-xs">
                  {/* Document Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-black/50 uppercase block mb-1">
                      1. Choose Document
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "notes", label: "Notes PDF", pages: "4 Pgs" },
                        { id: "aadhaar", label: "Aadhaar Card", pages: "2 Pgs" },
                        { id: "photo", label: "Passport Photo", pages: "1 Pg" },
                      ].map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => setSelectedDoc(doc.id as any)}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            selectedDoc === doc.id
                              ? "border-[#20C878] bg-[#E8FAF1] font-bold text-[#121018]"
                              : "border-black/10 text-black/60 hover:bg-black/5"
                          }`}
                        >
                          <span className="block truncate text-[11px]">{doc.label}</span>
                          <span className="text-[9px] text-black/40">{doc.pages}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-black/50 uppercase block mb-1">Color</label>
                      <div className="flex rounded-lg border border-black/10 overflow-hidden bg-[#FAFAF8]">
                        <button
                          onClick={() => setColorMode("bw")}
                          className={`flex-1 py-1 text-[11px] font-bold ${colorMode === "bw" ? "bg-[#121018] text-white" : ""}`}
                        >
                          B&W
                        </button>
                        <button
                          onClick={() => setColorMode("color")}
                          className={`flex-1 py-1 text-[11px] font-bold ${colorMode === "color" ? "bg-[#20C878] text-white" : ""}`}
                        >
                          Color
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-black/50 uppercase block mb-1">Sides</label>
                      <div className="flex rounded-lg border border-black/10 overflow-hidden bg-[#FAFAF8]">
                        <button
                          onClick={() => setIsDuplex(false)}
                          className={`flex-1 py-1 text-[11px] font-bold ${!isDuplex ? "bg-[#121018] text-white" : ""}`}
                        >
                          1-Side
                        </button>
                        <button
                          onClick={() => setIsDuplex(true)}
                          className={`flex-1 py-1 text-[11px] font-bold ${isDuplex ? "bg-[#121018] text-white" : ""}`}
                        >
                          Both
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Cost Box */}
                  <div className="p-3 bg-[#FAFAF8] rounded-xl border border-black/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-black/50 uppercase font-bold block">Total Amount</span>
                      <div className="text-xl font-extrabold font-mono text-[#121018]">₹{totalPrice}.00</div>
                    </div>
                    <span className="text-[10px] text-[#18AA64] font-semibold bg-[#E8FAF1] px-2 py-0.5 rounded-full">
                      Inclusive of Taxes
                    </span>
                  </div>

                  {/* Pay with PhonePe CTA */}
                  <button
                    onClick={handleSimulatePayment}
                    className="w-full py-3 rounded-xl bg-[#5f259f] hover:bg-[#4b1d7d] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <span>Pay ₹{totalPrice}.00 via PhonePe UPI</span>
                  </button>
                  <p className="text-[9px] text-center text-black/40">
                    VPA: 9581529381@ybl • Direct to Shop Owner Bank
                  </p>
                </div>
              )}

              {demoState === "paying" && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-[#5f259f] border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs font-bold text-[#5f259f]">Contacting PhonePe Gateway...</p>
                  <p className="text-[10px] text-black/50">Authorizing ₹{totalPrice}.00 for 9581529381@ybl</p>
                </div>
              )}

              {demoState === "printing" && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#E8FAF1] text-[#20C878] flex items-center justify-center mx-auto shadow-sm">
                    <Printer className="w-6 h-6 animate-pulse" />
                  </div>
                  <p className="text-xs font-bold text-[#18AA64]">Payment Verified! Spooling...</p>
                  <p className="text-[10px] text-black/50">Dispatched to HP Smart Tank 580-590</p>
                </div>
              )}

              {demoState === "success" && (
                <div className="py-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#20C878] text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm text-[#121018]">Print Completed! 🎉</h5>
                    <p className="text-[10px] text-black/60 mt-0.5">Please collect your print from the counter tray.</p>
                  </div>
                  <div className="p-3 bg-[#FAFAF8] rounded-xl text-[10px] text-black/60 text-left space-y-1">
                    <p>Order ID: #VNT-DEMO-9912</p>
                    <p>Payment: ₹{totalPrice}.00 via PhonePe UPI (Success)</p>
                    <p>Security: File auto-deleted from disk.</p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6D3AE8] hover:underline"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Another Print Demo</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Shop Counter PC Terminal */}
          <div className="lg:col-span-6 bg-[#1C1827] rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-white/50 text-[11px] ml-2">Vintha Windows Print Agent v1.0.0</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#20C878]/20 text-[#20C878] font-bold">
                Online • HP Smart Tank
              </span>
            </div>

            <div className="space-y-2 text-[11px] min-h-[220px]">
              <p className="text-white/40">[AGENT BOOT] Listening on shop: Om Sai Xerox & Print (shop-om-sai-001)</p>
              <p className="text-white/40">[PRINTER] Primary: HP51C8E5 (HP Smart Tank 580-590 series) — Ready</p>
              <p className="text-white/40">[GATEWAY] PhonePe UPI receiver VPA: 9581529381@ybl (0% Fee Active)</p>

              {demoState === "paying" && (
                <p className="text-amber-400 animate-pulse">
                  [INCOMING] Customer scanning shop QR poster... creating order #{totalPrice}
                </p>
              )}

              {(demoState === "printing" || demoState === "success") && (
                <>
                  <p className="text-[#20C878]">
                    [PAYMENT VERIFIED] ₹{totalPrice}.00 captured via PhonePe VPA 9581529381@ybl
                  </p>
                  <p className="text-white/80">
                    [DISPATCH] Document: {selectedDoc.toUpperCase()} • {basePages} pages • {colorMode.toUpperCase()}
                  </p>
                  <p className="text-white/80">
                    [SPOOL] Sending silent job to printer 'HP51C8E5 (HP Smart Tank 580-590 series)'...
                  </p>
                </>
              )}

              {demoState === "success" && (
                <>
                  <p className="text-[#20C878] font-bold">
                    [SUCCESS] Hardware spooler returned exit code 0. Paper ejected.
                  </p>
                  <p className="text-white/50">
                    [ZERO-TRUST] Customer file shredded and permanently erased from disk.
                  </p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
              <span>Zero clicks by shopkeeper</span>
              <span className="text-[#20C878]">100% Automated</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
