import {
  ImageEditingMode,
  PrintQualityLevel,
  PrintQualityReport,
  AutoDetectionResult
} from './image-enhancement-types';

export const STANDARD_PHYSICAL_SIZES_MM = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  LEGAL: { width: 215.9, height: 355.6 },
  PASSPORT_IN: { width: 35, height: 45 },
  PASSPORT_US: { width: 50.8, height: 50.8 },
  PHOTO_4X6: { width: 101.6, height: 152.4 },
  ID_CR80: { width: 85.6, height: 54.0 }
} as const;

export class ImageQualityAssessor {
  /**
   * Calculates effective print resolution (DPI)
   * Formula: (pixels / (mm / 25.4))
   */
  public static calculateEffectiveDpi(
    widthPx: number,
    heightPx: number,
    targetWidthMm: number,
    targetHeightMm: number
  ): number {
    if (widthPx <= 0 || heightPx <= 0 || targetWidthMm <= 0 || targetHeightMm <= 0) {
      return 0;
    }

    const widthInches = targetWidthMm / 25.4;
    const heightInches = targetHeightMm / 25.4;

    const dpiX = widthPx / widthInches;
    const dpiY = heightPx / heightInches;

    return Math.round(Math.min(dpiX, dpiY));
  }

  /**
   * Evaluates print quality and returns user-friendly warnings
   */
  public static assessPrintQuality(
    widthPx: number,
    heightPx: number,
    targetWidthMm: number,
    targetHeightMm: number
  ): PrintQualityReport {
    const effectiveDpi = this.calculateEffectiveDpi(widthPx, heightPx, targetWidthMm, targetHeightMm);

    let level: PrintQualityLevel;
    let warningMessage: string | null = null;
    let recommendation: string | null = null;

    if (effectiveDpi >= 300) {
      level = 'EXCELLENT';
      recommendation = 'Optimal resolution. Sharp text and photographic detail.';
    } else if (effectiveDpi >= 200) {
      level = 'GOOD';
      recommendation = 'Good print quality suitable for standard viewing distance.';
    } else if (effectiveDpi >= 150) {
      level = 'FAIR';
      warningMessage = 'Resolution is moderate. Fine text or small photos may look slightly soft.';
      recommendation = 'Acceptable for documents. For sharpest photos, consider a smaller output size.';
    } else {
      level = 'LOW_RESOLUTION';
      warningMessage = 'Low resolution: output may appear pixelated or blurry at this size.';
      recommendation = 'Suggest printing at a smaller physical size (e.g. 4x6 or A5) or providing a higher-resolution file.';
    }

    return {
      effectiveDpi,
      level,
      widthPx,
      heightPx,
      targetWidthMm,
      targetHeightMm,
      warningMessage,
      recommendation,
      isPrintable: widthPx > 0 && heightPx > 0 // Never silently block a valid print
    };
  }
}

export class ImageDetectionEngine {
  /**
   * Heuristic analysis of aspect ratio and metadata to suggest appropriate editing mode
   */
  public static detectImageMode(
    widthPx: number,
    heightPx: number,
    hints?: { filename?: string }
  ): AutoDetectionResult {
    const w = Math.max(1, widthPx);
    const h = Math.max(1, heightPx);
    const maxDim = Math.max(w, h);
    const minDim = Math.min(w, h);
    const ratio = maxDim / minDim;
    const isPortrait = h >= w;

    const name = (hints?.filename || '').toLowerCase();

    // 1. Check ID Card (CR80 ratio is ~1.586, ratio range 1.48 to 1.68)
    const hasCardName = /id|card|pan|aadhaar|aadhar|voter|dl|license|licence/i.test(name);
    if ((ratio >= 1.48 && ratio <= 1.68) || hasCardName) {
      const confidence = hasCardName ? 0.92 : 0.84;
      return {
        suggestedMode: 'ID_CARD',
        confidence,
        aspectRatio: Number(ratio.toFixed(3)),
        detectedDimensions: { width: w, height: h },
        explanation: 'Card-like dimensions detected (~1.58:1 ratio). Suggested ID Card Front/Back layout.',
        requiresManualChoice: confidence < 0.75
      };
    }

    // 2. Check Portrait / Passport (35x45 ratio is ~1.286, ratio range 1.20 to 1.35)
    const hasPassportName = /passport|photo|pic|portrait|selfie|face|profile/i.test(name);
    if ((isPortrait && ratio >= 1.20 && ratio <= 1.38) || hasPassportName) {
      const confidence = hasPassportName ? 0.90 : 0.82;
      return {
        suggestedMode: 'PORTRAIT',
        confidence,
        aspectRatio: Number(ratio.toFixed(3)),
        detectedDimensions: { width: w, height: h },
        explanation: 'Portrait/Passport aspect ratio detected. Suggested Passport & Portrait photo editor.',
        requiresManualChoice: confidence < 0.75
      };
    }

    // 3. Check Document / Receipt (A4 ratio is ~1.414, ratio range 1.35 to 1.48)
    const hasDocName = /doc|bill|receipt|invoice|scan|form|page|paper|memo|slip/i.test(name);
    if ((ratio >= 1.35 && ratio <= 1.47) || hasDocName) {
      const confidence = hasDocName ? 0.94 : 0.86;
      return {
        suggestedMode: 'DOCUMENT',
        confidence,
        aspectRatio: Number(ratio.toFixed(3)),
        detectedDimensions: { width: w, height: h },
        explanation: 'Standard document aspect ratio detected (~1.41:1). Suggested Document Auto-Enhance.',
        requiresManualChoice: confidence < 0.75
      };
    }

    // 4. Default to General Photo
    return {
      suggestedMode: 'GENERAL_PHOTO',
      confidence: 0.70,
      aspectRatio: Number(ratio.toFixed(3)),
      detectedDimensions: { width: w, height: h },
      explanation: 'General photographic image. Suggested Photo Print & Grid editor.',
      requiresManualChoice: true
    };
  }
}
