"use client";

import React from "react";
import { Store, HeartHandshake, ShieldCheck, Award, MessageCircle, ArrowRight } from "lucide-react";
import { Language } from "./navbar";

interface LandingStoryProps {
  lang: Language;
}

export function LandingStory({ lang }: LandingStoryProps) {
  return (
    <section className="py-20 bg-[#FAFAF8] border-b border-black/5 relative overflow-hidden" id="about">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3 shadow-sm">
            <Store className="w-3.5 h-3.5 text-[#20C878]" />
            <span>{lang === "hi" ? "दुकानदार की सच्ची कहानी" : "The Origin Story"}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-[#121018] tracking-tight">
            {lang === "hi" ? "🏪 ये कहां से शुरू हुआ?" : "How Did Vintha Print Start?"}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-black/60">
            {lang === "hi"
              ? "ये किसी बड़े कॉर्पोरेट ऑफिस में नहीं, बल्कि एक असली साइबर कैफ़े और फोटोकॉपी की दुकान की रोज़ की परेशानी से बना है।"
              : "Built not in an AC boardroom, but from the everyday rush of a real Indian cyber cafe and Xerox counter."}
          </p>
        </div>

        {/* Story Timeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-sm space-y-3 relative">
            <span className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center font-bold text-xs font-mono text-[#121018]">
              01
            </span>
            <h3 className="font-extrabold text-base text-[#121018]">
              {lang === "hi" ? "रोज़ का वही झंझट और वायरस" : "The Daily USB & WhatsApp Grind"}
            </h3>
            <p className="text-xs text-black/65 leading-relaxed">
              {lang === "hi"
                ? "दुकान पर रोज़ दर्जनों लोग आते थे — पेनड्राइव लगाते ही कंप्यूटर हैंग, व्हाट्सएप पर फाइल्स का अंबार, 'भैया 2 मिनट रुको' कहते-कहते ग्राहक परेशान हो जाते थे।"
                : "Dozens of customers queuing up. Corrupt pen drives slowing down the counter PC, WhatsApp chats clogged, and precious time lost clicking dialogs."}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#20C878]/40 ring-1 ring-[#20C878]/30 shadow-md space-y-3 relative">
            <span className="w-8 h-8 rounded-full bg-[#20C878] text-white flex items-center justify-center font-bold text-xs font-mono shadow-xs">
              02
            </span>
            <h3 className="font-extrabold text-base text-[#121018]">
              {lang === "hi" ? "पहले सिर्फ अपनी दुकान के लिए बनाया" : "Built First for Our Own Counter"}
            </h3>
            <p className="text-xs text-black/65 leading-relaxed">
              {lang === "hi"
                ? "बेचने के लिए नहीं, बल्कि अपनी दुकान का काम आसान करने के लिए यह सिस्टम बनाया। 6 महीने तक असली ग्राहकों के साथ चलाया, हर कमी को ठीक किया।"
                : "Created not as a commercial product, but to survive our own counter rush. Tested across 10,000+ real prints with actual walk-in customers."}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-black/10 shadow-sm space-y-3 relative">
            <span className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center font-bold text-xs font-mono text-[#121018]">
              03
            </span>
            <h3 className="font-extrabold text-base text-[#121018]">
              {lang === "hi" ? "अब भारत भर की दुकानों के लिए" : "Now for Every Print Shop in India"}
            </h3>
            <p className="text-xs text-black/65 leading-relaxed">
              {lang === "hi"
                ? "जब सिस्टम 100% भरोसेमंद और तेज़ हो गया, तब इसे सभी साइबर कैफे, CSC सेंटर और प्रिंट शॉप्स के लिए खोल दिया ताकि हर दुकानदार स्मार्ट बन सके।"
                : "Once the system became rock-solid, we packaged it so any stationery shop, CSC center, or Xerox counter in India can automate their prints."}
            </p>
          </div>
        </div>

        {/* Personal Support Box */}
        <div className="mt-10 p-6 sm:p-8 rounded-3xl bg-[#121018] text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="w-3 h-3 rounded-full bg-[#20C878] animate-ping" />
              <span className="text-xs font-bold font-mono text-[#20C878]">
                {lang === "hi" ? "सीधा WhatsApp व AnyDesk सपोर्ट" : "Direct WhatsApp & AnyDesk Support"}
              </span>
            </div>
            <h4 className="text-lg sm:text-xl font-extrabold font-heading">
              {lang === "hi" ? "कोई भी दिक्कत आए — हम खुद सेटअप करा कर देंगे" : "Setup Stuck? We Help You Over AnyDesk"}
            </h4>
            <p className="text-xs text-white/60 max-w-xl">
              {lang === "hi"
                ? "प्रिंटर कनेक्ट करने में कोई परेशानी हो तो हमारी टीम WhatsApp या AnyDesk पर सीधा आपके कंप्यूटर पर सॉफ्टवेयर सेट करके देती है।"
                : "Printer driver or network issue? Our dedicated engineers connect over AnyDesk and get your shop printing in one sitting."}
            </p>
          </div>

          <a
            href="https://wa.me/919581529381?text=Hello%20Vintha%20Print%20Setup%20Assistance"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3.5 rounded-2xl bg-[#20C878] hover:bg-[#18AA64] text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shrink-0 transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>{lang === "hi" ? "WhatsApp पर बात करें" : "Chat on WhatsApp"}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
