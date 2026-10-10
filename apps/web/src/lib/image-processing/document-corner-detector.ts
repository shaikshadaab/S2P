import { PerspectiveCorners, CornerPoint } from '@s2p/shared';

export interface DetectionResult {
  corners: PerspectiveCorners;
  confidence: number;
  isConfident: boolean;
  category: 'DOCUMENT' | 'PHOTO' | 'ID_CARD' | 'UNKNOWN';
}

export class DocumentCornerDetector {
  /**
   * Fast, client-side computer vision edge and corner detector.
   * Analyzes high-contrast gradient boundaries to locate document edges.
   */
  public static detect(sourceCanvas: HTMLCanvasElement): DetectionResult {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;

    // Conservative default inset (5% margin)
    const fallbackCorners: PerspectiveCorners = {
      tl: { x: 5, y: 5 },
      tr: { x: 95, y: 5 },
      br: { x: 95, y: 95 },
      bl: { x: 5, y: 95 }
    };

    if (w < 20 || h < 20) {
      return {
        corners: fallbackCorners,
        confidence: 0.5,
        isConfident: false,
        category: 'UNKNOWN'
      };
    }

    try {
      // 1. Downscale to a normalized 240px wide canvas for fast processing (< 15ms)
      const sampleW = 240;
      const sampleH = Math.max(100, Math.round((h / w) * sampleW));
      const offscreen = document.createElement('canvas');
      offscreen.width = sampleW;
      offscreen.height = sampleH;
      const ctx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return { corners: fallbackCorners, confidence: 0.5, isConfident: false, category: 'DOCUMENT' };
      }

      ctx.drawImage(sourceCanvas, 0, 0, sampleW, sampleH);
      const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
      const data = imgData.data;

      // 2. Grayscale buffer
      const gray = new Float32Array(sampleW * sampleH);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }

      // 3. Sobel edge magnitude
      const edges = new Float32Array(sampleW * sampleH);
      let maxGrad = 0;

      for (let y = 1; y < sampleH - 1; y++) {
        for (let x = 1; x < sampleW - 1; x++) {
          const idx = y * sampleW + x;
          // Sobel Horizontal
          const gx =
            -gray[idx - sampleW - 1] + gray[idx - sampleW + 1] +
            -2 * gray[idx - 1] + 2 * gray[idx + 1] +
            -gray[idx + sampleW - 1] + gray[idx + sampleW + 1];

          // Sobel Vertical
          const gy =
            -gray[idx - sampleW - 1] - 2 * gray[idx - sampleW] - gray[idx - sampleW + 1] +
            gray[idx + sampleW - 1] + 2 * gray[idx + sampleW] + gray[idx + sampleW + 1];

          const mag = Math.hypot(gx, gy);
          edges[idx] = mag;
          if (mag > maxGrad) maxGrad = mag;
        }
      }

      // 4. Threshold strong edges (top 25% gradient)
      const threshold = maxGrad * 0.25;
      const strongPoints: { x: number; y: number }[] = [];

      // Avoid outer 3% margin to ignore scanner / phone lens frame borders
      const borderX = Math.round(sampleW * 0.03);
      const borderY = Math.round(sampleH * 0.03);

      for (let y = borderY; y < sampleH - borderY; y += 2) {
        for (let x = borderX; x < sampleW - borderX; x += 2) {
          if (edges[y * sampleW + x] > threshold) {
            strongPoints.push({ x, y });
          }
        }
      }

      if (strongPoints.length < 50) {
        return { corners: fallbackCorners, confidence: 0.6, isConfident: false, category: 'DOCUMENT' };
      }

      // 5. Quadrant Extrema Search for corners
      // TL minimizes (x + y)
      // TR maximizes (x - y)
      // BR maximizes (x + y)
      // BL minimizes (x - y)
      let minSum = Infinity;
      let maxSum = -Infinity;
      let maxDiff = -Infinity;
      let minDiff = Infinity;

      let tl = { x: borderX, y: borderY };
      let tr = { x: sampleW - borderX, y: borderY };
      let br = { x: sampleW - borderX, y: sampleH - borderY };
      let bl = { x: borderX, y: sampleH - borderY };

      for (const p of strongPoints) {
        const sum = p.x + p.y;
        const diff = p.x - p.y;

        if (sum < minSum) {
          minSum = sum;
          tl = p;
        }
        if (diff > maxDiff) {
          maxDiff = diff;
          tr = p;
        }
        if (sum > maxSum) {
          maxSum = sum;
          br = p;
        }
        if (diff < minDiff) {
          minDiff = diff;
          bl = p;
        }
      }

      // Convert to percentages (0-100)
      const toPct = (pt: { x: number; y: number }) => ({
        x: Math.max(1, Math.min(99, Math.round((pt.x / sampleW) * 100))),
        y: Math.max(1, Math.min(99, Math.round((pt.y / sampleH) * 100)))
      });

      const cornersPct: PerspectiveCorners = {
        tl: toPct(tl),
        tr: toPct(tr),
        br: toPct(br),
        bl: toPct(bl)
      };

      // 6. Validation: Check quadrilateral area using Shoelace formula
      const area = 0.5 * Math.abs(
        (cornersPct.tl.x * cornersPct.tr.y - cornersPct.tr.x * cornersPct.tl.y) +
        (cornersPct.tr.x * cornersPct.br.y - cornersPct.br.x * cornersPct.tr.y) +
        (cornersPct.br.x * cornersPct.bl.y - cornersPct.bl.x * cornersPct.br.y) +
        (cornersPct.bl.x * cornersPct.tl.y - cornersPct.tl.x * cornersPct.bl.y)
      );

      // Total box area is 100 * 100 = 10000
      const areaRatio = area / 10000;
      const isConvex =
        cornersPct.tr.x > cornersPct.tl.x &&
        cornersPct.br.x > cornersPct.bl.x &&
        cornersPct.bl.y > cornersPct.tl.y &&
        cornersPct.br.y > cornersPct.tr.y;

      if (isConvex && areaRatio >= 0.25 && areaRatio <= 0.95) {
        // High confidence detection
        const ratio = (w / h);
        const category = ratio >= 1.45 && ratio <= 1.65 ? 'ID_CARD' : 'DOCUMENT';
        return {
          corners: cornersPct,
          confidence: 0.88,
          isConfident: true,
          category
        };
      }

      // Low confidence fallback (display "Adjust the corners")
      return {
        corners: fallbackCorners,
        confidence: 0.62,
        isConfident: false,
        category: 'DOCUMENT'
      };
    } catch {
      return {
        corners: fallbackCorners,
        confidence: 0.5,
        isConfident: false,
        category: 'UNKNOWN'
      };
    }
  }

  /**
   * Warps a perspective quadrilateral into a rectangular canvas.
   * Uses piecewise affine triangle mapping (Canvas2D standard).
   */
  public static warpPerspective(
    source: HTMLImageElement | HTMLCanvasElement,
    corners: PerspectiveCorners,
    maxDimension = 2560
  ): HTMLCanvasElement {
    const srcW = 'naturalWidth' in source ? source.naturalWidth : source.width;
    const srcH = 'naturalHeight' in source ? source.naturalHeight : source.height;

    // Convert corners from percentage to absolute source pixels
    const p0 = { x: (corners.tl.x / 100) * srcW, y: (corners.tl.y / 100) * srcH };
    const p1 = { x: (corners.tr.x / 100) * srcW, y: (corners.tr.y / 100) * srcH };
    const p2 = { x: (corners.br.x / 100) * srcW, y: (corners.br.y / 100) * srcH };
    const p3 = { x: (corners.bl.x / 100) * srcW, y: (corners.bl.y / 100) * srcH };

    // Compute destination width & height
    const topW = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const botW = Math.hypot(p2.x - p3.x, p2.y - p3.y);
    const leftH = Math.hypot(p3.x - p0.x, p3.y - p0.y);
    const rightH = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    let dstW = Math.max(50, Math.round(Math.max(topW, botW)));
    let dstH = Math.max(50, Math.round(Math.max(leftH, rightH)));

    // Bound output dimension for memory safety
    if (Math.max(dstW, dstH) > maxDimension) {
      const scale = maxDimension / Math.max(dstW, dstH);
      dstW = Math.round(dstW * scale);
      dstH = Math.round(dstH * scale);
    }

    const outCanvas = document.createElement('canvas');
    outCanvas.width = dstW;
    outCanvas.height = dstH;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return outCanvas;

    // Piecewise affine transformation across 2 triangles:
    // Triangle 1: (p0, p1, p3) -> ((0,0), (dstW, 0), (0, dstH))
    // Triangle 2: (p1, p2, p3) -> ((dstW,0), (dstW, dstH), (0, dstH))
    this.renderTriangle(
      ctx,
      source,
      p0, p1, p3,
      { x: 0, y: 0 }, { x: dstW, y: 0 }, { x: 0, y: dstH }
    );

    this.renderTriangle(
      ctx,
      source,
      p1, p2, p3,
      { x: dstW, y: 0 }, { x: dstW, y: dstH }, { x: 0, y: dstH }
    );

    return outCanvas;
  }

  /**
   * Helper to map an arbitrary triangle in source to a triangle in destination canvas.
   */
  private static renderTriangle(
    ctx: CanvasRenderingContext2D,
    im: HTMLImageElement | HTMLCanvasElement,
    s0: { x: number; y: number },
    s1: { x: number; y: number },
    s2: { x: number; y: number },
    d0: { x: number; y: number },
    d1: { x: number; y: number },
    d2: { x: number; y: number }
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(d0.x, d0.y);
    ctx.lineTo(d1.x, d1.y);
    ctx.lineTo(d2.x, d2.y);
    ctx.closePath();
    ctx.clip();

    // Compute affine transform matrix: [a, b, c, d, e, f]
    // mapping (s0, s1, s2) to (d0, d1, d2)
    const delta = s0.x * (s1.y - s2.y) - s1.x * (s0.y - s2.y) + s2.x * (s0.y - s1.y);
    if (Math.abs(delta) < 1e-6) {
      ctx.restore();
      return;
    }

    const deltaA = d0.x * (s1.y - s2.y) - d1.x * (s0.y - s2.y) + d2.x * (s0.y - s1.y);
    const deltaB = s0.x * (d1.x - d2.x) - s1.x * (d0.x - d2.x) + s2.x * (d0.x - d1.x);
    const deltaC = s0.x * (s1.y * d2.x - s2.y * d1.x) - s1.x * (s0.y * d2.x - s2.y * d0.x) + s2.x * (s0.y * d1.x - s1.y * d0.x);

    const deltaD = d0.y * (s1.y - s2.y) - d1.y * (s0.y - s2.y) + d2.y * (s0.y - s1.y);
    const deltaE = s0.x * (d1.y - d2.y) - s1.x * (d0.y - d2.y) + s2.x * (d0.y - d1.y);
    const deltaF = s0.x * (s1.y * d2.y - s2.y * d1.y) - s1.x * (s0.y * d2.y - s2.y * d0.y) + s2.x * (s0.y * d1.y - s1.y * d0.y);

    const a = deltaA / delta;
    const b = deltaD / delta;
    const c = deltaB / delta;
    const d = deltaE / delta;
    const e = deltaC / delta;
    const f = deltaF / delta;

    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(im, 0, 0);
    ctx.restore();
  }
}
