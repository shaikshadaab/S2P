"use client";

import React, { useState } from 'react';
import { PerspectiveCorners } from '@s2p/shared';

interface CornerOverlayProps {
  corners: PerspectiveCorners;
  onChange: (newCorners: PerspectiveCorners) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function CornerOverlay({ corners, onChange, containerRef }: CornerOverlayProps) {
  const [activeCorner, setActiveCorner] = useState<'tl' | 'tr' | 'br' | 'bl' | null>(null);

  const handlePointerDown = (corner: 'tl' | 'tr' | 'br' | 'bl', e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveCorner(corner);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeCorner || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const xPct = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    onChange({
      ...corners,
      [activeCorner]: { x: xPct, y: yPct }
    });
  };

  const handlePointerUp = () => {
    setActiveCorner(null);
  };

  const pts = corners;

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute inset-0 pointer-events-none select-none touch-none"
    >
      {/* Connecting Polygon Line */}
      <svg className="w-full h-full absolute inset-0">
        <polygon
          points={`${pts.tl.x}%,${pts.tl.y}% ${pts.tr.x}%,${pts.tr.y}% ${pts.br.x}%,${pts.br.y}% ${pts.bl.x}%,${pts.bl.y}%`}
          fill="rgba(5, 150, 105, 0.12)"
          stroke="#059669"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      </svg>

      {/* 4 Interactive Drag Pins */}
      {(['tl', 'tr', 'br', 'bl'] as const).map((pos) => {
        const pt = pts[pos];
        return (
          <div
            key={pos}
            onPointerDown={(e) => handlePointerDown(pos, e)}
            style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center cursor-crosshair pointer-events-auto touch-none group"
            title={`Drag ${pos.toUpperCase()} Corner`}
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center group-hover:scale-125 group-active:scale-125 transition-transform">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
