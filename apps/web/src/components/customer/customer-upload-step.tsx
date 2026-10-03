"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, FileText, CheckCircle2, Trash2, Shield, Camera, Image as ImageIcon } from "lucide-react";

interface CustomerUploadStepProps {
  shopId: string;
  upload: any;
  setUpload: (upl: any) => void;
  onPageCountDetected?: (pages: number) => void;
}

export function CustomerUploadStep({ shopId, upload, setUpload, onPageCountDetected }: CustomerUploadStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a PDF document or JPG/PNG image.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File exceeds maximum allowed size of 50 MB.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("shopId", shopId);

    // Simulate progress
    const progressTimer = setInterval(() => {
      setUploadProgress((p) => (p < 90 ? p + 25 : p));
    }, 150);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      clearInterval(progressTimer);
      setUploadProgress(100);

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Upload failed");
      } else {
        setUpload(data.upload);
        if (onPageCountDetected) onPageCountDetected(data.upload.pageCount);
      }
    } catch {
      clearInterval(progressTimer);
      setError("Network error while uploading. Please retry.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-black/70 flex items-center gap-1.5">
          <span>Step 1: Upload Document</span>
        </h3>
        <span className="text-xs text-[#20C878] font-bold">PDF, JPG, PNG</span>
      </div>

      {!upload ? (
        <div className="space-y-3">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-black/20 hover:border-[#20C878] bg-white rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all hover:bg-[#E8FAF1]/20 active:scale-[0.99] space-y-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
              accept=".pdf,image/png,image/jpeg,image/jpg"
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-[#E8FAF1] text-[#20C878] flex items-center justify-center mx-auto shadow-sm">
              <UploadCloud className="w-7 h-7" />
            </div>

            <div>
              <p className="font-extrabold text-base text-[#121018]">
                Tap to Select PDF or Photo
              </p>
              <p className="text-xs text-black/50 mt-1">
                Upload from Files, WhatsApp downloads, or Camera
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-black/5 text-black/70">
                <FileText className="w-3 h-3" /> PDF
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-black/5 text-black/70">
                <ImageIcon className="w-3 h-3" /> Images
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-black/5 text-black/70">
                <Camera className="w-3 h-3" /> Cam Scan
              </span>
            </div>
          </div>

          {/* Uploading progress indicator */}
          {isUploading && (
            <div className="p-4 bg-white rounded-xl border border-black/10 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Uploading & scanning file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#20C878] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-200">
              {error}
            </div>
          )}
        </div>
      ) : (
        /* Uploaded File Summary Card */
        <div className="bg-white rounded-2xl p-4 border-2 border-[#20C878]/40 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-[#E8FAF1] text-[#20C878] flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm text-[#121018] truncate max-w-[200px] sm:max-w-[280px]">
                {upload.filename}
              </p>
              <div className="flex items-center gap-2 text-xs text-black/60 mt-0.5 font-medium">
                <span className="font-bold text-[#18AA64]">
                  {upload.pageCount} {upload.pageCount === 1 ? "page" : "pages"} detected
                </span>
                <span>•</span>
                <span>{(upload.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setUpload(null)}
            className="p-2 text-black/40 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Replace document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="flex items-center gap-2 text-[11px] text-black/50 bg-white/60 p-2.5 rounded-xl border border-black/5">
        <Shield className="w-3.5 h-3.5 text-[#20C878] shrink-0" />
        <span>Your document is encrypted and will be automatically shredded after printing.</span>
      </div>
    </div>
  );
}
