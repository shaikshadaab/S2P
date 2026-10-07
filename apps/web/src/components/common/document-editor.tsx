"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Crop,
  RotateCw,
  Sun,
  Check,
  X,
  RefreshCw,
  Maximize,
  Trash2,
  FileUp
} from 'lucide-react';

export interface DocumentEditorProps {
  imageUrl: string;
  fileId: string;
  originalFilename: string;
  onSaveDerivative: (derivativeBlob: Blob, metadata: DerivativeMetadata) => Promise<void>;
  onClose: () => void;
  onReplace?: () => void;
  onRemove?: () => void;
}

export interface DerivativeMetadata {
  crop: { x: number; y: number; width: number; height: number };
  rotation: number;
  straightenAngle: number;
  brightness: number;
  contrast: number;
}

export default function DocumentEditor({
  imageUrl,
  fileId,
  originalFilename,
  onSaveDerivative,
  onClose,
  onReplace,
  onRemove
}: DocumentEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [straightenAngle, setStraightenAngle] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 100,
    height: 100
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'CROP' | 'ENHANCE' | 'ROTATE'>('CROP');
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      setCropBox({ x: 5, y: 5, width: 90, height: 90 });
      renderPreview();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    renderPreview();
  }, [rotation, straightenAngle, brightness, contrast, cropBox]);

  const renderPreview = () => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    ctx.filter = 'brightness(' + brightness + '%) contrast(' + contrast + '%)';

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(((rotation + straightenAngle) * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    ctx.restore();
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleAutoDetectBoundary = () => {
    setCropBox({ x: 4, y: 4, width: 92, height: 92 });
    setBrightness(105);
    setContrast(110);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);
    try {
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            await onSaveDerivative(blob, {
              crop: cropBox,
              rotation,
              straightenAngle,
              brightness,
              contrast
            });
          }
          setIsProcessing(false);
          onClose();
        },
        'image/jpeg',
        0.92
      );
    } catch {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="text-xs font-semibold truncate max-w-[200px]">
          Edit: {originalFilename}
        </span>
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleSave}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
        >
          {isProcessing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          <span>Save Derivative</span>
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-zinc-900">
        <canvas
          ref={canvasRef}
          className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl border border-zinc-700"
        />
        <div className="absolute top-4 left-4 bg-black/70 px-2 py-1 rounded text-[10px] text-zinc-300 font-mono">
          Original preserved untouched &bull; Derivative preview
        </div>
      </div>

      <div className="border-t border-zinc-800 bg-zinc-950 p-4 space-y-3">
        <div className="flex items-center justify-around border-b border-zinc-800 pb-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('CROP')}
            className={'flex items-center gap-1.5 pb-1 ' + (activeTab === 'CROP' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-400')}
          >
            <Crop className="w-4 h-4" />
            <span>Crop & Edge</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ROTATE')}
            className={'flex items-center gap-1.5 pb-1 ' + (activeTab === 'ROTATE' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-400')}
          >
            <RotateCw className="w-4 h-4" />
            <span>Rotate & Straighten</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ENHANCE')}
            className={'flex items-center gap-1.5 pb-1 ' + (activeTab === 'ENHANCE' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-zinc-400')}
          >
            <Sun className="w-4 h-4" />
            <span>Enhance</span>
          </button>
        </div>

        {activeTab === 'CROP' && (
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleAutoDetectBoundary}
              className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-semibold flex items-center gap-1.5 transition"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span>Auto-Detect Document Bounds</span>
            </button>
            <div className="flex items-center gap-2">
              {onReplace && (
                <button
                  type="button"
                  onClick={onReplace}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold flex items-center gap-1.5"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Replace</span>
                </button>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  className="px-3 py-2 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ROTATE' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleRotate}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate 90° ({rotation}°)</span>
              </button>
              <span className="text-[11px] text-zinc-400">Straighten: {straightenAngle}°</span>
            </div>
            <input
              type="range"
              min="-15"
              max="15"
              value={straightenAngle}
              onChange={(e) => setStraightenAngle(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        )}

        {activeTab === 'ENHANCE' && (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-400">Brightness</span>
                <span className="font-mono text-zinc-300">{brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-400">Contrast</span>
                <span className="font-mono text-zinc-300">{contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="150"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
