"use client";

import React, { useState, useRef } from 'react';

export interface CropBox {
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  width: number; // 0 to 100 percentage
  height: number; // 0 to 100 percentage
}

interface CropBoxOverlayProps {
  cropBox: CropBox;
  onChange: (newBox: CropBox) => void;
  aspectRatio: number | null; // width / height or null for free
  containerRef: React.RefObject<HTMLDivElement | null>;
}

type HandleType = 'tl' | 'tr' | 'br' | 'bl' | 'top' | 'right' | 'bottom' | 'left' | 'move' | null;

export function CropBoxOverlay({
  cropBox,
  onChange,
  aspectRatio,
  containerRef
}: CropBoxOverlayProps) {
  const [activeHandle, setActiveHandle] = useState<HandleType>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; initialBox: CropBox }>({
    clientX: 0,
    clientY: 0,
    initialBox: cropBox
  });

  const handlePointerDown = (handle: HandleType, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveHandle(handle);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialBox: { ...cropBox }
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaXPct = ((e.clientX - dragStartRef.current.clientX) / rect.width) * 100;
    const deltaYPct = ((e.clientY - dragStartRef.current.clientY) / rect.height) * 100;
    const init = dragStartRef.current.initialBox;

    let newX = init.x;
    let newY = init.y;
    let newW = init.width;
    let newH = init.height;

    const minSizePct = 10;

    if (activeHandle === 'move') {
      newX = Math.max(0, Math.min(100 - init.width, init.x + deltaXPct));
      newY = Math.max(0, Math.min(100 - init.height, init.y + deltaYPct));
    } else {
      if (activeHandle === 'tl') {
        newX = Math.max(0, Math.min(init.x + init.width - minSizePct, init.x + deltaXPct));
        newY = Math.max(0, Math.min(init.y + init.height - minSizePct, init.y + deltaYPct));
        newW = init.width - (newX - init.x);
        newH = init.height - (newY - init.y);
      } else if (activeHandle === 'tr') {
        newY = Math.max(0, Math.min(init.y + init.height - minSizePct, init.y + deltaYPct));
        newW = Math.max(minSizePct, Math.min(100 - init.x, init.width + deltaXPct));
        newH = init.height - (newY - init.y);
      } else if (activeHandle === 'br') {
        newW = Math.max(minSizePct, Math.min(100 - init.x, init.width + deltaXPct));
        newH = Math.max(minSizePct, Math.min(100 - init.y, init.height + deltaYPct));
      } else if (activeHandle === 'bl') {
        newX = Math.max(0, Math.min(init.x + init.width - minSizePct, init.x + deltaXPct));
        newW = init.width - (newX - init.x);
        newH = Math.max(minSizePct, Math.min(100 - init.y, init.height + deltaYPct));
      } else if (activeHandle === 'top') {
        newY = Math.max(0, Math.min(init.y + init.height - minSizePct, init.y + deltaYPct));
        newH = init.height - (newY - init.y);
      } else if (activeHandle === 'bottom') {
        newH = Math.max(minSizePct, Math.min(100 - init.y, init.height + deltaYPct));
      } else if (activeHandle === 'left') {
        newX = Math.max(0, Math.min(init.x + init.width - minSizePct, init.x + deltaXPct));
        newW = init.width - (newX - init.x);
      } else if (activeHandle === 'right') {
        newW = Math.max(minSizePct, Math.min(100 - init.x, init.width + deltaXPct));
      }

      // If aspect ratio is locked:
      if (aspectRatio && aspectRatio > 0) {
        const containerRatio = rect.width / rect.height;
        // pixel width / pixel height = (w% * rect.width) / (h% * rect.height) = aspectRatio
        // => h% = (w% * containerRatio) / aspectRatio
        const desiredH = (newW * containerRatio) / aspectRatio;
        if (newY + desiredH <= 100) {
          newH = desiredH;
        } else {
          newH = 100 - newY;
          newW = (newH * aspectRatio) / containerRatio;
        }
      }
    }

    onChange({
      x: Math.max(0, Math.min(100, Math.round(newX * 10) / 10)),
      y: Math.max(0, Math.min(100, Math.round(newY * 10) / 10)),
      width: Math.max(minSizePct, Math.min(100, Math.round(newW * 10) / 10)),
      height: Math.max(minSizePct, Math.min(100, Math.round(newH * 10) / 10))
    });
  };

  const handlePointerUp = () => {
    setActiveHandle(null);
  };

  const { x, y, width: w, height: h } = cropBox;

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute inset-0 select-none touch-none overflow-hidden"
    >
      {/* 4 Shaded Dimming Regions Outside Crop Box */}
      <div style={{ top: 0, left: 0, right: 0, height: `${y}%` }} className="absolute bg-slate-900/50 backdrop-blur-[0.5px]" />
      <div style={{ top: `${y + h}%`, left: 0, right: 0, bottom: 0 }} className="absolute bg-slate-900/50 backdrop-blur-[0.5px]" />
      <div style={{ top: `${y}%`, left: 0, width: `${x}%`, height: `${h}%` }} className="absolute bg-slate-900/50 backdrop-blur-[0.5px]" />
      <div style={{ top: `${y}%`, left: `${x + w}%`, right: 0, height: `${h}%` }} className="absolute bg-slate-900/50 backdrop-blur-[0.5px]" />

      {/* Active Crop Box Rect */}
      <div
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: `${w}%`,
          height: `${h}%`
        }}
        className="absolute border-2 border-emerald-500 shadow-lg cursor-move"
        onPointerDown={(e) => handlePointerDown('move', e)}
      >
        {/* Rule of Thirds Grid Lines */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
          <div className="border-r border-b border-emerald-300 border-dashed" />
          <div className="border-r border-b border-emerald-300 border-dashed" />
          <div className="border-b border-emerald-300 border-dashed" />
          <div className="border-r border-b border-emerald-300 border-dashed" />
          <div className="border-r border-b border-emerald-300 border-dashed" />
          <div className="border-b border-emerald-300 border-dashed" />
          <div className="border-r border-emerald-300 border-dashed" />
          <div className="border-r border-emerald-300 border-dashed" />
          <div />
        </div>

        {/* 4 Corner Handles (Touch targets: 32px) */}
        {(['tl', 'tr', 'br', 'bl'] as const).map((pos) => {
          const isTop = pos.includes('t');
          const isLeft = pos.includes('l');
          const cursorClass =
            pos === 'tl' || pos === 'br' ? 'cursor-nwse-resize' : 'cursor-nesw-resize';

          return (
            <div
              key={pos}
              onPointerDown={(e) => handlePointerDown(pos, e)}
              style={{
                top: isTop ? 0 : '100%',
                left: isLeft ? 0 : '100%',
                transform: 'translate(-50%, -50%)'
              }}
              className={`absolute w-8 h-8 flex items-center justify-center ${cursorClass} touch-none pointer-events-auto z-20 group`}
              title={`Resize ${pos.toUpperCase()}`}
            >
              <div className="w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-md group-hover:scale-125 group-active:scale-125 transition-transform">
                <div className="w-1 h-1 rounded-full bg-white mx-auto my-1" />
              </div>
            </div>
          );
        })}

        {/* 4 Edge Handles */}
        <div
          onPointerDown={(e) => handlePointerDown('top', e)}
          className="absolute top-0 left-1/4 right-1/4 h-3 -translate-y-1/2 cursor-ns-resize z-10 flex items-center justify-center"
        >
          <div className="w-6 h-1 rounded-full bg-emerald-500 border border-white shadow-xs" />
        </div>
        <div
          onPointerDown={(e) => handlePointerDown('bottom', e)}
          className="absolute bottom-0 left-1/4 right-1/4 h-3 translate-y-1/2 cursor-ns-resize z-10 flex items-center justify-center"
        >
          <div className="w-6 h-1 rounded-full bg-emerald-500 border border-white shadow-xs" />
        </div>
        <div
          onPointerDown={(e) => handlePointerDown('left', e)}
          className="absolute left-0 top-1/4 bottom-1/4 w-3 -translate-x-1/2 cursor-ew-resize z-10 flex items-center justify-center"
        >
          <div className="h-6 w-1 rounded-full bg-emerald-500 border border-white shadow-xs" />
        </div>
        <div
          onPointerDown={(e) => handlePointerDown('right', e)}
          className="absolute right-0 top-1/4 bottom-1/4 w-3 translate-x-1/2 cursor-ew-resize z-10 flex items-center justify-center"
        >
          <div className="h-6 w-1 rounded-full bg-emerald-500 border border-white shadow-xs" />
        </div>
      </div>
    </div>
  );
}
