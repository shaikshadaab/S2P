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
  Image as ImageIcon,
  Eraser,
  Paintbrush,
  ZoomIn,
  FlipHorizontal,
  FlipVertical,
  ShieldCheck,
  Palette,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  ImageEditingMode,
  DocumentEnhanceMode,
  ImageProcessingSettings,
  PrintQualityReport,
  ImageQualityAssessor,
  ImageDetectionEngine,
  PerspectiveCorners,
  CropAspectRatioPreset,
  BackgroundRemovalMode,
  STANDARD_PHYSICAL_SIZES_MM
} from '@s2p/shared';
import { ImageEnhancementEngine } from '@/lib/image-processing/image-enhancement-engine';
import { DocumentCornerDetector } from '@/lib/image-processing/document-corner-detector';
import { CornerOverlay } from './CornerOverlay';
import { CropBoxOverlay, CropBox } from './CropBoxOverlay';

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
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active Editor Navigation Tab
  const [activeTab, setActiveTab] = useState<'CROP' | 'BACKGROUND' | 'ENHANCE' | 'TUNE'>('CROP');

  // Core Processing Settings State
  const [settings, setSettings] = useState<ImageProcessingSettings>({
    mode: initialMode || 'DOCUMENT',
    documentEnhanceMode: 'ORIGINAL',
    brightness: 0,
    contrast: 0,
    saturation: 0,
    shadowReduction: 0,
    sharpen: 15,
    denoise: 0,
    autoEnhanceStrength: 50,
    scanMode: false,
    upscale: false,
    straightenAngle: 0,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    zoom: 1,
    pan: { x: 0, y: 0 },
    cropAspectRatio: 'FREE',
    cropBox: { x: 0, y: 0, width: 100, height: 100 },
    perspectiveCorners: {
      tl: { x: 4, y: 4 },
      tr: { x: 96, y: 4 },
      br: { x: 96, y: 96 },
      bl: { x: 4, y: 96 }
    },
    perspectiveMode: false,
    passportGuide: false,
    backgroundMode: 'ORIGINAL',
    customBackgroundColor: '#ffffff',
    edgeRefinement: 2
  });

  // History Stack for Undo / Redo
  const [history, setHistory] = useState<ImageProcessingSettings[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Background Manual Brush State
  const [brushMode, setBrushMode] = useState<'ERASE' | 'RESTORE'>('ERASE');
  const [brushSize, setBrushSize] = useState<number>(24);
  const [isBrushing, setIsBrushing] = useState<boolean>(false);
  const [brushCursorPos, setBrushCursorPos] = useState<{ x: number; y: number } | null>(null);

  // UI Interactive States
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Quality & Detection State
  const [qualityReport, setQualityReport] = useState<PrintQualityReport | null>(null);
  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [isConfidentCorners, setIsConfidentCorners] = useState<boolean>(true);

  // Initialize Source Image on Mount
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
        const isDoc = chosenMode === 'DOCUMENT';

        const initialSettings: ImageProcessingSettings = {
          mode: chosenMode,
          documentEnhanceMode: isDoc ? 'COLOR_ENHANCED' : 'ORIGINAL',
          brightness: 0,
          contrast: 0,
          saturation: 0,
          shadowReduction: isDoc ? 35 : 0,
          sharpen: isDoc ? 25 : 10,
          denoise: 0,
          autoEnhanceStrength: 50,
          scanMode: isDoc,
          upscale: false,
          straightenAngle: 0,
          rotation: 0,
          flipHorizontal: false,
          flipVertical: false,
          zoom: 1,
          pan: { x: 0, y: 0 },
          cropAspectRatio: chosenMode === 'PORTRAIT' || targetPaperSize === 'PASSPORT' ? 'PASSPORT_35X45' : 'FREE',
          cropBox: { x: 0, y: 0, width: 100, height: 100 },
          perspectiveCorners: cornerDetection.corners,
          perspectiveMode: isDoc && cornerDetection.isConfident,
          passportGuide: chosenMode === 'PORTRAIT' || targetPaperSize === 'PASSPORT',
          backgroundMode: 'ORIGINAL',
          customBackgroundColor: '#ffffff',
          edgeRefinement: 2
        };

        // Initialize Mask Canvas
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = img.naturalWidth || img.width;
        maskCanvas.height = img.naturalHeight || img.height;
        maskCanvasRef.current = maskCanvas;

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
  }, [imageUrl, originalFilename, initialMode, targetPaperSize]);

  // Update Settings with History Tracking
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

  // Render Preview Pipeline
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
            saturation: 0,
            shadowReduction: 0,
            sharpen: 0,
            denoise: 0,
            straightenAngle: 0,
            rotation: 0,
            flipHorizontal: false,
            flipVertical: false,
            zoom: 1,
            pan: { x: 0, y: 0 },
            cropBox: { x: 0, y: 0, width: 100, height: 100 },
            perspectiveCorners: undefined,
            backgroundMode: 'ORIGINAL',
            upscale: false
          }
        : settings;

      const processed = await ImageEnhancementEngine.processImage(img, effectiveSettings, {
        maskCanvas: maskCanvasRef.current,
        maxDimension: 2560 // preview bound for instant UI response
      });

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

      // Calculate Target Physical Dimensions & Effective DPI
      let targetMm: { width: number; height: number } = { ...STANDARD_PHYSICAL_SIZES_MM.A4 };
      if (settings.mode === 'PORTRAIT' || targetPaperSize === 'PASSPORT' || settings.cropAspectRatio === 'PASSPORT_35X45') {
        targetMm = STANDARD_PHYSICAL_SIZES_MM.PASSPORT_IN;
      } else if (settings.cropAspectRatio === 'PASSPORT_2X2') {
        targetMm = STANDARD_PHYSICAL_SIZES_MM.PASSPORT_US;
      } else if (settings.mode === 'ID_CARD' || targetPaperSize === 'ID_CARD') {
        targetMm = STANDARD_PHYSICAL_SIZES_MM.ID_CR80;
      } else if (targetPaperSize === 'PHOTO_4X6' || settings.cropAspectRatio === '4:6') {
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

  // Passport Guideline Oval Overlay
  const drawPassportGuidelines = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.save();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = Math.max(2, Math.round(w / 320));
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

  // Manual Brush Event Handlers (for Background Erase / Restore)
  const handleBrushPointerDown = (e: React.PointerEvent) => {
    if (activeTab !== 'BACKGROUND') return;
    setIsBrushing(true);
    handleBrushDraw(e);
  };

  const handleBrushPointerMove = (e: React.PointerEvent) => {
    if (activeTab !== 'BACKGROUND') return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setBrushCursorPos({ x, y });

    if (isBrushing) {
      handleBrushDraw(e);
    }
  };

  const handleBrushPointerUp = () => {
    if (isBrushing) {
      setIsBrushing(false);
      renderPreview();
    }
  };

  const handleBrushDraw = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const mask = maskCanvasRef.current;
    if (!canvas || !mask) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = mask.width / rect.width;
    const scaleY = mask.height / rect.height;

    const maskX = (e.clientX - rect.left) * scaleX;
    const maskY = (e.clientY - rect.top) * scaleY;
    const radius = brushSize * Math.max(scaleX, scaleY);

    const mCtx = mask.getContext('2d');
    if (!mCtx) return;

    mCtx.save();
    mCtx.beginPath();
    mCtx.arc(maskX, maskY, radius, 0, Math.PI * 2);

    if (brushMode === 'ERASE') {
      // Erase mode marks red channel (force background removal)
      mCtx.fillStyle = 'rgba(255, 0, 0, 1)';
    } else {
      // Restore mode marks green channel (force keep foreground)
      mCtx.fillStyle = 'rgba(0, 255, 0, 1)';
    }
    mCtx.fill();
    mCtx.restore();
  };

  // Reset Brush Mask
  const handleClearBrushMask = () => {
    const mask = maskCanvasRef.current;
    if (mask) {
      const mCtx = mask.getContext('2d');
      if (mCtx) mCtx.clearRect(0, 0, mask.width, mask.height);
    }
    renderPreview();
  };

  // Auto-Detect Corners Handler
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
      perspectiveMode: true,
      perspectiveCorners: result.corners
    });
  };

  // Reset Crop & Orientation
  const handleResetCrop = () => {
    updateSettingsWithHistory({
      ...settings,
      rotation: 0,
      flipHorizontal: false,
      flipVertical: false,
      straightenAngle: 0,
      zoom: 1,
      pan: { x: 0, y: 0 },
      cropAspectRatio: 'FREE',
      cropBox: { x: 0, y: 0, width: 100, height: 100 },
      perspectiveMode: false,
      perspectiveCorners: {
        tl: { x: 0, y: 0 },
        tr: { x: 100, y: 0 },
        br: { x: 100, y: 100 },
        bl: { x: 0, y: 100 }
      }
    });
  };

  // Auto-Enhance Button Handler
  const handleAutoEnhance = () => {
    const isDoc = settings.mode === 'DOCUMENT' || detectionResult?.suggestedMode === 'DOCUMENT';
    const strength = (settings.autoEnhanceStrength ?? 50) / 100;

    const autoSettings: ImageProcessingSettings = {
      ...settings,
      documentEnhanceMode: isDoc ? 'COLOR_ENHANCED' : 'ORIGINAL',
      scanMode: isDoc,
      brightness: Math.round((isDoc ? 10 : 6) * strength),
      contrast: Math.round((isDoc ? 14 : 8) * strength),
      saturation: Math.round((isDoc ? 0 : 10) * strength),
      shadowReduction: Math.round((isDoc ? 40 : 15) * strength),
      sharpen: Math.round((isDoc ? 30 : 20) * strength),
      denoise: Math.round(15 * strength)
    };
    updateSettingsWithHistory(autoSettings);
  };

  // Save Full-Resolution Derivative Artifact
  const handleSaveDerivative = async () => {
    const img = imageObjRef.current;
    if (!img) return;

    try {
      setIsSaving(true);

      // Process at full source resolution
      const fullResCanvas = await ImageEnhancementEngine.processImage(img, settings, {
        maskCanvas: maskCanvasRef.current,
        maxDimension: 4096
      });

      // Output PNG if background is transparent, else high-quality JPEG
      const isTransparent = settings.backgroundMode === 'TRANSPARENT';
      const mimeType = isTransparent ? 'image/png' : 'image/jpeg';
      const blob = await ImageEnhancementEngine.canvasToBlob(fullResCanvas, mimeType, 0.94);

      await onSaveDerivative(blob, {
        settings,
        qualityReport,
        mimeType,
        widthPx: fullResCanvas.width,
        heightPx: fullResCanvas.height,
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
                Document & Photo Studio
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                100% In-Browser Private
              </span>
            </div>
            <div className="text-[11px] text-[#475569] truncate max-w-[240px] sm:max-w-md">
              {originalFilename}
            </div>
          </div>
        </div>

        {/* Top Header Actions */}
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
            title="Press and hold to compare with original image"
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

          {/* Apply & Save Button */}
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

      {/* CENTER VIEWPORT WITH CROP & CORNER OVERLAYS */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-[#F8FAFC]">
        <div
          ref={containerRef}
          onPointerDown={handleBrushPointerDown}
          onPointerMove={handleBrushPointerMove}
          onPointerUp={handleBrushPointerUp}
          className="relative max-h-[58vh] max-w-full inline-block shadow-md rounded-xl overflow-hidden border border-[#CBD5E1] bg-white touch-none"
        >
          <canvas
            ref={canvasRef}
            className="max-h-[58vh] max-w-full object-contain block"
          />

          {/* Circular Brush Cursor Indicator */}
          {activeTab === 'BACKGROUND' && brushCursorPos && (
            <div
              style={{
                left: brushCursorPos.x,
                top: brushCursorPos.y,
                width: brushSize * 2,
                height: brushSize * 2,
                transform: 'translate(-50%, -50%)'
              }}
              className={`absolute pointer-events-none rounded-full border-2 ${
                brushMode === 'ERASE' ? 'border-red-500 bg-red-500/20' : 'border-emerald-500 bg-emerald-500/20'
              }`}
            />
          )}

          {/* RECTANGULAR CROP OVERLAY */}
          {activeTab === 'CROP' && !showOriginal && !settings.perspectiveMode && settings.cropBox && (
            <CropBoxOverlay
              cropBox={settings.cropBox}
              onChange={(newBox) => setSettings(prev => ({ ...prev, cropBox: newBox }))}
              aspectRatio={ImageEnhancementEngine.getAspectRatioValue(
                settings.cropAspectRatio,
                (imageObjRef.current?.naturalWidth || 1) / (imageObjRef.current?.naturalHeight || 1)
              )}
              containerRef={containerRef}
            />
          )}

          {/* 4-CORNER PERSPECTIVE WARP OVERLAY */}
          {activeTab === 'CROP' && !showOriginal && settings.perspectiveMode && settings.perspectiveCorners && (
            <CornerOverlay
              corners={settings.perspectiveCorners}
              onChange={(newCorners) => setSettings(prev => ({ ...prev, perspectiveCorners: newCorners }))}
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

        {/* Passport Photo Requirements Disclaimer */}
        {(settings.mode === 'PORTRAIT' || settings.cropAspectRatio === 'PASSPORT_35X45' || settings.cropAspectRatio === 'PASSPORT_2X2') && (
          <div className="absolute top-4 left-4 right-4 sm:right-auto max-w-md bg-amber-50/95 backdrop-blur-xs border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl text-[11px] flex items-start gap-2 shadow-xs z-10">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Passport & Visa Photo Notice:</strong> Sizing and background tools are for print preparation. Official government approval depends on passport authority specifications and cannot be guaranteed.
            </span>
          </div>
        )}

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
        <div className="flex items-center justify-around border-b border-[#E2E8F0] pb-2 text-xs font-bold overflow-x-auto no-scrollbar gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('CROP')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'CROP' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-[#475569] hover:text-[#111827]'
            }`}
          >
            <Crop className="w-4 h-4" />
            <span>Crop & Ratios</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BACKGROUND')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'BACKGROUND' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-[#475569] hover:text-[#111827]'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Background Removal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ENHANCE')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'ENHANCE' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-[#475569] hover:text-[#111827]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Enhance & Filters</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TUNE')}
            className={`flex items-center gap-1.5 pb-1 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'TUNE' ? 'text-emerald-700 border-b-2 border-emerald-600' : 'text-[#475569] hover:text-[#111827]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Fine Tune</span>
          </button>
        </div>

        {/* TAB 1: CROP & RATIOS */}
        {activeTab === 'CROP' && (
          <div className="space-y-3 text-xs">
            {/* Aspect Ratio Selector Chips */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Crop Aspect Ratio:
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'FREE', label: 'Free Crop' },
                  { id: 'ORIGINAL', label: 'Original' },
                  { id: '1:1', label: 'Square (1:1)' },
                  { id: '4:6', label: '4:6 Photo' },
                  { id: 'A4', label: 'A4 Document' },
                  { id: 'PASSPORT_35X45', label: 'Passport (35×45mm)' },
                  { id: 'PASSPORT_2X2', label: 'Visa (2×2 in)' },
                  { id: 'STAMP_25X30', label: 'Stamp (25×30mm)' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateSettingsWithHistory({
                      ...settings,
                      cropAspectRatio: preset.id as CropAspectRatioPreset,
                      perspectiveMode: false
                    })}
                    className={`px-3 py-1.5 rounded-lg border font-bold whitespace-nowrap transition cursor-pointer text-xs ${
                      settings.cropAspectRatio === preset.id && !settings.perspectiveMode
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                        : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transform Controls (Rotate, Flip, Mode, Reset) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Rotate 90 */}
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

                {/* Flip Horizontal */}
                <button
                  type="button"
                  onClick={() => updateSettingsWithHistory({
                    ...settings,
                    flipHorizontal: !settings.flipHorizontal
                  })}
                  className={`px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1 cursor-pointer ${
                    settings.flipHorizontal
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-slate-100 border-transparent text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Flip Horizontal (Mirror)"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Flip H</span>
                </button>

                {/* Flip Vertical */}
                <button
                  type="button"
                  onClick={() => updateSettingsWithHistory({
                    ...settings,
                    flipVertical: !settings.flipVertical
                  })}
                  className={`px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1 cursor-pointer ${
                    settings.flipVertical
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-slate-100 border-transparent text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Flip Vertical"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Flip V</span>
                </button>

                {/* Toggle 4-Corner Perspective Warp */}
                <button
                  type="button"
                  onClick={() => updateSettingsWithHistory({
                    ...settings,
                    perspectiveMode: !settings.perspectiveMode
                  })}
                  className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 cursor-pointer ${
                    settings.perspectiveMode
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{settings.perspectiveMode ? '4-Corner Active' : '4-Corner Warp'}</span>
                </button>

                {settings.perspectiveMode && (
                  <button
                    type="button"
                    onClick={handleAutoDetectCorners}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold"
                  >
                    Auto-Detect Corners
                  </button>
                )}
              </div>

              {/* Reset Crop */}
              <button
                type="button"
                onClick={handleResetCrop}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
              >
                Reset Crop
              </button>
            </div>

            {/* Passport Head Oval Guideline Toggle */}
            {(settings.mode === 'PORTRAIT' || settings.cropAspectRatio === 'PASSPORT_35X45') && (
              <label className="flex items-center gap-2 font-bold cursor-pointer text-[#111827] pt-1">
                <input
                  type="checkbox"
                  checked={!!settings.passportGuide}
                  onChange={(e) => updateSettingsWithHistory({
                    ...settings,
                    passportGuide: e.target.checked
                  })}
                  className="accent-emerald-600"
                />
                <span>Show Passport Head Alignment Oval</span>
              </label>
            )}
          </div>
        )}

        {/* TAB 2: BACKGROUND REMOVAL */}
        {activeTab === 'BACKGROUND' && (
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Background Replacement:
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: 'ORIGINAL', label: 'Keep Original', color: 'bg-slate-100' },
                  { id: 'WHITE', label: 'Pure White (Passport)', color: 'bg-white border-2' },
                  { id: 'LIGHT_BLUE', label: 'Passport Blue', color: 'bg-blue-100' },
                  { id: 'OFF_WHITE', label: 'Light Pearl', color: 'bg-slate-50' },
                  { id: 'TRANSPARENT', label: 'Transparent (PNG)', color: 'bg-amber-50' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateSettingsWithHistory({
                      ...settings,
                      backgroundMode: item.id as BackgroundRemovalMode
                    })}
                    className={`px-3 py-2 rounded-xl border flex items-center gap-2 font-bold whitespace-nowrap transition cursor-pointer ${
                      settings.backgroundMode === item.id
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                        : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border border-slate-300 ${item.color}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Erase / Restore Brush Controls */}
            {settings.backgroundMode !== 'ORIGINAL' && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Paintbrush className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Manual Touch-up Brush:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBrushMode('ERASE')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                        brushMode === 'ERASE'
                          ? 'bg-red-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Eraser className="w-3 h-3" />
                      <span>Erase BG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrushMode('RESTORE')}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                        brushMode === 'RESTORE'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Paintbrush className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearBrushMask}
                      className="px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-semibold"
                      title="Clear brush mask"
                    >
                      Reset Mask
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 font-semibold mb-1">
                      <span>Brush Size:</span>
                      <span className="font-mono">{brushSize} px</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={60}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 font-semibold mb-1">
                      <span>Edge Feathering / Refinement:</span>
                      <span className="font-mono">{settings.edgeRefinement ?? 2} px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      value={settings.edgeRefinement ?? 2}
                      onChange={(e) => setSettings({ ...settings, edgeRefinement: Number(e.target.value) })}
                      onMouseUp={() => updateSettingsWithHistory(settings)}
                      onTouchEnd={() => updateSettingsWithHistory(settings)}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-500">
                  Tip: Drag on the image to fine-tune hair and clothing edges. Erase removes leftover background; Restore recovers person details.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ENHANCE & FILTERS */}
        {activeTab === 'ENHANCE' && (
          <div className="space-y-3 text-xs">
            {/* 1-Click Auto Enhance & Strength Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAutoEnhance}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer text-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>1-Click Auto Enhance</span>
              </button>
              <div className="flex-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                  <span>Enhance Strength:</span>
                  <span className="font-mono text-emerald-700">{settings.autoEnhanceStrength ?? 50}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={settings.autoEnhanceStrength ?? 50}
                  onChange={(e) => setSettings({ ...settings, autoEnhanceStrength: Number(e.target.value) })}
                  onMouseUp={handleAutoEnhance}
                  onTouchEnd={handleAutoEnhance}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>

            {/* Document Filter Modes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => updateSettingsWithHistory({
                  ...settings,
                  documentEnhanceMode: 'ORIGINAL',
                  scanMode: false
                })}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  settings.documentEnhanceMode === 'ORIGINAL' && !settings.scanMode
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
                  documentEnhanceMode: 'COLOR_ENHANCED',
                  scanMode: true
                })}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  settings.documentEnhanceMode === 'COLOR_ENHANCED' || settings.scanMode
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                }`}
              >
                <div>Document Scan Mode</div>
                <div className="text-[10px] text-slate-500 font-normal">Stamps & handwriting safe</div>
              </button>

              <button
                type="button"
                onClick={() => updateSettingsWithHistory({
                  ...settings,
                  documentEnhanceMode: 'GRAYSCALE',
                  scanMode: false
                })}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
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
                  documentEnhanceMode: 'HIGH_CONTRAST',
                  scanMode: false
                })}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  settings.documentEnhanceMode === 'HIGH_CONTRAST'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                    : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-slate-50'
                }`}
              >
                <div>High Contrast B&W</div>
                <div className="text-[10px] text-slate-500 font-normal">Crisp receipts & forms</div>
              </button>
            </div>

            {/* Optional Digital Upscaler Toggle with Honest Disclosure */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <label className="flex items-center gap-2 font-bold cursor-pointer text-[#111827]">
                <input
                  type="checkbox"
                  checked={!!settings.upscale}
                  onChange={(e) => updateSettingsWithHistory({
                    ...settings,
                    upscale: e.target.checked
                  })}
                  className="accent-emerald-600"
                />
                <span>2x Digital Upscale Resampling</span>
              </label>
              <span className="text-[10px] text-slate-500 max-w-xs text-right">
                Increases pixel count for print smoothing; cannot recover lost optical camera detail.
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: FINE TUNE */}
        {activeTab === 'TUNE' && (
          <div className="space-y-3 text-xs">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* Brightness */}
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

              {/* Contrast */}
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

              {/* Saturation */}
              <div>
                <div className="flex items-center justify-between text-slate-700 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-purple-500" />
                    <span>Saturation</span>
                  </span>
                  <span className="font-mono text-emerald-700">{settings.saturation || 0}</span>
                </div>
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={2}
                  value={settings.saturation || 0}
                  onChange={(e) => setSettings({ ...settings, saturation: Number(e.target.value) })}
                  onMouseUp={() => updateSettingsWithHistory(settings)}
                  onTouchEnd={() => updateSettingsWithHistory(settings)}
                  className="w-full accent-emerald-600"
                />
              </div>

              {/* Sharpness */}
              <div>
                <div className="flex items-center justify-between text-slate-700 font-bold mb-1">
                  <span>Sharpness (Unsharp Mask)</span>
                  <span className="font-mono text-emerald-700">{settings.sharpen || 0}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={settings.sharpen || 0}
                  onChange={(e) => setSettings({ ...settings, sharpen: Number(e.target.value) })}
                  onMouseUp={() => updateSettingsWithHistory(settings)}
                  onTouchEnd={() => updateSettingsWithHistory(settings)}
                  className="w-full accent-emerald-600"
                />
              </div>

              {/* Denoise */}
              <div>
                <div className="flex items-center justify-between text-slate-700 font-bold mb-1">
                  <span>Restrained Denoise</span>
                  <span className="font-mono text-emerald-700">{settings.denoise || 0}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={settings.denoise || 0}
                  onChange={(e) => setSettings({ ...settings, denoise: Number(e.target.value) })}
                  onMouseUp={() => updateSettingsWithHistory(settings)}
                  onTouchEnd={() => updateSettingsWithHistory(settings)}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => updateSettingsWithHistory({
                  ...settings,
                  brightness: 0,
                  contrast: 0,
                  saturation: 0,
                  sharpen: 15,
                  denoise: 0
                })}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >
                Reset Fine Tuning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
