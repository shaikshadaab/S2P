"use client";

import React from "react";
import { XCircle, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Language } from "./navbar";

interface LandingComparisonProps {
  lang: Language;
}

export function LandingComparison({ lang }: LandingComparisonProps) {
  const problems = [
    lang === "hi"
      ? "ग्राहक WhatsApp पर फाइल भेजते हैं, जिससे आपका पर्सनल नंबर भर जाता है।"
      : "Customers flood your personal WhatsApp number with documents.",
    lang === "hi"
      ? "पेनड्राइव लगाने से दुकान के कंप्यूटर में शॉर्टकट वायरस आ जाता है।"
      : "Infected customer pen-drives inject malware into your shop PC.",
    lang === "hi"
      ? "हर फाइल को डाउनलोड करके प्रिंट डायलॉग खोलना पड़ता है।"
      : "You manually download each file, open preview, and configure prints.",
    lang === "hi"
      ? "काउंटर पर भीड़ लग जाती है और एक कस्टमर में 5-10 मिनट बर्बाद होते हैं।"
      : "Counter queues form as customers take 5-10 mins sending files.",
  ];

  const solutions = [
    lang === "hi"
      ? "ग्राहक काउंटर का QR स्कैन करता है — न नंबर शेयर करना, न चैट सेव करना।"
      : "Customer scans shop QR on counter — no phone number sharing needed.",
    lang === "hi"
      ? "डायरेक्ट क्लाउड अपलोड — पेनड्राइव का झंझट हमेशा के लिए ख़त्म।"
      : "Direct secure browser upload — eliminates pen-drives and virus risk.",
    lang === "hi"
      ? "विंडोज़ एजेंट सीधे आपके चुने हुए प्रिंटर पर ऑटोमैटिक प्रिंट भेजता है।"
      : "Windows Agent automatically spools directly to your selected printer.",
    lang === "hi"
      ? "ग्राहक खुद कलर, साइज व कॉपियाँ चुनता है — प्रिंट 10 सेकंड में तैयार।"
      : "Customer picks copies & options — prints are ready in 10 seconds.",
  ];

  return (
    <section id="features" className="py-20 bg-[#FDFDFD]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#FF2D78] block mb-2">
            THE MODERN ADVANTAGE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E1035]">
            {lang === "hi" ? "पुराना तरीका बनाम नया Free QR प्रिंट सिस्टम" : "Old Manual Method vs. Free QR Print"}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-[#1E1035]/70">
            {lang === "hi"
              ? "दुकान का कीमती समय बचाएँ और ग्राहकों को तेज़, आधुनिक अनुभव दें।"
              : "Save hours of counter time every day while giving customers a seamless experience."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Old Way */}
          <div className="bg-white rounded-3xl p-7 border border-rose-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-50">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-rose-600">
                  {lang === "hi" ? "पुराना झंझट वाला तरीका" : "Old Manual Method"}
                </h3>
                <span className="text-xs text-rose-400 font-medium">
                  {lang === "hi" ? "समय की बर्बादी और वायरस का ख़तरा" : "Time-consuming & virus prone"}
                </span>
              </div>
            </div>

            <ul className="space-y-4">
              {problems.map((prob, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-[#1E1035]/75 leading-relaxed">{prob}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* New Free QR System */}
          <div className="bg-white rounded-3xl p-7 border border-emerald-100 shadow-md relative overflow-hidden ring-1 ring-emerald-500/10">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-50">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#1E1035]">
                  {lang === "hi" ? "नया Free QR प्रिंट सिस्टम" : "Free QR Print System"}
                </h3>
                <span className="text-xs text-emerald-600 font-bold">
                  {lang === "hi" ? "100% मुफ़्त, ऑटोमैटिक व सुरक्षित" : "100% Free, Automatic & Fast"}
                </span>
              </div>
            </div>

            <ul className="space-y-4">
              {solutions.map((sol, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-[#1E1035] font-semibold leading-relaxed">{sol}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
