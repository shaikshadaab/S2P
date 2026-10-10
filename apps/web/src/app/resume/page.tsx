"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResumeEngine,
  ResumeData,
  ResumeTemplateId,
  PRIMARY_PILOT_SHOP
} from "@s2p/shared";
import {
  ArrowLeft,
  FileText,
  Printer,
  Sparkles,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  Download
} from "lucide-react";

const TEMPLATES: { id: ResumeTemplateId; name: string; tag: string }[] = [
  { id: "SIMPLE", name: "Simple Clean", tag: "Minimal single column" },
  { id: "PROFESSIONAL", name: "Professional Executive", tag: "Corporate top banner" },
  { id: "MODERN", name: "Modern Emerald", tag: "Shop branded emerald accents" },
  { id: "FRESHER", name: "Graduate / Fresher", tag: "Education & project focus" },
  { id: "TECHNICAL", name: "Technical Engineer", tag: "Skills & technical projects" },
  { id: "COMPACT", name: "Compact 1-Page", tag: "Tight single-sheet layout" },
];

export default function ResumeMakerPage() {
  const router = useRouter();
  const [template, setTemplate] = useState<ResumeTemplateId>("MODERN");
  const [fullName, setFullName] = useState("Shaik Rizwan");
  const [title, setTitle] = useState("Customer Service Specialist");
  const [email, setEmail] = useState("rizwan@example.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [location, setLocation] = useState("Guntur, Andhra Pradesh");
  const [summary, setSummary] = useState(
    "Dedicated and punctual professional seeking an opportunity to contribute strong communication, organizational, and digital printing skills at a reputed organization."
  );
  const [skillsStr, setSkillsStr] = useState("MS Office, Customer Communication, English & Telugu Typing, Billing & Cash Management, Problem Solving");

  const [education, setEducation] = useState([
    { institution: "Acharya Nagarjuna University, Guntur", degree: "Bachelor of Commerce", field: "Computers", year: "2024", grade: "First Class" }
  ]);

  const [experience, setExperience] = useState([
    { company: "Local Service Center, Guntur", role: "Documentation Assistant", period: "2024 - Present", description: "Assisting customers with online government forms, typing, documentation, and print job handling." }
  ]);

  const [projects, setProjects] = useState([
    { title: "Digital Store Management System", description: "Assisted in managing inventory and computerized billing at retail counter.", technologies: "Excel, POS" }
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerateAndAddToBasket = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const data: ResumeData = {
        template,
        fullName,
        title,
        email,
        phone,
        location,
        summary,
        skills: skillsStr.split(",").map((s) => s.trim()).filter(Boolean),
        education,
        experience,
        projects,
      };

      // 1. Generate Print-Ready PDF Bytes
      const pdfBytes = await ResumeEngine.generatePdf(data);
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const filename = `Resume_${fullName.replace(/\s+/g, "_")}.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });

      // 2. Ensure Draft Session
      const draftRes = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: PRIMARY_PILOT_SHOP.id }),
      });
      const draftData = await draftRes.json();
      if (!draftRes.ok || !draftData.draftId) {
        throw new Error(draftData.error || "Failed to initialize order draft session.");
      }

      // 3. Upload Generated Resume PDF to Draft Basket
      const formData = new FormData();
      formData.append("file", file);
      formData.append("shopId", PRIMARY_PILOT_SHOP.id);
      formData.append("draftId", draftData.draftId);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Failed to upload generated resume PDF.");
      }

      // 4. Forward directly to customer checkout with resume ready to print
      router.push(`/s/${PRIMARY_PILOT_SHOP.slug}`);
    } catch (err) {
      console.error("[ResumeMaker] Error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to generate resume");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            <span>Shakeel Online Services Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              6 Resume Templates
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Professional Resume Maker</h1>
          <p className="text-sm text-slate-600">
            Fill your details, select a professional template, and click Print. Produces clean, searchable vector PDF matching genuine shop margins.
          </p>
        </div>

        {/* 1. Template Selector */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Select Template Format (6 Original Styles)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  template === t.id
                    ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className={`text-xs font-bold mb-1 ${template === t.id ? "text-emerald-700" : "text-slate-800"}`}>
                    {t.name}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    {t.tag}
                  </div>
                </div>
                {template === t.id && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-2" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Personal & Contact Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Personal & Contact Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title / Headline</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Address</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Summary / Objective</label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Skills (Comma-separated)</label>
              <input
                type="text"
                value={skillsStr}
                onChange={(e) => setSkillsStr(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* 3. Action Buttons */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-emerald-950 text-base">Ready to print your resume?</h3>
            <p className="text-xs text-emerald-800">
              Generates a searchable PDF and adds it directly to your print order.
            </p>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateAndAddToBasket}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Vector PDF...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Generate & Add to Print Order</span>
              </>
            )}
          </button>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-center text-xs text-slate-500">
        Shakeel Online Services • Guntur, Andhra Pradesh • SOS Print
      </footer>
    </div>
  );
}
