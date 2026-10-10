import {
  DocumentEnhanceMode,
  ImageProcessingSettings,
  PerspectiveCorners,
  CornerPoint
} from '@s2p/shared';
import { DocumentCornerDetector } from './document-corner-detector';

export class ImageEnhancementEngine {
  private static readonly MAX_SAFE_CANVAS_DIM = 2560;

  /**
   * Loads image element safely from blob or data URL
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
  public static detectDocumentCorners(
    canvas: HTMLCanvasElement
  ): PerspectiveCorners {
    return DocumentCornerDetector.detect(canvas).corners;
  }

  /**
   * Applies the complete pipeline: rotation, deskew, cropping, perspective homography,
   * background whitening, shadow reduction, color enhancement, and mild unsharp sharpening.
   */
  public static async processImage(
    sourceImg: HTMLImageElement,
    settings: ImageProcessingSettings
  ): Promise<HTMLCanvasElement> {
    // 1. Calculate bounded canvas dimensions for memory safety
    let origW = sourceImg.naturalWidth || sourceImg.width;
    let origH = sourceImg.naturalHeight || sourceImg.height;

    let scale = 1;
    if (Math.max(origW, origH) > this.MAX_SAFE_CANVAS_DIM) {
      scale = this.MAX_SAFE_CANVAS_DIM / Math.max(origW, origH);
      origW = Math.round(origW * scale);
      origH = Math.round(origH * scale);
    }

    // 2. Base canvas with rotation and straighten angle
    const baseCanvas = document.createElement('canvas');
    const isRotated90or270 = settings.rotation === 90 || settings.rotation === 270;
    const baseW = isRotated90or270 ? origH : origW;
    const baseH = isRotated90or270 ? origW : origH;

    baseCanvas.width = baseW;
    baseCanvas.height = baseH;

    const baseCtx = baseCanvas.getContext('2d');
    if (!baseCtx) throw new Error('Could not create 2D canvas context');

    baseCtx.save();
    baseCtx.translate(baseW / 2, baseH / 2);
    const totalRotationDeg = (settings.rotation + (settings.straightenAngle || 0));
    baseCtx.rotate((totalRotationDeg * Math.PI) / 180);
    baseCtx.drawImage(sourceImg, -origW / 2, -origH / 2, origW, origH);
    baseCtx.restore();

    // 3. Handle Perspective Warp vs Crop Box
    let croppedCanvas = document.createElement('canvas');
    if (settings.perspectiveCorners) {
      // Perspective Warp has priority for documents and scanned sheets
      croppedCanvas = DocumentCornerDetector.warpPerspective(baseCanvas, settings.perspectiveCorners, this.MAX_SAFE_CANVAS_DIM);
    } else if (settings.cropBox) {
      const cb = settings.cropBox;
      const cropX = Math.max(0, Math.round((cb.x / 100) * baseW));
      const cropY = Math.max(0, Math.round((cb.y / 100) * baseH));
      const cropW = Math.min(baseW - cropX, Math.round((cb.width / 100) * baseW));
      const cropH = Math.min(baseH - cropY, Math.round((cb.height / 100) * baseH));

      croppedCanvas.width = Math.max(10, cropW);
      croppedCanvas.height = Math.max(10, cropH);
      const cCtx = croppedCanvas.getContext('2d');
      if (cCtx) {
        cCtx.drawImage(baseCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      }
    } else {
      croppedCanvas = baseCanvas;
    }

    // 4. Pixel-level enhancement filters (Color, Grayscale, High Contrast, Shadow Reduction, Sharpen)
    const outCtx = croppedCanvas.getContext('2d');
    if (!outCtx) return croppedCanvas;

    const imgData = outCtx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height);
    const pixels = imgData.data;
    const len = pixels.length;

    const mode = settings.documentEnhanceMode;
    const isDoc = mode !== 'ORIGINAL';

    // A. Brightness & Contrast pre-multipliers
    const midpoint = isDoc ? 200 : 128;
    const brightnessFactor = (settings.brightness || 0) * 2.55;
    const contrastRatio = ((settings.contrast || 0) + 100) / 100;
    const contrastFactor = isDoc ? contrastRatio : (contrastRatio * contrastRatio);

    // B. White point & Shadow normalization factors
    const shadowReduction = Math.min(100, Math.max(0, settings.shadowReduction ?? 30));
    const shadowBoost = shadowReduction * 0.45;

    if (mode !== 'ORIGINAL') {
      for (let i = 0; i < len; i += 4) {
        let r = pixels[i];
        let g = pixels[i + 1];
        let b = pixels[i + 2];

        // Apply Brightness
        if (settings.brightness !== 0) {
          r = Math.min(255, Math.max(0, r + brightnessFactor));
          g = Math.min(255, Math.max(0, g + brightnessFactor));
          b = Math.min(255, Math.max(0, b + brightnessFactor));
        }

        // Apply Adaptive Document Contrast around midpoint
        if (settings.contrast !== 0) {
          r = Math.min(255, Math.max(0, (r - midpoint) * contrastFactor + midpoint));
          g = Math.min(255, Math.max(0, (g - midpoint) * contrastFactor + midpoint));
          b = Math.min(255, Math.max(0, (b - midpoint) * contrastFactor + midpoint));
        }

        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        // Shadow reduction: lifts mid-tone paper shadows towards clean white
        if (shadowBoost > 0 && luminance >= 160 && luminance < 225) {
          const lift = ((luminance - 160) / 65) * shadowBoost;
          r = Math.min(255, r + lift);
          g = Math.min(255, g + lift);
          b = Math.min(255, b + lift);
        }

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
        } else if (mode === 'COLOR_ENHANCED') {
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
        }
      }

      outCtx.putImageData(imgData, 0, 0);

      // C. Mild Sharpening Convolution (3x3 Unsharp Mask Kernel)
      const sharpenAmount = settings.sharpen ?? 20;
      if (sharpenAmount > 0) {
        this.applyMildSharpen(outCtx, croppedCanvas.width, croppedCanvas.height, sharpenAmount);
      }
    }

    return croppedCanvas;
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

      const factor = (amount / 100) * 0.4;
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
   * Exports the processed canvas to a JPEG Blob at 92% quality
   */
  public static async canvasToBlob(
    canvas: HTMLCanvasElement,
    quality = 0.92
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob conversion failed'));
        },
        'image/jpeg',
        quality
      );
    });
  }
}
