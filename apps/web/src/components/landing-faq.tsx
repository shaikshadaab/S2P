"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Language } from "./navbar";

interface LandingFaqProps {
  lang: Language;
}

export function LandingFaq({ lang }: LandingFaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q:
        lang === "hi"
          ? "क्या यह सिस्टम सच में 100% मुफ़्त है?"
          : "Is this system truly 100% free?",
      a:
        lang === "hi"
          ? "हाँ! इसमें कोई सब्सक्रिप्शन, कोई छुपा हुआ शुल्क, कोई लिमिट या कोई पेमेंट गेटवे नहीं है। आप जितने चाहें उतने प्रिंट्स पूरी तरह मुफ़्त में निकाल सकते हैं।"
          : "Yes! There are no subscriptions, no paid plans, no billing, and no fees whatsoever. You can print unlimited jobs completely free.",
    },
    {
      q:
        lang === "hi"
          ? "मेरी दुकान में कौन-से प्रिंटर सपोर्टेड हैं?"
          : "Which printers are supported in my shop?",
      a:
        lang === "hi"
          ? "सभी विंडोज़ प्रिंटर सपोर्टेड हैं — HP (Smart Tank, LaserJet), Canon, Epson (EcoTank), Brother, TVS, इत्यादि। विंडोज़ एजेंट आपके कंप्यूटर के सभी प्रिंटर्स को खुद डिटेक्ट कर लेता है।"
          : "All Windows-installed printers are supported (HP, Canon, Epson, Brother, Ricoh, etc.). The Windows Print Agent automatically detects all local and network spoolers.",
    },
    {
      q:
        lang === "hi"
          ? "क्या मुझे वाई-फाई राउटर या पोर्ट सेटिंग्स बदलनी होंगी?"
          : "Do I need router port forwarding or public IP?",
      a:
        lang === "hi"
          ? "बिल्कुल नहीं! विंडोज़ एजेंट सीधे बाहर सर्वर से आउटवर्ड सिक्योर कनेक्शन बनाता है। राउटर या फ़ायरवॉल में कुछ भी बदलने की ज़रूरत नहीं है।"
          : "No router changes or port forwarding needed. The agent initiates an outward connection to the server over HTTPS/WSS.",
    },
    {
      q:
        lang === "hi"
          ? "क्या मैं प्रिंट निकलने से पहले ग्राहक की फाइल चेक कर सकता हूँ?"
          : "Can I approve jobs before they print?",
      a:
        lang === "hi"
          ? "हाँ! आप सेटिंग्स में जाकर 'Owner-Approval Mode' चालू कर सकते हैं। तब तक कोई शीट नहीं निकलेगी जब तक आप डैशबोर्ड पर 'Approve & Print' नहीं दबाते।"
          : "Yes! You can toggle 'Owner-Approval Mode' in Settings. Jobs will wait in 'Pending Approval' until you click Approve in the dashboard.",
    },
    {
      q:
        lang === "hi"
          ? "अगर प्रिंटर में पेपर फँस जाए तो क्या दोबारा प्रिंट कर सकते हैं?"
          : "Can failed jobs be retried without duplicate prints?",
      a:
        lang === "hi"
          ? "हाँ, अगर प्रिंट फेल हो जाता है तो डैशबोर्ड पर 'Retry Print' बटन आता है। सिस्टम में डुप्लीकेट-प्रोटेक्शन है जिससे एक ही फाइल दो बार गलती से नहीं छपती।"
          : "Yes! If a job fails, click 'Retry Print' from Orders. The built-in idempotency protection ensures already completed or printing jobs cannot be duplicated.",
    },
  ];

  return (
    <section id="faq" className="py-20 bg-white border-t border-black/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#FF2D78] block mb-2">
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1E1035]">
            {lang === "hi" ? "अक्सर पूछे जाने वाले सवाल" : "Got Questions? We Have Answers"}
          </h2>
        </div>

        <div className="space-y-3.5">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-[#FDFDFD] border border-black/5 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-extrabold text-[#1E1035] text-base hover:text-[#FF2D78] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-black/40 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[#FF2D78]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-[#1E1035]/75 leading-relaxed border-t border-black/5">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
