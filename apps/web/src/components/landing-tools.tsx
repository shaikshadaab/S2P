"use client";

import React, { useState } from "react";
import { Camera, FileText, Sparkles, Check, Scissors, Layers, Download, Printer } from "lucide-react";
import { Language } from "./navbar";

interface LandingToolsProps {
  lang: Language;
}

export function LandingTools({ lang }: LandingToolsProps) {
  const [photoCount, setPhotoCount] = useState<4 | 6 | 8>(6);
  const [hasBorder, setHasBorder] = useState(true);
  const [resumeTemplate, setResumeTemplate] = useState<number>(1);

  return (
    <section className="py-20 bg-white border-b border-black/5 relative overflow-hidden" id="extra-tools">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#6D3AE8]" />
            <span>{lang === "hi" ? "सिर्फ प्रिंट नहीं — पूरी दुकान का सिस्टम" : "Not Just Prints — Complete Shop Suite"}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-[#121018] tracking-tight">
            {lang === "hi" ? "📸 पासपोर्ट फोटो शीट और रिज्यूमे मेकर" : "4×6 Passport Photo Sheet & Resume Maker"}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-black/60">
            {lang === "hi"
              ? "ग्राहक खुद अपने मोबाइल से फोटो सेट करे या रिज्यूमे बनाए — आपकी बिना किसी मेहनत के ₹30-₹50 की एक्स्ट्रा कमाई!"
              : "Customers format their own passport photo sheets or build professional resumes right from their smartphone."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Tool 1: 4x6 Passport Photo Sheet Generator */}
          <div className="rounded-3xl p-6 sm:p-8 bg-[#FAFAF8] border border-black/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-black/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#6D3AE8]/10 text-[#6D3AE8] flex items-center justify-center font-bold">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#121018] font-heading">
                    {lang === "hi" ? "4×6 पासपोर्ट फोटो शीट जनरेटर" : "4×6 Passport Photo Sheet Generator"}
                  </h3>
                  <p className="text-xs text-black/60">
                    {lang === "hi" ? "कटिंग लाइन्स के साथ ऑटो-अलाइनमेंट" : "Instant layout with cutting lines"}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#20C878]/10 text-[#18AA64]">
                {lang === "hi" ? "₹30-₹50 प्रति शीट कमाई" : "₹30-₹50 profit/sheet"}
              </span>
            </div>

            {/* Interactive Preview Canvas */}
            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-black/15 flex flex-col items-center justify-center">
              <div className="text-[11px] font-bold text-black/40 mb-3 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-black/40" />
                <span>Standard 4×6 Inch Photo Paper Sheet Preview</span>
              </div>

              {/* 4x6 Canvas Simulation */}
              <div className="w-64 h-44 bg-[#F2F2F0] rounded-lg p-2.5 shadow-inner border border-black/10 grid grid-cols-3 gap-2 items-center justify-center">
                {Array.from({ length: photoCount }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-16 rounded bg-white border flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                      hasBorder ? "border-dashed border-black/30" : "border-black/10"
                    }`}
                  >
                    <div className="w-8 h-9 bg-gradient-to-b from-blue-100 to-indigo-100 rounded-sm flex items-center justify-center text-[8px] font-bold text-indigo-700">
                      PHOTO
                    </div>
                    <span className="text-[7px] text-black/40 mt-0.5">3.5×4.5cm</span>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div className="mt-4 flex flex-wrap items-center justify-between w-full pt-3 border-t border-black/10 text-xs font-semibold text-black/70">
                <div className="flex items-center gap-2">
                  <span>{lang === "hi" ? "फोटो संख्या:" : "Count:"}</span>
                  <div className="flex rounded-lg border border-black/10 overflow-hidden bg-white">
                    {[4, 6, 8].map((c) => (
                      <button
                        key={c}
                        onClick={() => setPhotoCount(c as any)}
                        className={`px-2.5 py-1 text-xs transition-all ${
                          photoCount === c ? "bg-[#121018] text-white" : "hover:bg-black/5"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBorder}
                    onChange={(e) => setHasBorder(e.target.checked)}
                    className="accent-[#20C878] rounded"
                  />
                  <span>{lang === "hi" ? "कटिंग लाइन्स" : "Cutting lines"}</span>
                </label>
              </div>
            </div>

            <p className="text-xs text-black/60 leading-relaxed">
              {lang === "hi"
                ? "ग्राहक मोबाइल पर अपनी फोटो अपलोड करता है, फेस सेंटर करता है, और ऑटोमैटिक 4×6 ग्लॉसी फोटो पेपर पर प्रिंट निकल जाता है। फोटोशॉप खोलने की बिल्कुल ज़रूरत नहीं!"
                : "Zero Photoshop needed. Customers upload, crop their face, and the sheet prints directly to your Epson/Canon photo printer."}
            </p>
          </div>

          {/* Tool 2: Built-in Resume Maker */}
          <div className="rounded-3xl p-6 sm:p-8 bg-[#FAFAF8] border border-black/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-black/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#20C878]/10 text-[#18AA64] flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#121018] font-heading">
                    {lang === "hi" ? "6 डिज़ाइन का बायोडाटा / रिज्यूमे मेकर" : "6 Ready-to-Print Resume Templates"}
                  </h3>
                  <p className="text-xs text-black/60">
                    {lang === "hi" ? "ग्राहक खुद भरे, प्रिंट काउंटर से निकले" : "Self-service biodata & CV builder"}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#6D3AE8]/10 text-[#6D3AE8]">
                {lang === "hi" ? "₹30-₹70 प्रति प्रिंट" : "High margin CVs"}
              </span>
            </div>

            {/* Resume Template Cards Preview */}
            <div className="p-4 bg-white rounded-2xl border border-black/10 space-y-3">
              <div className="text-[11px] font-bold text-black/50">
                {lang === "hi" ? "लोकप्रिय टेम्पलेट्स चुनिए:" : "Select Resume Format:"}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 1, name: "Modern Fresher", color: "border-emerald-400 bg-emerald-50/30" },
                  { id: 2, name: "Job Biodata", color: "border-blue-400 bg-blue-50/30" },
                  { id: 3, name: "Driver / Security", color: "border-purple-400 bg-purple-50/30" },
                ].map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => setResumeTemplate(tmpl.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      resumeTemplate === tmpl.id
                        ? "border-[#20C878] ring-2 ring-[#20C878]/30 shadow-sm"
                        : "border-black/10 hover:border-black/20"
                    } ${tmpl.color}`}
                  >
                    <div className="w-full h-12 bg-white rounded border border-black/5 p-1 flex flex-col justify-between mb-1.5 shadow-xs">
                      <div className="w-1/2 h-1 bg-black/30 rounded"></div>
                      <div className="space-y-0.5">
                        <div className="w-full h-0.5 bg-black/15 rounded"></div>
                        <div className="w-3/4 h-0.5 bg-black/15 rounded"></div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#121018] block truncate">{tmpl.name}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-black/60 font-medium">
                <span className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-[#20C878]" />
                  <span>{lang === "hi" ? "हिंदी और इंग्लिश दोनों सपोर्ट" : "Hindi & English Support"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-[#20C878]" />
                  <span>{lang === "hi" ? "PDF डाउनलोड + डायरेक्ट प्रिंट" : "PDF + Direct Print"}</span>
                </span>
              </div>
            </div>

            <p className="text-xs text-black/60 leading-relaxed">
              {lang === "hi"
                ? "दुकानदार को वर्ड फाइल में टाइप करने की कोई ज़रूरत नहीं। ग्राहक अपने फोन पर 2 मिनट में नाम, योग्यता और काम भरकर डायरेक्ट प्रिंट निकाल लेता है।"
                : "Stop typing biodatas manually in MS Word. Customers fill form fields in 2 minutes on mobile and send it straight to print."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
