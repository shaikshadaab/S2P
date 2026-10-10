import { PerspectiveCorners, CornerPoint } from '@s2p/shared';

export interface DetectionResult {
  corners: PerspectiveCorners;
  confidence: number;
  isConfident: boolean;
  category: 'DOCUMENT' | 'PHOTO' | 'ID_CARD' | 'UNKNOWN';
}

export interface Matrix3x3 {
  m: number[][];
}

export class DocumentCornerDetector {
  /**
   * Client-side document corner detection with rigorous edge verification
   * and shape geometry validation.
   *
   * On low confidence: preserves the 100% full image bounds and marks
   * isConfident: false so the user is guided to adjust manually.
   */
  public static detect(sourceCanvas: HTMLCanvasElement): DetectionResult {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;

    // Full 100% image boundary (no arbitrary crop on low confidence)
    const fullImageCorners: PerspectiveCorners = {
      tl: { x: 0, y: 0 },
      tr: { x: 100, y: 0 },
      br: { x: 100, y: 100 },
      bl: { x: 0, y: 100 }
    };

    if (w < 40 || h < 40) {
      return {
        corners: fullImageCorners,
        confidence: 0.3,
        isConfident: false,
        category: 'UNKNOWN'
      };
    }

    try {
      // 1. Downscale to a normalized 320px wide canvas for fast, reliable gradient analysis
      const sampleW = 320;
      const sampleH = Math.max(120, Math.round((h / w) * sampleW));
      const offscreen = document.createElement('canvas');
      offscreen.width = sampleW;
      offscreen.height = sampleH;
      const ctx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return { corners: fullImageCorners, confidence: 0.3, isConfident: false, category: 'DOCUMENT' };
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
          const gx =
            -gray[idx - sampleW - 1] + gray[idx - sampleW + 1] +
            -2 * gray[idx - 1] + 2 * gray[idx + 1] +
            -gray[idx + sampleW - 1] + gray[idx + sampleW + 1];

          const gy =
            -gray[idx - sampleW - 1] - 2 * gray[idx - sampleW] - gray[idx - sampleW + 1] +
            gray[idx + sampleW - 1] + 2 * gray[idx + sampleW] + gray[idx + sampleW + 1];

          const mag = Math.hypot(gx, gy);
          edges[idx] = mag;
          if (mag > maxGrad) maxGrad = mag;
        }
      }

      // 4. Threshold strong edges
      const threshold = maxGrad * 0.22;
      const strongPoints: { x: number; y: number }[] = [];
      const borderX = Math.round(sampleW * 0.02);
      const borderY = Math.round(sampleH * 0.02);

      for (let y = borderY; y < sampleH - borderY; y += 2) {
        for (let x = borderX; x < sampleW - borderX; x += 2) {
          if (edges[y * sampleW + x] > threshold) {
            strongPoints.push({ x, y });
          }
        }
      }

      if (strongPoints.length < 80) {
        return {
          corners: fullImageCorners,
          confidence: 0.35,
          isConfident: false,
          category: 'DOCUMENT'
        };
      }

      // 5. Quadrant Extrema Search for candidate corners
      let minSum = Infinity, maxSum = -Infinity;
      let maxDiff = -Infinity, minDiff = Infinity;

      let tl = { x: borderX, y: borderY };
      let tr = { x: sampleW - borderX, y: borderY };
      let br = { x: sampleW - borderX, y: sampleH - borderY };
      let bl = { x: borderX, y: sampleH - borderY };

      for (const p of strongPoints) {
        const sum = p.x + p.y;
        const diff = p.x - p.y;

        if (sum < minSum) { minSum = sum; tl = p; }
        if (diff > maxDiff) { maxDiff = diff; tr = p; }
        if (sum > maxSum) { maxSum = sum; br = p; }
        if (diff < minDiff) { minDiff = diff; bl = p; }
      }

      // 6. Validation: Check quadrilateral area using Shoelace formula
      const toPct = (pt: { x: number; y: number }) => ({
        x: Math.max(0, Math.min(100, Math.round((pt.x / sampleW) * 100))),
        y: Math.max(0, Math.min(100, Math.round((pt.y / sampleH) * 100)))
      });

      const cornersPct: PerspectiveCorners = {
        tl: toPct(tl),
        tr: toPct(tr),
        br: toPct(br),
        bl: toPct(bl)
      };

      const area = 0.5 * Math.abs(
        (cornersPct.tl.x * cornersPct.tr.y - cornersPct.tr.x * cornersPct.tl.y) +
        (cornersPct.tr.x * cornersPct.br.y - cornersPct.br.x * cornersPct.tr.y) +
        (cornersPct.br.x * cornersPct.bl.y - cornersPct.br.x * cornersPct.bl.y) +
        (cornersPct.bl.x * cornersPct.tl.y - cornersPct.bl.x * cornersPct.bl.y)
      );
      const areaRatio = area / 10000;

      // Strict convexity check
      const isConvex =
        cornersPct.tr.x > cornersPct.tl.x &&
        cornersPct.br.x > cornersPct.bl.x &&
        cornersPct.bl.y > cornersPct.tl.y &&
        cornersPct.br.y > cornersPct.tr.y;

      if (!isConvex || areaRatio < 0.30 || areaRatio > 0.94) {
        return {
          corners: fullImageCorners,
          confidence: 0.40,
          isConfident: false,
          category: 'DOCUMENT'
        };
      }

      // 7. Rigorous Geometric Angle Check (all 4 corners should be close to 90 degrees)
      const angleAt = (prev: {x:number, y:number}, cur: {x:number, y:number}, next: {x:number, y:number}) => {
        const v1x = prev.x - cur.x, v1y = prev.y - cur.y;
        const v2x = next.x - cur.x, v2y = next.y - cur.y;
        const dot = v1x * v2x + v1y * v2y;
        const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
        if (mag === 0) return 1;
        return Math.abs(dot / mag); // cos(theta); 0 means perpendicular 90 deg
      };

      const cosTL = angleAt(cornersPct.bl, cornersPct.tl, cornersPct.tr);
      const cosTR = angleAt(cornersPct.tl, cornersPct.tr, cornersPct.br);
      const cosBR = angleAt(cornersPct.tr, cornersPct.br, cornersPct.bl);
      const cosBL = angleAt(cornersPct.br, cornersPct.bl, cornersPct.tl);

      // If any angle deviates more than ~35 deg from perpendicular, it's not a rectangular paper
      const maxCos = Math.max(cosTL, cosTR, cosBR, cosBL);
      const angleScore = Math.max(0, 1 - maxCos / 0.55);

      // 8. Edge Gradient Support along the perimeter
      const checkEdgeSupport = (p1: {x:number, y:number}, p2: {x:number, y:number}) => {
        let hits = 0;
        const steps = 15;
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const ex = Math.round(p1.x + t * (p2.x - p1.x));
          const ey = Math.round(p1.y + t * (p2.y - p1.y));
          if (edges[ey * sampleW + ex] > threshold * 0.7) {
            hits++;
          }
        }
        return hits / (steps - 1);
      };

      const supTop = checkEdgeSupport(tl, tr);
      const supRight = checkEdgeSupport(tr, br);
      const supBottom = checkEdgeSupport(br, bl);
      const supLeft = checkEdgeSupport(bl, tl);
      const edgeSupportScore = (supTop + supRight + supBottom + supLeft) / 4;

      // 9. Calculate Dynamic Confidence
      const confidence = 0.50 * edgeSupportScore + 0.35 * angleScore + 0.15 * (1 - Math.abs(areaRatio - 0.70));
      const roundedConf = Math.round(Math.min(0.95, Math.max(0.1, confidence)) * 100) / 100;

      // Require high confidence (> 0.70) and good edge support (> 0.40) to auto-apply
      if (roundedConf >= 0.70 && edgeSupportScore >= 0.40 && maxCos < 0.50) {
        const ratio = w / h;
        const category = ratio >= 1.45 && ratio <= 1.65 ? 'ID_CARD' : 'DOCUMENT';
        return {
          corners: cornersPct,
          confidence: roundedConf,
          isConfident: true,
          category
        };
      }

      // Low confidence: preserve full image bounds and guide user to adjust
      return {
        corners: fullImageCorners,
        confidence: roundedConf,
        isConfident: false,
        category: 'DOCUMENT'
      };
    } catch {
      return {
        corners: fullImageCorners,
        confidence: 0.30,
        isConfident: false,
        category: 'UNKNOWN'
      };
    }
  }

  /**
   * Solves the exact 8-DOF projective homography matrix H mapping srcPts -> dstPts.
   * [x', y', 1]^T ~ H * [x, y, 1]^T
   */
  public static getPerspectiveTransform(
    src: { x: number; y: number }[],
    dst: { x: number; y: number }[]
  ): number[][] {
    const A: number[][] = [];
    const b: number[] = [];

    for (let i = 0; i < 4; i++) {
      const sx = src[i].x;
      const sy = src[i].y;
      const dx = dst[i].x;
      const dy = dst[i].y;

      A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
      b.push(dx);

      A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
      b.push(dy);
    }

    // Solve Ah = b with Gaussian elimination and partial pivoting
    const n = 8;
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
      }
      const tempA = A[i]; A[i] = A[maxRow]; A[maxRow] = tempA;
      const tempB = b[i]; b[i] = b[maxRow]; b[maxRow] = tempB;

      for (let k = i + 1; k < n; k++) {
        const c = A[k][i] / A[i][i];
        for (let j = i; j < n; j++) {
          A[k][j] -= c * A[i][j];
        }
        b[k] -= c * b[i];
      }
    }

    const h = new Array(8);
    for (let i = n - 1; i >= 0; i--) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) sum += A[i][j] * h[j];
      h[i] = (b[i] - sum) / A[i][i];
    }

    return [
      [h[0], h[1], h[2]],
      [h[3], h[4], h[5]],
      [h[6], h[7], 1]
    ];
  }

  /**
   * Warps a perspective quadrilateral into a rectangular canvas.
   *
   * Uses a fine 24x24 perspective mesh (1152 triangles) mapped with the
   * mathematically exact 8-DOF projective homography equation.
   * This eliminates the 2-triangle affine kink, preserving perfectly straight
   * lines and text geometry across the full document with native GPU acceleration.
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

    // True projective homography mapping destination [0..dstW, 0..dstH] to source [p0, p1, p2, p3]
    const dstQuad = [
      { x: 0, y: 0 },
      { x: dstW, y: 0 },
      { x: dstW, y: dstH },
      { x: 0, y: dstH }
    ];
    const srcQuad = [p0, p1, p2, p3];

    // Compute H mapping dst -> src
    const H = this.getPerspectiveTransform(dstQuad, srcQuad);

    // Apply via 24x24 perspective grid subdivision
    const GRID_SIZE = 24;
    const cellW = dstW / GRID_SIZE;
    const cellH = dstH / GRID_SIZE;

    // Helper to evaluate exact homography at (dx, dy)
    const mapDstToSrc = (dx: number, dy: number) => {
      const denom = H[2][0] * dx + H[2][1] * dy + 1;
      return {
        x: (H[0][0] * dx + H[0][1] * dy + H[0][2]) / denom,
        y: (H[1][0] * dx + H[1][1] * dy + H[1][2]) / denom
      };
    };

    // Precalculate all grid vertex positions
    const gridPoints: { x: number; y: number }[][] = [];
    for (let gy = 0; gy <= GRID_SIZE; gy++) {
      gridPoints[gy] = [];
      const dy = gy * cellH;
      for (let gx = 0; gx <= GRID_SIZE; gx++) {
        const dx = gx * cellW;
        gridPoints[gy][gx] = mapDstToSrc(dx, dy);
      }
    }

    // Render each cell as 2 micro-triangles
    for (let gy = 0; gy < GRID_SIZE; gy++) {
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        const d00 = { x: gx * cellW, y: gy * cellH };
        const d10 = { x: (gx + 1) * cellW, y: gy * cellH };
        const d01 = { x: gx * cellW, y: (gy + 1) * cellH };
        const d11 = { x: (gx + 1) * cellW, y: (gy + 1) * cellH };

        const s00 = gridPoints[gy][gx];
        const s10 = gridPoints[gy][gx + 1];
        const s01 = gridPoints[gy + 1][gx];
        const s11 = gridPoints[gy + 1][gx + 1];

        // Triangle 1: Top-Left
        this.renderTriangle(ctx, source, s00, s10, s01, d00, d10, d01);
        // Triangle 2: Bottom-Right
        this.renderTriangle(ctx, source, s10, s11, s01, d10, d11, d01);
      }
    }

    return outCanvas;
  }

  /**
   * Maps an individual triangle in source to destination using affine transform.
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
    const deltaF = s0.x * (s1.y * d2.x - s2.y * d1.x) - s1.x * (s0.y * d2.x - s2.y * d0.x) + s2.x * (s0.y * d1.x - s1.y * d0.x);

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
