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
  PerspectiveCorners,
  STANDARD_PHYSICAL_SIZES_MM
} from '@s2p/shared';
import { ImageEnhancementEngine } from '@/lib/image-processing/image-enhancement-engine';
import { DocumentCornerDetector } from '@/lib/image-processing/document-corner-detector';
import { CornerOverlay } from './CornerOverlay';

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
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<'AUTO' | 'CROP' | 'ENHANCE' | 'TUNE'>('AUTO');

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
    perspectiveCorners: {
      tl: { x: 4, y: 4 },
      tr: { x: 96, y: 4 },
      br: { x: 96, y: 96 },
      bl: { x: 4, y: 96 }
    },
    passportGuide: false
  });

  const [history, setHistory] = useState<ImageProcessingSettings[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const [qualityReport, setQualityReport] = useState<PrintQualityReport | null>(null);
  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [isConfidentCorners, setIsConfidentCorners] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        setIsProcessing(true);
        const img = await ImageEnhancementEngine.loadImage(imageUrl);
        if (!isMounted) return;

        imageObjRef.current = img;

        const detected = ImageDetectionEngine.detectImageMode(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          { filename: originalFilename }
        );
        setDetectionResult(detected);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.naturalWidth || img.width;
        tempCanvas.height = img.naturalHeight || img.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) tempCtx.drawImage(img, 0, 0);

        const cornerDetection = DocumentCornerDetector.detect(tempCanvas);
        setIsConfidentCorners(cornerDetection.isConfident);

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
          perspectiveCorners: cornerDetection.corners,
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
            straightenAngle: 0,
            perspectiveCorners: undefined
          }
        : settings;

      const processed = await ImageEnhancementEngine.processImage(img, effectiveSettings);

      canvas.width = processed.width;
      canvas.height = processed.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(processed, 0, 0);

        if (settings.passportGuide && !showOriginal) {
          drawPassportGuidelines(ctx, canvas.width, canvas.height);
        }
      }

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

  const drawPassportGuidelines = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = Math.max(2, Math.round(w / 300));
    ctx.setLineDash([6, 6]);

    const centerX = w / 2;
    const centerY = h * 0.45;
    const radiusX = w * 0.28;
    const radiusY = h * 0.35;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = '#0284C7';
    ctx.beginPath();
    ctx.moveTo(centerX - radiusX * 1.2, h * 0.42);
    ctx.lineTo(centerX + radiusX * 1.2, h * 0.42);
    ctx.stroke();

    ctx.strokeStyle = '#94A3B8';
    ctx.beginPath();
    ctx.moveTo(centerX, h * 0.08);
    ctx.lineTo(centerX, h * 0.92);
    ctx.stroke();

    ctx.restore();
  };

  const handleAutoDetectCorners = () => {
    const img = imageObjRef.current;
    if (!img) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.naturalWidth || img.width;
    tempCanvas.height = img.naturalHeight || img.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);

    const result = DocumentCornerDetector.detect(tempCanvas);
    setIsConfidentCorners(result.isConfident);

    updateSettingsWithHistory({
      ...settings,
      perspectiveCorners: result.corners
    });
  };

  const handleResetCorners = () => {
    setIsConfidentCorners(false);
    updateSettingsWithHistory({
      ...settings,
      perspectiveCorners: {
        tl: { x: 0, y: 0 },
        tr: { x: 100, y: 0 },
        br: { x: 100, y: 100 },
        bl: { x: 0, y: 100 }
      }
    });
  };

  const handleCornersChange = (newCorners: PerspectiveCorners) => {
    setSettings(prev => ({
      ...prev,
      perspectiveCorners: newCorners
    }));
  };

  const handleAutoEnhance = () => {
    const isDoc = settings.mode === 'DOCUMENT' || detectionResult?.suggestedMode === 'DOCUMENT';
    const autoSettings: ImageProcessingSettings = {
      ...settings,
      documentEnhanceMode: isDoc ? 'COLOR_ENHANCED' : 'ORIGINAL',
      brightness: isDoc ? 8 : 4,
      contrast: isDoc ? 12 : 8,
      shadowReduction: isDoc ? 40 : 15,
      sharpen: isDoc ? 25 : 15,
      straightenAngle: 0
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
      perspectiveCorners: {
        tl: { x: 0, y: 0 },
        tr: { x: 100, y: 0 },
        br: { x: 100, y: 100 },
        bl: { x: 0, y: 100 }
      },
      passportGuide: settings.mode === 'PORTRAIT'
    };
    updateSettingsWithHistory(defaultSettings);
  };

  const handleSaveDerivative = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsSaving(true);
      const blob = await ImageEnhancementEngine.canvasToBlob(canvas, 0.92);
      await onSaveDerivative(blob, {
        settings,
        qualityReport,
        editedAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      console.error('Failed to save derivative artifact:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-between animate-fadeIn select-none">
      {/* TOP HEADER */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title="Close editor without saving"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#111827]">
                Document & Photo Enhancement Studio
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Local In-Browser
              </span>
            </div>
            <div className="text-[11px] text-[#475569] truncate max-w-[280px] sm:max-w-md">
              {originalFilename}
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {/* Comparison Hold Button */}
          <button
            type="button"
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            onTouchStart={() => setShowOriginal(true)}
            onTouchEnd={() => setShowOriginal(false)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition select-none cursor-pointer ${
              showOriginal
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {showOriginal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden sm:inline">{showOriginal ? 'Showing Original' : 'Hold for Original'}</span>
          </button>

          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
            <button
              type="button"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              title="Undo"
              className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 hover:bg-slate-50 cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              title="Redo"
              className="p-1.5 text-slate-600 hover:text-slate-900 disabled:opacity-30 hover:bg-slate-50 cursor-pointer border-l border-slate-200"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Save Button */}
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDerivative}
            className={`px-4 py-1.5 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50 ${
              saveSuccess ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{saveSuccess ? 'Saved' : 'Apply & Save'}</span>
          </button>
        </div>
      </div>

      {/* CENTER VIEWPORT WITH CORNER OVERLAY */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div
          ref={containerRef}
          className="relative max-h-[62vh] max-w-full inline-block shadow-md rounded-xl overflow-hidden border border-[#CBD5E1] bg-white touch-none"
        >
          <canvas
            ref={canvasRef}
            className="max-h-[62vh] max-w-full object-contain block"
          />

          {/* DRAGGABLE CORNER HANDLES OVERLAY (Shown in CROP tab) */}
          {activeTab === 'CROP' && !showOriginal && settings.perspectiveCorners && (
            <CornerOverlay
              corners={settings.perspectiveCorners}
              onChange={handleCornersChange}
              containerRef={containerRef}
            />
          )}
        </div>

        {/* Quality HUD Badge */}
        {qualityReport && (
          <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 z-10">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#CBD5E1] text-xs shadow-xs">
              <div className={`w-2 h-2 rounded-full ${
                qualityReport.level === 'EXCELLENT' ? 'bg-emerald-500' :
                qualityReport.level === 'GOOD' ? 'bg-sky-500' :
                qualityReport.level === 'FAIR' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="font-bold font-mono text-[#111827]">
                {qualityReport.effectiveDpi} DPI
              </span>
              <span className="text-[#475569] text-[11px]">
                ({qualityReport.level})
              </span>
              <span className="text-slate-400 text-[10px] hidden sm:inline">
                • {qualityReport.widthPx} × {qualityReport.heightPx} px
              </span>
            </div>

            {qualityReport.warningMessage && (
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg text-[11px] max-w-sm">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>{qualityReport.warningMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Original Preservation Notice */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[11px] text-[#475569] border border-[#CBD5E1] flex items-center gap-1.5 shadow-2xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Original preserved untouched • Local browser enhancement</span>
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
              className="px-3 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Revert to Original
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS & TABS */}
      <div className="border-t border-[#E2E8F0] bg-white p-4 space-y-3 shrink-0 shadow-lg">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-around border-b border-[#E2E8F0] pb-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('AUTO')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer ${
              activeTab === 'AUTO' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-[#475569] hover:text-[#111827]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Auto & Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CROP')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer ${
              activeTab === 'CROP' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-[#475569] hover:text-[#111827]'
            }`}
          >
            <Crop className="w-4 h-4" />
            <span>Corner Crop & Rotate</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ENHANCE')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer ${
              activeTab === 'ENHANCE' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-[#475569] hover:text-[#111827]'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Document Filters</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TUNE')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer ${
              activeTab === 'TUNE' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-[#475569] hover:text-[#111827]'
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
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer text-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>1-Click Auto Enhance</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
              >
                Reset All
              </button>
            </div>

            {/* Mode Selection */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Editing Mode:
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
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                    settings.mode === 'DOCUMENT'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                      : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="truncate">Document</div>
                    <div className="text-[10px] text-slate-500 truncate font-normal">Flatten shadows</div>
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
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                    settings.mode === 'PORTRAIT'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                      : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="truncate">Passport Photo</div>
                    <div className="text-[10px] text-slate-500 truncate font-normal">Head alignment</div>
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
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                    settings.mode === 'ID_CARD'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                      : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="truncate">ID Card (CR80)</div>
                    <div className="text-[10px] text-slate-500 truncate font-normal">Standard bounds</div>
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
                  className={`p-2.5 rounded-xl border flex items-center gap-2 transition cursor-pointer ${
                    settings.mode === 'GENERAL_PHOTO'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                      : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="truncate">General Photo</div>
                    <div className="text-[10px] text-slate-500 truncate font-normal">Preserve colors</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CORNER CROP & PERSPECTIVE */}
        {activeTab === 'CROP' && (
          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSettingsWithHistory({
                    ...settings,
                    rotation: ((settings.rotation + 90) % 360) as 0 | 90 | 180 | 270
                  })}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#111827] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate 90° ({settings.rotation}°)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoDetectCorners}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Auto-Detect Corners</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetCorners}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Reset Corners
                </button>
              </div>

              {settings.mode === 'PORTRAIT' && (
                <label className="flex items-center gap-2 font-bold cursor-pointer text-[#111827]">
                  <input
                    type="checkbox"
                    checked={!!settings.passportGuide}
                    onChange={(e) => updateSettingsWithHistory({
                      ...settings,
                      passportGuide: e.target.checked
                    })}
                    className="accent-emerald-600"
                  />
                  <span>Show Passport Head Oval</span>
                </label>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {!isConfidentCorners
                    ? 'Adjust the corners manually by dragging the 4 green pins to align with your paper boundary.'
                    : 'Drag the 4 corner pins to adjust the document boundary. Perspective correction applies automatically on save.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DOCUMENT FILTERS */}
        {activeTab === 'ENHANCE' && (
          <div className="space-y-3 text-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Document Enhancement Filter:
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => updateSettingsWithHistory({
                  ...settings,
                  documentEnhanceMode: 'ORIGINAL'
                })}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  settings.documentEnhanceMode === 'ORIGINAL'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                }`}
              >
                <div>Original (No Filter)</div>
                <div className="text-[10px] text-slate-500 font-normal">Untouched photo</div>
              </button>

              <button
                type="button"
                onClick={() => updateSettingsWithHistory({
                  ...settings,
                  documentEnhanceMode: 'COLOR_ENHANCED'
                })}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  settings.documentEnhanceMode === 'COLOR_ENHANCED'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                }`}
              >
                <div>Color Enhanced</div>
                <div className="text-[10px] text-slate-500 font-normal">Stamps & signatures intact</div>
              </button>

              <button
                type="button"
                onClick={() => updateSettingsWithHistory({
                  ...settings,
                  documentEnhanceMode: 'GRAYSCALE'
                })}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  settings.documentEnhanceMode === 'GRAYSCALE'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                }`}
              >
                <div>Clean Grayscale</div>
                <div className="text-[10px] text-slate-500 font-normal">Smooth B&W tones</div>
              </button>

              <button
                type="button"
                onClick={() => updateSettingsWithHistory({
                  ...settings,
                  documentEnhanceMode: 'HIGH_CONTRAST'
                })}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  settings.documentEnhanceMode === 'HIGH_CONTRAST'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                }`}
              >
                <div>High Contrast B&W</div>
                <div className="text-[10px] text-slate-500 font-normal">Crisp text & receipts</div>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: FINE TUNE */}
        {activeTab === 'TUNE' && (
          <div className="space-y-3 text-xs">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-slate-700 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Brightness</span>
                  </span>
                  <span className="font-mono text-emerald-700">{settings.brightness}</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={2}
                  value={settings.brightness || 0}
                  onChange={(e) => setSettings({ ...settings, brightness: Number(e.target.value) })}
                  onMouseUp={() => updateSettingsWithHistory(settings)}
                  onTouchEnd={() => updateSettingsWithHistory(settings)}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-slate-700 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Contrast className="w-3.5 h-3.5 text-blue-500" />
                    <span>Contrast</span>
                  </span>
                  <span className="font-mono text-emerald-700">{settings.contrast}</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={2}
                  value={settings.contrast || 0}
                  onChange={(e) => setSettings({ ...settings, contrast: Number(e.target.value) })}
                  onMouseUp={() => updateSettingsWithHistory(settings)}
                  onTouchEnd={() => updateSettingsWithHistory(settings)}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => updateSettingsWithHistory({ ...settings, brightness: 0, contrast: 0 })}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                Reset Tuning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
