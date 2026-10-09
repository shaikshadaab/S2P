"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Crop,
  RotateCw,
  Sun,
  Contrast,
  Check,
  X,
  RefreshCw,
  Maximize2,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Info,
  UserCheck,
  FileText,
  CreditCard,
  Image as ImageIcon
} from 'lucide-react';
import {
  ImageEditingMode,
  DocumentEnhanceMode,
  ImageProcessingSettings,
  PrintQualityReport,
  ImageQualityAssessor,
  ImageDetectionEngine,
  STANDARD_PHYSICAL_SIZES_MM
} from '@s2p/shared';
import { ImageEnhancementEngine } from '@/lib/image-processing/image-enhancement-engine';

export interface EnhancedImageEditorProps {
  imageUrl: string;
  fileId: string;
  originalFilename: string;
  initialMode?: ImageEditingMode;
  targetPaperSize?: 'A4' | 'A3' | 'PASSPORT' | 'ID_CARD' | 'PHOTO_4X6';
  onSaveDerivative: (derivativeBlob: Blob, metadata: any) => Promise<void>;
  onRevertOriginal?: () => Promise<void>;
  hasExistingDerivative?: boolean;
  onClose: () => void;
}

export default function EnhancedImageEditor({
  imageUrl,
  fileId,
  originalFilename,
  initialMode,
  targetPaperSize = 'A4',
  onSaveDerivative,
  onRevertOriginal,
  hasExistingDerivative = false,
  onClose
}: EnhancedImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // Editor Tab State
  const [activeTab, setActiveTab] = useState<'AUTO' | 'CROP' | 'ENHANCE' | 'TUNE'>('AUTO');

  // Core Processing Settings
  const [settings, setSettings] = useState<ImageProcessingSettings>({
    mode: initialMode || 'DOCUMENT',
    documentEnhanceMode: 'COLOR_ENHANCED',
    brightness: 0,
    contrast: 0,
    shadowReduction: 30,
    sharpen: 20,
    straightenAngle: 0,
    rotation: 0,
    cropBox: { x: 0, y: 0, width: 100, height: 100 },
    passportGuide: false
  });

  // History for Undo / Redo
  const [history, setHistory] = useState<ImageProcessingSettings[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Comparison State
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Quality Report State
  const [qualityReport, setQualityReport] = useState<PrintQualityReport | null>(null);

  // Detection Suggestion
  const [detectionResult, setDetectionResult] = useState<any>(null);

  // Load Image and Initial Analysis
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        setIsProcessing(true);
        const img = await ImageEnhancementEngine.loadImage(imageUrl);
        if (!isMounted) return;

        imageObjRef.current = img;

        // Run Auto-Detection
        const detected = ImageDetectionEngine.detectImageMode(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          { filename: originalFilename }
        );
        setDetectionResult(detected);

        const chosenMode = initialMode || detected.suggestedMode;
        const initialSettings: ImageProcessingSettings = {
          mode: chosenMode,
          documentEnhanceMode: chosenMode === 'DOCUMENT' ? 'COLOR_ENHANCED' : 'ORIGINAL',
          brightness: 0,
          contrast: 0,
          shadowReduction: chosenMode === 'DOCUMENT' ? 35 : 0,
          sharpen: chosenMode === 'DOCUMENT' ? 25 : 10,
          straightenAngle: 0,
          rotation: 0,
          cropBox: { x: 0, y: 0, width: 100, height: 100 },
          passportGuide: chosenMode === 'PORTRAIT'
        };

        setSettings(initialSettings);
        setHistory([initialSettings]);
        setHistoryIndex(0);

        setIsProcessing(false);
      } catch (err) {
        console.error('Error loading image in editor:', err);
        setIsProcessing(false);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, [imageUrl, originalFilename, initialMode]);

  // Push new settings to history
  const updateSettingsWithHistory = (newSettings: ImageProcessingSettings) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newSettings);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setSettings(newSettings);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setSettings(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setSettings(next);
    }
  };

  // Re-render Preview & Update Quality Metrics
  const renderPreview = useCallback(async () => {
    const img = imageObjRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    try {
      const effectiveSettings: ImageProcessingSettings = showOriginal
        ? {
            ...settings,
            documentEnhanceMode: 'ORIGINAL',
            brightness: 0,
            contrast: 0,
            shadowReduction: 0,
            sharpen: 0,
            straightenAngle: 0
          }
        : settings;

      const processed = await ImageEnhancementEngine.processImage(img, effectiveSettings);

      // Copy processed to visible canvas
      canvas.width = processed.width;
      canvas.height = processed.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(processed, 0, 0);

        // Draw Passport Guideline Overlay if active
        if (settings.passportGuide && !showOriginal) {
          drawPassportGuidelines(ctx, canvas.width, canvas.height);
        }
      }

      // Compute Print Quality Report
      let targetMm: { width: number; height: number } = { ...STANDARD_PHYSICAL_SIZES_MM.A4 };
      if (settings.mode === 'PORTRAIT' || targetPaperSize === 'PASSPORT') {
        targetMm = STANDARD_PHYSICAL_SIZES_MM.PASSPORT_IN;
      } else if (settings.mode === 'ID_CARD' || targetPaperSize === 'ID_CARD') {
        targetMm = STANDARD_PHYSICAL_SIZES_MM.ID_CR80;
      } else if (targetPaperSize === 'PHOTO_4X6') {
        targetMm = STANDARD_PHYSICAL_SIZES_MM.PHOTO_4X6;
      }

      const report = ImageQualityAssessor.assessPrintQuality(
        canvas.width,
        canvas.height,
        targetMm.width,
        targetMm.height
      );
      setQualityReport(report);
    } catch (e) {
      console.error('Preview render failed:', e);
    }
  }, [settings, showOriginal, targetPaperSize]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // Draws official passport head & eye alignment guidelines
  const drawPassportGuidelines = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = Math.max(2, Math.round(w / 300));
    ctx.setLineDash([6, 6]);

    // Head Oval (70-80% height)
    const centerX = w / 2;
    const centerY = h * 0.45;
    const radiusX = w * 0.28;
    const radiusY = h * 0.35;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();

    // Eye level guideline (at ~58% from bottom / 42% from top)
    ctx.strokeStyle = '#38BDF8';
    ctx.beginPath();
    ctx.moveTo(centerX - radiusX * 1.2, h * 0.42);
    ctx.lineTo(centerX + radiusX * 1.2, h * 0.42);
    ctx.stroke();

    // Center vertical alignment
    ctx.strokeStyle = '#94A3B8';
    ctx.beginPath();
    ctx.moveTo(centerX, h * 0.08);
    ctx.lineTo(centerX, h * 0.92);
    ctx.stroke();

    ctx.restore();
  };

  // One-Click Auto-Enhance Button Handler
  const handleAutoEnhance = () => {
    const isDoc = settings.mode === 'DOCUMENT' || detectionResult?.suggestedMode === 'DOCUMENT';
    const autoSettings: ImageProcessingSettings = {
      ...settings,
      documentEnhanceMode: isDoc ? 'COLOR_ENHANCED' : 'ORIGINAL',
      brightness: isDoc ? 8 : 4,
      contrast: isDoc ? 12 : 8,
      shadowReduction: isDoc ? 40 : 15,
      sharpen: isDoc ? 25 : 15,
      straightenAngle: 0,
      cropBox: { x: 3, y: 3, width: 94, height: 94 }
    };
    updateSettingsWithHistory(autoSettings);
  };

  const handleReset = () => {
    const defaultSettings: ImageProcessingSettings = {
      mode: settings.mode,
      documentEnhanceMode: 'ORIGINAL',
      brightness: 0,
      contrast: 0,
      shadowReduction: 0,
      sharpen: 0,
      straightenAngle: 0,
      rotation: 0,
      cropBox: { x: 0, y: 0, width: 100, height: 100 },
      passportGuide: settings.mode === 'PORTRAIT'
    };
    updateSettingsWithHistory(defaultSettings);
  };

  // Save Derivative Artifact to Backend
  const handleSaveDerivative = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      const blob = await ImageEnhancementEngine.canvasToBlob(canvas);
      await onSaveDerivative(blob, settings);
      setIsSaving(false);
      onClose();
    } catch (err) {
      console.error('Failed to save derivative:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col text-slate-100 font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate max-w-[220px]">
              {originalFilename}
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-2">
              <span>Mode: <strong className="text-emerald-400">{settings.mode}</strong></span>
              {hasExistingDerivative && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px]">
                  Enhanced Version Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TOP CONTROLS & SAVE */}
        <div className="flex items-center gap-2">
          {/* Compare Toggle */}
          <button
            type="button"
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition select-none cursor-pointer ${
              showOriginal
                ? 'bg-amber-500 text-black border-amber-400'
                : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            {showOriginal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showOriginal ? 'Holding Original' : 'Hold to View Original'}</span>
          </button>

          {/* Undo / Redo */}
          <button
            type="button"
            disabled={historyIndex <= 0}
            onClick={handleUndo}
            title="Undo"
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={historyIndex >= history.length - 1}
            onClick={handleRedo}
            title="Redo"
            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Save Button */}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDerivative}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Save Enhanced</span>
          </button>
        </div>
      </div>

      {/* CENTER VIEWPORT */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-zinc-900 select-none">
        <canvas
          ref={canvasRef}
          className="max-h-[62vh] max-w-full object-contain rounded-lg shadow-2xl border border-zinc-700 bg-white"
        />

        {/* Quality HUD Badge */}
        {qualityReport && (
          <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 z-10">
            <div className="flex items-center gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-700 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                qualityReport.level === 'EXCELLENT' ? 'bg-emerald-400' :
                qualityReport.level === 'GOOD' ? 'bg-sky-400' :
                qualityReport.level === 'FAIR' ? 'bg-amber-400' : 'bg-red-400'
              }`} />
              <span className="font-bold font-mono text-white">
                {qualityReport.effectiveDpi} DPI
              </span>
              <span className="text-zinc-400 text-[11px]">
                ({qualityReport.level})
              </span>
              <span className="text-zinc-500 text-[10px] hidden sm:inline">
                &bull; {qualityReport.widthPx} &times; {qualityReport.heightPx} px
              </span>
            </div>

            {qualityReport.warningMessage && (
              <div className="flex items-center gap-1.5 bg-amber-950/90 text-amber-300 border border-amber-800/80 px-2.5 py-1 rounded-lg text-[11px] max-w-sm">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>{qualityReport.warningMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Original Untouched Notice */}
        <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] text-zinc-300 font-mono border border-zinc-800 flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>Original file preserved untouched</span>
        </div>

        {/* Revert to Original Action */}
        {hasExistingDerivative && onRevertOriginal && (
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={async () => {
                await onRevertOriginal();
                onClose();
              }}
              className="px-3 py-1 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Revert to Original
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS & TABS */}
      <div className="border-t border-zinc-800 bg-zinc-950 p-4 space-y-3 shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-around border-b border-zinc-800 pb-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('AUTO')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer ${
              activeTab === 'AUTO' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Auto &amp; Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CROP')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer ${
              activeTab === 'CROP' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Crop className="w-4 h-4" />
            <span>Crop &amp; Guidelines</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ENHANCE')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer ${
              activeTab === 'ENHANCE' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Document Filter</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TUNE')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer ${
              activeTab === 'TUNE' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Fine Tune</span>
          </button>
        </div>

        {/* TAB 1: AUTO ENHANCE & MODE SUGGESTIONS */}
        {activeTab === 'AUTO' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAutoEnhance}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold flex items-center justify-center gap-2 shadow-md transition cursor-pointer text-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>1-Click Auto Enhance</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition cursor-pointer"
              >
                Reset All
              </button>
            </div>

            {/* Mode Suggestions */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Suggested Editing Mode (Click to switch):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => updateSettingsWithHistory({
                    ...settings,
                    mode: 'DOCUMENT',
                    documentEnhanceMode: 'COLOR_ENHANCED',
                    passportGuide: false
                  })}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                    settings.mode === 'DOCUMENT'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="font-bold truncate">Document</div>
                    <div className="text-[10px] text-zinc-500 truncate">Flatten shadows</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateSettingsWithHistory({
                    ...settings,
                    mode: 'PORTRAIT',
                    documentEnhanceMode: 'ORIGINAL',
                    passportGuide: true
                  })}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                    settings.mode === 'PORTRAIT'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="font-bold truncate">Portrait / Passport</div>
                    <div className="text-[10px] text-zinc-500 truncate">Head alignment</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateSettingsWithHistory({
                    ...settings,
                    mode: 'ID_CARD',
                    documentEnhanceMode: 'COLOR_ENHANCED',
                    passportGuide: false
                  })}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                    settings.mode === 'ID_CARD'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                  }`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="font-bold truncate">ID Card</div>
                    <div className="text-[10px] text-zinc-500 truncate">CR80 Boundary</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateSettingsWithHistory({
                    ...settings,
                    mode: 'GENERAL_PHOTO',
                    documentEnhanceMode: 'ORIGINAL',
                    passportGuide: false
                  })}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                    settings.mode === 'GENERAL_PHOTO'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="font-bold truncate">General Photo</div>
                    <div className="text-[10px] text-zinc-500 truncate">Preserve colors</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CROP & GUIDELINES */}
        {activeTab === 'CROP' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSettingsWithHistory({
                    ...settings,
                    rotation: ((settings.rotation + 90) % 360) as 0 | 90 | 180 | 270
                  })}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90&deg; ({settings.rotation}&deg;)</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateSettingsWithHistory({
                    ...settings,
                    cropBox: { x: 4, y: 4, width: 92, height: 92 }
                  })}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Auto-Detect Bounds</span>
                </button>
              </div>

              {/* Passport Guide Toggle */}
              <label className="flex items-center gap-2 font-bold cursor-pointer text-zinc-300">
                <input
                  type="checkbox"
                  checked={!!settings.passportGuide}
                  onChange={(e) => updateSettingsWithHistory({
                    ...settings,
                    passportGuide: e.target.checked
                  })}
                  className="accent-emerald-500"
                />
                <span>Passport Oval Guides</span>
              </label>
            </div>

            {/* Straighten / Deskew Angle */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Deskew / Straighten Angle</span>
                <span className="font-mono font-bold text-emerald-400">{settings.straightenAngle}&deg;</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                value={settings.straightenAngle}
                onChange={(e) => updateSettingsWithHistory({
                  ...settings,
                  straightenAngle: Number(e.target.value)
                })}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        )}

        {/* TAB 3: DOCUMENT FILTERS */}
        {activeTab === 'ENHANCE' && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => updateSettingsWithHistory({
                  ...settings,
                  documentEnhanceMode: 'COLOR_ENHANCED',
                  shadowReduction: 35
                })}
                className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                  settings.documentEnhanceMode === 'COLOR_ENHANCED'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                }`}
              >
                <div>Clean Color</div>
                <div className="text-[10px] text-zinc-500 font-normal">Stamps &amp; signatures intact</div>
              </button>

              <button
                type="button"
                onClick={() => updateSettingsWithHistory({
                  ...settings,
                  documentEnhanceMode: 'GRAYSCALE',
                  shadowReduction: 30
                })}
                className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                  settings.documentEnhanceMode === 'GRAYSCALE'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                }`}
              >
                <div>Grayscale</div>
                <div className="text-[10px] text-zinc-500 font-normal">Smooth ink tone</div>
              </button>

              <button
                type="button"
                onClick={() => updateSettingsWithHistory({
                  ...settings,
                  documentEnhanceMode: 'HIGH_CONTRAST',
                  shadowReduction: 50
                })}
                className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                  settings.documentEnhanceMode === 'HIGH_CONTRAST'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                }`}
              >
                <div>High Contrast B&amp;W</div>
                <div className="text-[10px] text-zinc-500 font-normal">Crisp text &amp; receipts</div>
              </button>

              <button
                type="button"
                onClick={() => updateSettingsWithHistory({
                  ...settings,
                  documentEnhanceMode: 'ORIGINAL',
                  shadowReduction: 0
                })}
                className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                  settings.documentEnhanceMode === 'ORIGINAL'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
                }`}
              >
                <div>Original Colors</div>
                <div className="text-[10px] text-zinc-500 font-normal">No filter applied</div>
              </button>
            </div>

            {/* Shadow Reduction Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Shadow Reduction &amp; Background Whitening</span>
                <span className="font-mono font-bold text-emerald-400">{settings.shadowReduction}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.shadowReduction}
                onChange={(e) => updateSettingsWithHistory({
                  ...settings,
                  shadowReduction: Number(e.target.value)
                })}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        )}

        {/* TAB 4: FINE TUNE */}
        {activeTab === 'TUNE' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Brightness</span>
                <span className="font-mono font-bold text-zinc-200">{settings.brightness}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={settings.brightness}
                onChange={(e) => updateSettingsWithHistory({
                  ...settings,
                  brightness: Number(e.target.value)
                })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Contrast</span>
                <span className="font-mono font-bold text-zinc-200">{settings.contrast}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={settings.contrast}
                onChange={(e) => updateSettingsWithHistory({
                  ...settings,
                  contrast: Number(e.target.value)
                })}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Text Edge Sharpen</span>
                <span className="font-mono font-bold text-zinc-200">{settings.sharpen}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={settings.sharpen}
                onChange={(e) => updateSettingsWithHistory({
                  ...settings,
                  sharpen: Number(e.target.value)
                })}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
