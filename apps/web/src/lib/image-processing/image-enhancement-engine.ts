import {
  DocumentEnhanceMode,
  ImageProcessingSettings,
  PerspectiveCorners,
  CornerPoint,
  BackgroundRemovalMode,
  CropAspectRatioPreset
} from '@s2p/shared';
import { DocumentCornerDetector } from './document-corner-detector';

export class ImageEnhancementEngine {
  private static readonly MAX_SAFE_CANVAS_DIM = 4096;

  /**
   * Loads image element safely from blob or data URL with crossOrigin support
   */
  public static async loadImage(source: string | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image for enhancement'));

      if (typeof source === 'string') {
        img.src = source;
      } else {
        img.src = URL.createObjectURL(source);
      }
    });
  }

  /**
   * Detects document corners (TL, TR, BR, BL) using computer vision edge detection
   */
  public static detectDocumentCorners(canvas: HTMLCanvasElement): PerspectiveCorners {
    return DocumentCornerDetector.detect(canvas).corners;
  }

  /**
   * Calculates aspect ratio factor for standard presets
   */
  public static getAspectRatioValue(preset?: CropAspectRatioPreset, originalRatio = 1): number | null {
    switch (preset) {
      case '1:1':
      case 'PASSPORT_2X2':
        return 1.0;
      case '4:6':
        return 4 / 6; // 0.6667
      case 'A4':
        return 210 / 297; // 0.707
      case 'PASSPORT_35X45':
        return 35 / 45; // 0.7778
      case 'STAMP_25X30':
        return 25 / 30; // 0.8333
      case 'ORIGINAL':
        return originalRatio;
      case 'FREE':
      default:
        return null;
    }
  }

  /**
   * Applies the complete pipeline at high fidelity:
   * 1. Geometry: Orientation, Flip (H/V), Rotate (0/90/180/270), Straighten, Zoom & Pan.
   * 2. Crop / Perspective Warp: Aspect ratio crop box or 4-corner homography warp.
   * 3. Background Segmentation & Replacement (Transparent, White, Light Blue, Custom).
   * 4. Quality & Enhancements: Brightness, Contrast, Saturation, Denoise, Shadow Flattening,
   *    Preservative Scan Mode (preserving stamps & faint marks), Unsharp Mask Sharpening.
   * 5. Optional 2x Bicubic Resampling / Digital Upscaler.
   */
  public static async processImage(
    sourceImg: HTMLImageElement,
    settings: ImageProcessingSettings,
    options?: {
      targetCanvas?: HTMLCanvasElement;
      maxDimension?: number;
      maskCanvas?: HTMLCanvasElement | null;
    }
  ): Promise<HTMLCanvasElement> {
    const maxDim = options?.maxDimension || this.MAX_SAFE_CANVAS_DIM;
    let origW = sourceImg.naturalWidth || sourceImg.width;
    let origH = sourceImg.naturalHeight || sourceImg.height;

    let scale = 1;
    if (Math.max(origW, origH) > maxDim) {
      scale = maxDim / Math.max(origW, origH);
      origW = Math.max(10, Math.round(origW * scale));
      origH = Math.max(10, Math.round(origH * scale));
    }

    // --- STEP 1: Orientation, Flip, Rotation & Zoom/Pan Base ---
    const isRotated90or270 = settings.rotation === 90 || settings.rotation === 270;
    const baseW = isRotated90or270 ? origH : origW;
    const baseH = isRotated90or270 ? origW : origH;

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = baseW;
    baseCanvas.height = baseH;

    const baseCtx = baseCanvas.getContext('2d');
    if (!baseCtx) throw new Error('Could not create 2D canvas context');

    baseCtx.save();
    baseCtx.translate(baseW / 2, baseH / 2);

    // Apply Zoom & Pan
    const zoom = Math.max(1, Math.min(3, settings.zoom || 1));
    const panX = (settings.pan?.x || 0) * (baseW / 100);
    const panY = (settings.pan?.y || 0) * (baseH / 100);
    baseCtx.translate(panX, panY);
    baseCtx.scale(zoom, zoom);

    // Apply Rotation & Straighten Angle
    const totalRotationDeg = (settings.rotation + (settings.straightenAngle || 0));
    baseCtx.rotate((totalRotationDeg * Math.PI) / 180);

    // Apply Flip Horizontal & Vertical
    const scaleX = settings.flipHorizontal ? -1 : 1;
    const scaleY = settings.flipVertical ? -1 : 1;
    baseCtx.scale(scaleX, scaleY);

    baseCtx.drawImage(sourceImg, -origW / 2, -origH / 2, origW, origH);
    baseCtx.restore();

    // --- STEP 2: Crop or Perspective Warp ---
    let croppedCanvas: HTMLCanvasElement;
    if (settings.perspectiveMode && settings.perspectiveCorners) {
      croppedCanvas = DocumentCornerDetector.warpPerspective(baseCanvas, settings.perspectiveCorners, maxDim);
    } else if (settings.cropBox) {
      const cb = settings.cropBox;
      const cropX = Math.max(0, Math.round((cb.x / 100) * baseW));
      const cropY = Math.max(0, Math.round((cb.y / 100) * baseH));
      const cropW = Math.min(baseW - cropX, Math.round((cb.width / 100) * baseW));
      const cropH = Math.min(baseH - cropY, Math.round((cb.height / 100) * baseH));

      croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = Math.max(10, cropW);
      croppedCanvas.height = Math.max(10, cropH);
      const cCtx = croppedCanvas.getContext('2d');
      if (cCtx) {
        cCtx.drawImage(baseCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      }
    } else {
      croppedCanvas = baseCanvas;
    }

    // --- STEP 3: Background Removal & Compositing ---
    if (settings.backgroundMode && settings.backgroundMode !== 'ORIGINAL') {
      croppedCanvas = this.applyBackgroundSegmentation(
        croppedCanvas,
        settings.backgroundMode,
        settings.customBackgroundColor || '#ffffff',
        settings.edgeRefinement ?? 2,
        options?.maskCanvas
      );
    }

    // --- STEP 4: Pixel-Level Adjustments (Brightness, Contrast, Saturation, Denoise, Sharpen) ---
    const outCtx = croppedCanvas.getContext('2d');
    if (!outCtx) return croppedCanvas;

    const imgData = outCtx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height);
    const pixels = imgData.data;
    const len = pixels.length;

    const mode = settings.documentEnhanceMode;
    const isDoc = mode !== 'ORIGINAL' || settings.scanMode;

    const midpoint = isDoc ? 200 : 128;
    const brightnessFactor = (settings.brightness || 0) * 2.55;
    const contrastRatio = ((settings.contrast || 0) + 100) / 100;
    const contrastFactor = isDoc ? contrastRatio : (contrastRatio * contrastRatio);
    const saturationFactor = 1 + ((settings.saturation || 0) / 100);

    const shadowReduction = Math.min(100, Math.max(0, settings.shadowReduction ?? (isDoc ? 35 : 0)));
    const shadowBoost = shadowReduction * 0.45;

    for (let i = 0; i < len; i += 4) {
      let r = pixels[i];
      let g = pixels[i + 1];
      let b = pixels[i + 2];
      const a = pixels[i + 3];

      if (a === 0) continue; // transparent pixel

      // A. Brightness
      if (settings.brightness !== 0) {
        r = Math.min(255, Math.max(0, r + brightnessFactor));
        g = Math.min(255, Math.max(0, g + brightnessFactor));
        b = Math.min(255, Math.max(0, b + brightnessFactor));
      }

      // B. Contrast
      if (settings.contrast !== 0) {
        r = Math.min(255, Math.max(0, (r - midpoint) * contrastFactor + midpoint));
        g = Math.min(255, Math.max(0, (g - midpoint) * contrastFactor + midpoint));
        b = Math.min(255, Math.max(0, (b - midpoint) * contrastFactor + midpoint));
      }

      // C. Saturation
      if (settings.saturation !== 0 && saturationFactor !== 1) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = Math.min(255, Math.max(0, lum + (r - lum) * saturationFactor));
        g = Math.min(255, Math.max(0, lum + (g - lum) * saturationFactor));
        b = Math.min(255, Math.max(0, lum + (b - lum) * saturationFactor));
      }

      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      // D. Shadow reduction: lifts mid-tone paper shadows towards clean white
      if (shadowBoost > 0 && luminance >= 160 && luminance < 225) {
        const lift = ((luminance - 160) / 65) * shadowBoost;
        r = Math.min(255, r + lift);
        g = Math.min(255, g + lift);
        b = Math.min(255, b + lift);
      }

      // E. Document Mode Filters
      if (mode === 'GRAYSCALE') {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        pixels[i] = gray;
        pixels[i + 1] = gray;
        pixels[i + 2] = gray;
      } else if (mode === 'HIGH_CONTRAST') {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Conservative high-contrast: keep faint pencil/ink
        const val = lum >= 180 ? 255 : Math.max(0, lum * 0.7);
        pixels[i] = val;
        pixels[i + 1] = val;
        pixels[i + 2] = val;
      } else if (mode === 'COLOR_ENHANCED' || settings.scanMode) {
        // Whiten paper background (luminance >= 215) while strictly preserving colored ink/stamps
        const updatedLum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (updatedLum >= 215) {
          const paperWhitening = ((updatedLum - 215) / 40) * 35;
          r = Math.min(255, r + paperWhitening);
          g = Math.min(255, g + paperWhitening);
          b = Math.min(255, b + paperWhitening);
        }
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
      } else {
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
      }
    }

    outCtx.putImageData(imgData, 0, 0);

    // F. Denoise Filter (3x3 Restrained Edge-Preserving Smoothing)
    if (settings.denoise && settings.denoise > 0) {
      this.applyRestrainedDenoise(outCtx, croppedCanvas.width, croppedCanvas.height, settings.denoise);
    }

    // G. Sharpening (3x3 Unsharp Mask)
    const sharpenAmount = settings.sharpen ?? (isDoc ? 25 : 10);
    if (sharpenAmount > 0) {
      this.applyMildSharpen(outCtx, croppedCanvas.width, croppedCanvas.height, sharpenAmount);
    }

    // H. Optional 2x Digital Upscale Resampling
    if (settings.upscale) {
      croppedCanvas = this.applyDigitalUpscale(croppedCanvas);
    }

    return croppedCanvas;
  }

  /**
   * Applies edge-guided background segmentation with transparent, white, or custom background
   */
  public static applyBackgroundSegmentation(
    canvas: HTMLCanvasElement,
    bgMode: BackgroundRemovalMode,
    customColorHex: string,
    edgeRefinement = 2,
    manualMaskCanvas?: HTMLCanvasElement | null
  ): HTMLCanvasElement {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imgData = ctx.getImageData(0, 0, w, h);
    const pixels = imgData.data;

    // Sample background color from four corners & top margin
    const sampleIndices = [
      0, // TL
      (w - 1) * 4, // TR
      ((h - 1) * w) * 4, // BL
      ((h - 1) * w + (w - 1)) * 4, // BR
      Math.round(w / 2) * 4 // Top center
    ];

    let avgBgR = 0;
    let avgBgG = 0;
    let avgBgB = 0;
    for (const idx of sampleIndices) {
      avgBgR += pixels[idx];
      avgBgG += pixels[idx + 1];
      avgBgB += pixels[idx + 2];
    }
    avgBgR = Math.round(avgBgR / sampleIndices.length);
    avgBgG = Math.round(avgBgG / sampleIndices.length);
    avgBgB = Math.round(avgBgB / sampleIndices.length);

    // Parse target replacement color
    let repR = 255;
    let repG = 255;
    let repB = 255;
    let repA = 255;

    if (bgMode === 'TRANSPARENT') {
      repA = 0;
    } else if (bgMode === 'LIGHT_BLUE') {
      repR = 219; repG = 234; repB = 254; // #dbeafe standard passport blue
    } else if (bgMode === 'OFF_WHITE') {
      repR = 248; repG = 250; repB = 252; // #f8fafc
    } else if (bgMode === 'CUSTOM' && customColorHex) {
      const hex = customColorHex.replace('#', '');
      if (hex.length === 6) {
        repR = parseInt(hex.substring(0, 2), 16) || 255;
        repG = parseInt(hex.substring(2, 4), 16) || 255;
        repB = parseInt(hex.substring(4, 6), 16) || 255;
      }
    }

    // Read manual brush mask if provided
    let manualMaskData: Uint8ClampedArray | null = null;
    if (manualMaskCanvas) {
      const maskCtx = manualMaskCanvas.getContext('2d');
      if (maskCtx) {
        manualMaskData = maskCtx.getImageData(0, 0, w, h).data;
      }
    }

    const threshold = 36;
    const len = pixels.length;

    for (let i = 0; i < len; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      // Distance from sampled background color
      const dist = Math.sqrt(
        (r - avgBgR) * (r - avgBgR) +
        (g - avgBgG) * (g - avgBgG) +
        (b - avgBgB) * (b - avgBgB)
      );

      let isBackground = dist < threshold;

      // Check manual mask override: Red channel > 128 = user erased (force bg); Green channel > 128 = user restored (force foreground)
      if (manualMaskData) {
        const maskR = manualMaskData[i];
        const maskG = manualMaskData[i + 1];
        if (maskR > 100) {
          isBackground = true;
        } else if (maskG > 100) {
          isBackground = false;
        }
      }

      if (isBackground) {
        if (repA === 0) {
          pixels[i + 3] = 0; // Transparent
        } else {
          // Feather soft blend
          const alphaFactor = Math.max(0, Math.min(1, dist / threshold));
          pixels[i] = Math.round(repR * (1 - alphaFactor) + r * alphaFactor);
          pixels[i + 1] = Math.round(repG * (1 - alphaFactor) + g * alphaFactor);
          pixels[i + 2] = Math.round(repB * (1 - alphaFactor) + b * alphaFactor);
          pixels[i + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  /**
   * Applies restrained 3x3 edge-preserving smoothing filter to reduce sensor grain
   */
  private static applyRestrainedDenoise(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    strength: number
  ) {
    try {
      const srcData = ctx.getImageData(0, 0, width, height);
      const src = srcData.data;
      const outData = ctx.createImageData(width, height);
      const out = outData.data;
      const blend = Math.min(0.6, (strength / 100) * 0.6);

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;

          for (let c = 0; c < 3; c++) {
            const mid = src[idx + c];
            const top = src[((y - 1) * width + x) * 4 + c];
            const bottom = src[((y + 1) * width + x) * 4 + c];
            const left = src[(y * width + (x - 1)) * 4 + c];
            const right = src[(y * width + (x + 1)) * 4 + c];

            const avgNeighbours = (top + bottom + left + right) / 4;
            // Only smooth if difference is small (restrained noise), keep hard text edges intact
            if (Math.abs(mid - avgNeighbours) < 32) {
              out[idx + c] = Math.round(mid * (1 - blend) + avgNeighbours * blend);
            } else {
              out[idx + c] = mid;
            }
          }
          out[idx + 3] = src[idx + 3];
        }
      }

      ctx.putImageData(outData, 0, 0);
    } catch {
      // Clean fallback
    }
  }

  /**
   * Applies mild 3x3 unsharp mask to crisp up text edges without halo artifacts
   */
  private static applyMildSharpen(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    amount: number
  ) {
    try {
      const srcData = ctx.getImageData(0, 0, width, height);
      const src = srcData.data;
      const outData = ctx.createImageData(width, height);
      const out = outData.data;

      const factor = (amount / 100) * 0.45;
      const center = 1 + (4 * factor);
      const edge = -factor;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;

          for (let c = 0; c < 3; c++) {
            const top = src[((y - 1) * width + x) * 4 + c];
            const bottom = src[((y + 1) * width + x) * 4 + c];
            const left = src[(y * width + (x - 1)) * 4 + c];
            const right = src[(y * width + (x + 1)) * 4 + c];
            const mid = src[idx + c];

            const sharpened = (mid * center) + (top + bottom + left + right) * edge;
            out[idx + c] = Math.min(255, Math.max(0, sharpened));
          }
          out[idx + 3] = src[idx + 3];
        }
      }

      ctx.putImageData(outData, 0, 0);
    } catch {
      // Fallback cleanly
    }
  }

  /**
   * Applies 2x high-resolution digital upscaling with high-quality smoothing
   */
  private static applyDigitalUpscale(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const upscaled = document.createElement('canvas');
    upscaled.width = Math.min(this.MAX_SAFE_CANVAS_DIM, sourceCanvas.width * 2);
    upscaled.height = Math.min(this.MAX_SAFE_CANVAS_DIM, sourceCanvas.height * 2);
    const ctx = upscaled.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sourceCanvas, 0, 0, upscaled.width, upscaled.height);
      this.applyMildSharpen(ctx, upscaled.width, upscaled.height, 20);
    }
    return upscaled;
  }

  /**
   * Exports the processed canvas to a JPEG or PNG Blob at specified quality
   */
  public static async canvasToBlob(
    canvas: HTMLCanvasElement,
    format: 'image/jpeg' | 'image/png' = 'image/jpeg',
    quality = 0.94
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob conversion failed'));
        },
        format,
        quality
      );
    });
  }
}
