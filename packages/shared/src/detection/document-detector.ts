import {
  DocumentClassification,
  CardLayoutMode,
  DocumentGroup,
  DocumentSide,
  QualityScore,
  PrintReadinessScore,
  CustomerPrintMode
} from '../types/document-group';
import { PrintOrientation } from '../types/order';
// @ts-ignore
import { PNG } from 'pngjs';

export interface FileMetadataInput {
  fileId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  sha256?: string;
  buffer?: Buffer;
}

export interface CropBoundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DocumentAnalysisResult {
  inputWidth: number;
  inputHeight: number;
  detectedCrop: CropBoundary;
  outputWidth: number;
  outputHeight: number;
  aspectRatio: number;
  classification: DocumentClassification;
  confidence: number;
  orientation: PrintOrientation;
  croppedBuffer?: Buffer;
  qualityScore?: QualityScore;
  blurScore?: number;
  hasGlare?: boolean;
  isBlank?: boolean;
  estimatedDpi?: number;
  readinessScore?: PrintReadinessScore;
  warning?: string;
}

export interface PairingResult {
  isPair: boolean;
  confidence: number;
  reason?: string;
}

export class SmartDocumentDetector {
  /**
   * Analyzes an image buffer to detect document boundaries against surrounding background
   */
  public static detectBoundaryFromPng(pngBuffer: Buffer): DocumentAnalysisResult {
    const png = PNG.sync.read(pngBuffer);
    const { width, height, data } = png;

    // 1. Sample background color from image corners (top-left, top-right, bottom-left, bottom-right)
    const corners = [
      { x: Math.min(2, width - 1), y: Math.min(2, height - 1) },
      { x: Math.max(0, width - 3), y: Math.min(2, height - 1) },
      { x: Math.min(2, width - 1), y: Math.max(0, height - 3) },
      { x: Math.max(0, width - 3), y: Math.max(0, height - 3) }
    ];

    let bgR = 0, bgG = 0, bgB = 0;
    for (const c of corners) {
      const idx = (width * c.y + c.x) << 2;
      bgR += data[idx];
      bgG += data[idx + 1];
      bgB += data[idx + 2];
    }
    bgR = Math.round(bgR / corners.length);
    bgG = Math.round(bgG / corners.length);
    bgB = Math.round(bgB / corners.length);

    // 2. Find bounding box of pixels that differ from background (color delta > 35)
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let foregroundPixelCount = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
        if (diff > 35) { // Foreground document pixel
          foregroundPixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Fallback if whole image is document
    if (minX >= maxX || minY >= maxY || foregroundPixelCount < 50) {
      minX = 0;
      minY = 0;
      maxX = width - 1;
      maxY = height - 1;
    }

    // Safety margin (auto crop padding: 2px)
    // Exact bounding box
    const margin = 0;
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(width - 1, maxX + margin);
    maxY = Math.min(height - 1, maxY + margin);

    const cropW = Math.max(1, maxX - minX + 1);
    const cropH = Math.max(1, maxY - minY + 1);
    const ratio = Math.max(cropW, cropH) / Math.min(cropW, cropH);

    // Standard ID Card ratio = 85.6mm / 54mm = 1.585
    const cardDelta = Math.abs(ratio - 1.585);
    let classification: DocumentClassification = 'DOCUMENT_PAGE';
    let baseConfidence = 0.50;

    if (ratio >= 1.40 && ratio <= 1.80) {
      classification = 'CARD_SMALL';
      baseConfidence = Math.max(0.75, Math.min(0.98, 0.98 - cardDelta * 0.8));
    } else if (ratio >= 1.20 && ratio < 1.40) {
      classification = 'CARD_LARGE';
      baseConfidence = Math.max(0.70, Math.min(0.90, 0.90 - Math.abs(ratio - 1.30) * 0.8));
    } else if (ratio > 2.2) {
      classification = 'DOCUMENT_PAGE'; // Tall scroll screenshot
      baseConfidence = 0.85;
    } else {
      classification = 'DOCUMENT_PAGE';
      baseConfidence = Math.max(0.65, Math.min(0.92, 0.92 - Math.abs(ratio - 1.414) * 0.5));
    }

    const orientation: PrintOrientation = cropW >= cropH ? 'LANDSCAPE' : 'PORTRAIT';

    // Crop image into output PNG
    const croppedPng = new PNG({ width: cropW, height: cropH });
    PNG.bitblt(png, croppedPng, minX, minY, cropW, cropH, 0, 0);
    const croppedBuffer = PNG.sync.write(croppedPng);

    // Additional Quality Checks
    const blurResult = this.detectBlur(croppedBuffer);
    const glareResult = this.detectGlare(croppedBuffer);
    const blankResult = this.detectBlankPage(croppedBuffer);
    const dpiResult = this.assessResolutionDpi(cropW, cropH, classification === 'CARD_SMALL' ? 'CARD_SMALL' : 'A4');
    const readiness = this.evaluatePrintReadiness({
      isBlank: blankResult.isBlank,
      qualityScore: blurResult.quality,
      hasGlare: glareResult.hasGlare,
      isPrintable: dpiResult.isPrintable
    });

    const warnings: string[] = [];
    if (blankResult.warning) warnings.push(blankResult.warning);
    if (blurResult.warning) warnings.push(blurResult.warning);
    if (glareResult.warning) warnings.push(glareResult.warning);
    if (dpiResult.warning) warnings.push(dpiResult.warning);

    return {
      inputWidth: width,
      inputHeight: height,
      detectedCrop: { x: minX, y: minY, width: cropW, height: cropH },
      outputWidth: cropW,
      outputHeight: cropH,
      aspectRatio: Number(ratio.toFixed(3)),
      classification,
      confidence: Number(baseConfidence.toFixed(3)),
      orientation,
      croppedBuffer,
      qualityScore: blurResult.quality,
      blurScore: blurResult.score,
      hasGlare: glareResult.hasGlare,
      isBlank: blankResult.isBlank,
      estimatedDpi: dpiResult.estimatedDpi,
      readinessScore: readiness.readiness,
      warning: warnings.length > 0 ? warnings.join(' | ') : undefined
    };
  }

  /**
   * Section J: Blur Detection
   * Evaluates high-frequency pixel gradient changes across luminance channel.
   */
  public static detectBlur(pngBuffer: Buffer): { score: number; quality: QualityScore; warning?: string } {
    try {
      const png = PNG.sync.read(pngBuffer);
      const { width, height, data } = png;
      if (width < 3 || height < 3) {
        return { score: 10, quality: 'GOOD' };
      }

      let totalGradient = 0;
      let count = 0;

      // Sample rows and columns to compute mean luminance gradient
      const step = Math.max(1, Math.floor(Math.min(width, height) / 100));
      for (let y = 1; y < height - 1; y += step) {
        for (let x = 1; x < width - 1; x += step) {
          const idx = (width * y + x) << 2;
          const idxRight = (width * y + (x + 1)) << 2;
          const idxDown = (width * (y + 1) + x) << 2;

          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          const lumRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];
          const lumDown = 0.299 * data[idxDown] + 0.587 * data[idxDown + 1] + 0.114 * data[idxDown + 2];

          totalGradient += Math.abs(lum - lumRight) + Math.abs(lum - lumDown);
          count++;
        }
      }

      const meanGradient = count > 0 ? totalGradient / count : 10;
      const score = Number((meanGradient).toFixed(1));

      if (meanGradient >= 8.0) {
        return { score, quality: 'GOOD' };
      } else if (meanGradient >= 4.0) {
        return { score, quality: 'ACCEPTABLE' };
      } else if (meanGradient >= 2.0) {
        return {
          score,
          quality: 'LOW_QUALITY',
          warning: 'Slight blur detected on document.'
        };
      } else {
        return {
          score,
          quality: 'RETAKE_RECOMMENDED',
          warning: 'Significant blur detected. Retaking the photo may give a clearer print.'
        };
      }
    } catch {
      return { score: 10, quality: 'GOOD' };
    }
  }

  /**
   * Section I: Glare Detection
   * Detects severe overexposed specular reflection patches.
   */
  public static detectGlare(pngBuffer: Buffer): { hasGlare: boolean; glareRatio: number; warning?: string } {
    try {
      const png = PNG.sync.read(pngBuffer);
      const { width, height, data } = png;
      const totalPixels = width * height;
      if (totalPixels < 10) return { hasGlare: false, glareRatio: 0 };

      let glarePixels = 0;
      let nearWhitePixels = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 240 && g > 240 && b > 240) {
          nearWhitePixels++;
          if (r > 252 && g > 252 && b > 252) {
            glarePixels++;
          }
        }
      }

      const glareRatio = glarePixels / totalPixels;
      const whiteRatio = nearWhitePixels / totalPixels;

      // Glare patch is a localized overexposed region inside a document that is not purely a blank page
      const hasGlare = glareRatio >= 0.04 && whiteRatio < 0.92;
      return {
        hasGlare,
        glareRatio: Number(glareRatio.toFixed(3)),
        warning: hasGlare ? 'Reflection detected on this document. Retaking the photo may give a clearer print.' : undefined
      };
    } catch {
      return { hasGlare: false, glareRatio: 0 };
    }
  }

  /**
   * Section K: Resolution / DPI Printability
   */
  public static assessResolutionDpi(
    width: number,
    height: number,
    targetPaper: 'A4' | 'CARD_SMALL' | 'PHOTO_4X6' = 'A4'
  ): { estimatedDpi: number; isPrintable: boolean; warning?: string } {
    let targetInchesW = 8.27;
    let targetInchesH = 11.69;

    if (targetPaper === 'CARD_SMALL') {
      targetInchesW = 3.37;
      targetInchesH = 2.125;
    } else if (targetPaper === 'PHOTO_4X6') {
      targetInchesW = 4.0;
      targetInchesH = 6.0;
    }

    const maxDim = Math.max(width, height);
    const maxTargetDim = Math.max(targetInchesW, targetInchesH);
    const estimatedDpi = Math.round(maxDim / maxTargetDim);

    if (estimatedDpi < 100) {
      return {
        estimatedDpi,
        isPrintable: false,
        warning: `This image has low resolution (${estimatedDpi} DPI) and may look blurry at ${targetPaper} size.`
      };
    } else if (estimatedDpi < 150) {
      return {
        estimatedDpi,
        isPrintable: true,
        warning: `This image (${estimatedDpi} DPI) may look slightly soft at ${targetPaper} size.`
      };
    } else {
      return {
        estimatedDpi,
        isPrintable: true
      };
    }
  }

  /**
   * Section M: Blank Page Detection
   */
  public static detectBlankPage(pngBuffer: Buffer): { isBlank: boolean; whiteRatio: number; warning?: string } {
    try {
      const png = PNG.sync.read(pngBuffer);
      const { width, height, data } = png;
      const totalPixels = width * height;
      if (totalPixels < 10) return { isBlank: false, whiteRatio: 0 };

      let whitePixels = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 245 && g > 245 && b > 245) {
          whitePixels++;
        }
      }

      const whiteRatio = whitePixels / totalPixels;
      const isBlank = whiteRatio > 0.990;

      return {
        isBlank,
        whiteRatio: Number(whiteRatio.toFixed(3)),
        warning: isBlank ? 'This page appears blank.' : undefined
      };
    } catch {
      return { isBlank: false, whiteRatio: 0 };
    }
  }

  /**
   * Section N: Duplicate File Detection
   */
  public static detectDuplicateFiles(
    files: Array<{ fileId: string; sha256?: string; filename?: string }>
  ): Array<{ fileId1: string; fileId2: string; reason: string }> {
    const duplicates: Array<{ fileId1: string; fileId2: string; reason: string }> = [];
    const shaMap = new Map<string, string>();

    for (const f of files) {
      if (!f.sha256) continue;
      if (shaMap.has(f.sha256)) {
        duplicates.push({
          fileId1: shaMap.get(f.sha256)!,
          fileId2: f.fileId,
          reason: 'Identical SHA-256 checksum detected (Exact duplicate file).'
        });
      } else {
        shaMap.set(f.sha256, f.fileId);
      }
    }

    return duplicates;
  }

  /**
   * Section Z: Print Readiness Evaluation
   */
  public static evaluatePrintReadiness(input: {
    isBlank?: boolean;
    qualityScore?: QualityScore;
    hasGlare?: boolean;
    isPrintable?: boolean;
    isDuplicate?: boolean;
  }): { readiness: PrintReadinessScore; reason: string } {
    if (input.isBlank) {
      return { readiness: 'NEEDS_CONFIRMATION', reason: 'Blank page detected. Customer confirmation required.' };
    }
    if (input.isDuplicate) {
      return { readiness: 'NEEDS_CONFIRMATION', reason: 'Duplicate upload detected. Customer confirmation required.' };
    }
    if (input.qualityScore === 'RETAKE_RECOMMENDED') {
      return { readiness: 'NEEDS_CONFIRMATION', reason: 'Severe blur detected. Customer confirmation advised.' };
    }
    if (input.hasGlare || input.qualityScore === 'LOW_QUALITY' || input.isPrintable === false) {
      return { readiness: 'READY_WITH_WARNING', reason: 'Minor quality warning detected. Print ready with warning.' };
    }
    return { readiness: 'READY', reason: 'Document passes all print readiness criteria.' };
  }

  /**
   * Evaluates whether two images belong together as Front & Back of the same document.
   */
  public static evaluatePairing(
    img1: DocumentAnalysisResult,
    img2: DocumentAnalysisResult
  ): PairingResult {
    // 1. Check classification match
    if (img1.classification !== img2.classification) {
      return {
        isPair: false,
        confidence: 0.20,
        reason: `Classification mismatch: ${img1.classification} vs ${img2.classification}`
      };
    }

    // 2. Aspect ratio difference
    const ratioDiff = Math.abs(img1.aspectRatio - img2.aspectRatio);
    if (ratioDiff > 0.18) {
      return {
        isPair: false,
        confidence: Number((0.40 - ratioDiff).toFixed(3)),
        reason: `Aspect ratio mismatch: ${img1.aspectRatio} vs ${img2.aspectRatio}`
      };
    }

    // 3. Dynamic confidence calculation derived from both image confidences and dimension consistency
    const avgConfidence = (img1.confidence + img2.confidence) / 2;
    const consistencyBonus = (1 - ratioDiff * 2);
    const calculatedPairConfidence = Math.max(0.60, Math.min(0.98, avgConfidence * consistencyBonus));

    return {
      isPair: true,
      confidence: Number(calculatedPairConfidence.toFixed(3)),
      reason: 'Aspect ratio and document geometry match standard ID card front/back'
    };
  }

  /**
   * Groups and classifies uploaded files into structured document groups
   * Respects explicit CustomerPrintMode ('DOCUMENTS' | 'IMAGES' | 'CARDS')
   */
  public static analyzeAndGroupFiles(
    files: FileMetadataInput[],
    preferredMode?: CustomerPrintMode
  ): DocumentGroup[] {
    if (!files || files.length === 0) return [];

    const groups: DocumentGroup[] = [];
    const duplicateList = this.detectDuplicateFiles(files);
    const duplicateIds = new Set(duplicateList.map(d => d.fileId2));

    // Filter images vs PDFs
    const images = files.filter(f => f.mimeType.startsWith('image/'));
    const pdfs = files.filter(f => f.mimeType === 'application/pdf');

    let currentSortOrder = 0;

    // 1. Process PDFs
    for (const pdf of pdfs) {
      const isDup = duplicateIds.has(pdf.fileId);
      groups.push({
        id: `grp_${pdf.fileId}`,
        name: pdf.filename,
        front: {
          fileId: pdf.fileId,
          filename: pdf.filename,
          mimeType: pdf.mimeType,
          rotation: 0,
          confidence: 1.0,
          sortOrder: currentSortOrder,
          isDuplicate: isDup,
          qualityScore: 'GOOD',
          qualityWarning: isDup ? 'Duplicate file detected' : undefined
        },
        documentType: 'PDF_DOCUMENT',
        confidence: 1.0,
        layoutMode: 'FIT_PAGE',
        orientation: 'PORTRAIT',
        status: 'DETECTED',
        sortOrder: currentSortOrder,
        readinessScore: isDup ? 'NEEDS_CONFIRMATION' : 'READY',
        readinessReason: isDup ? 'Duplicate upload' : 'PDF ready'
      });
      currentSortOrder++;
    }

    // 2. If preferredMode is 'IMAGES', treat each image individually (Normal Multi-Image Mode)
    if (preferredMode === 'IMAGES') {
      for (const img of images) {
        const isDup = duplicateIds.has(img.fileId);
        const ratio = (img.width && img.height) ? Math.max(img.width, img.height) / Math.min(img.width, img.height) : 1.414;
        const isTall = ratio > 2.2;
        const layout: CardLayoutMode = isTall ? 'SPLIT_ACROSS_PAGES' : 'ONE_PER_PAGE';

        groups.push({
          id: `grp_${img.fileId}`,
          name: img.filename,
          front: {
            fileId: img.fileId,
            filename: img.filename,
            mimeType: img.mimeType,
            rotation: 0,
            confidence: 0.90,
            sortOrder: currentSortOrder,
            isDuplicate: isDup,
            qualityScore: 'GOOD'
          },
          documentType: isTall ? 'DOCUMENT_PAGE' : 'PHOTO',
          confidence: 0.90,
          layoutMode: layout,
          orientation: (img.width && img.height && img.width > img.height) ? 'LANDSCAPE' : 'PORTRAIT',
          status: 'DETECTED',
          sortOrder: currentSortOrder,
          readinessScore: isDup ? 'NEEDS_CONFIRMATION' : 'READY'
        });
        currentSortOrder++;
      }
      return groups;
    }

    // 3. If preferredMode is 'DOCUMENTS', treat each image as a full page document
    if (preferredMode === 'DOCUMENTS') {
      for (const img of images) {
        const isDup = duplicateIds.has(img.fileId);
        groups.push({
          id: `grp_${img.fileId}`,
          name: img.filename,
          front: {
            fileId: img.fileId,
            filename: img.filename,
            mimeType: img.mimeType,
            rotation: 0,
            confidence: 0.90,
            sortOrder: currentSortOrder,
            isDuplicate: isDup,
            qualityScore: 'GOOD'
          },
          documentType: 'DOCUMENT_PAGE',
          confidence: 0.90,
          layoutMode: 'FIT_PAGE',
          orientation: (img.width && img.height && img.width > img.height) ? 'LANDSCAPE' : 'PORTRAIT',
          status: 'DETECTED',
          sortOrder: currentSortOrder,
          readinessScore: isDup ? 'NEEDS_CONFIRMATION' : 'READY'
        });
        currentSortOrder++;
      }
      return groups;
    }

    // 4. Default / 'CARDS' mode: Group consecutive card-like images
    const unpairedImages = [...images];

    while (unpairedImages.length > 0) {
      if (unpairedImages.length >= 2) {
        const img1 = unpairedImages.shift()!;
        const img2 = unpairedImages.shift()!;

        const ratio1 = (img1.width && img1.height) ? Math.max(img1.width, img1.height) / Math.min(img1.width, img1.height) : 1.585;
        const ratio2 = (img2.width && img2.height) ? Math.max(img2.width, img2.height) / Math.min(img2.width, img2.height) : 1.585;
        const ratioDiff = Math.abs(ratio1 - ratio2);

        // Check if pairing is valid: both have card-like ratios (1.2 to 1.8) and ratio difference <= 0.20
        const isCardLike1 = ratio1 >= 1.20 && ratio1 <= 1.85;
        const isCardLike2 = ratio2 >= 1.20 && ratio2 <= 1.85;

        if (ratioDiff <= 0.20 && (isCardLike1 || preferredMode === 'CARDS')) {
          const classification = this.classifyCardDimensions(img1.width, img1.height);
          const layoutMode: CardLayoutMode = classification === 'CARD_SMALL' ? 'SMALL_CARD' : 'LARGE_CARD';
          const derivedConfidence = Number((0.96 - ratioDiff * 0.5).toFixed(3));

          groups.push({
            id: `grp_${img1.fileId}_${img2.fileId}`,
            name: 'ID / Card Document',
            front: {
              fileId: img1.fileId,
              filename: img1.filename,
              mimeType: img1.mimeType,
              rotation: 0,
              confidence: derivedConfidence,
              sortOrder: currentSortOrder,
              qualityScore: 'GOOD'
            },
            back: {
              fileId: img2.fileId,
              filename: img2.filename,
              mimeType: img2.mimeType,
              rotation: 0,
              confidence: derivedConfidence,
              sortOrder: currentSortOrder + 1,
              qualityScore: 'GOOD'
            },
            documentType: classification,
            confidence: derivedConfidence,
            layoutMode,
            orientation: 'PORTRAIT',
            status: 'DETECTED',
            sortOrder: currentSortOrder,
            readinessScore: 'READY'
          });
          currentSortOrder += 2;
        } else {
          // Unrelated images! Do NOT pair.
          const classification = this.classifyCardDimensions(img1.width, img1.height);
          const layoutMode: CardLayoutMode = classification === 'CARD_SMALL' ? 'SMALL_CARD' : 'FIT_PAGE';

          groups.push({
            id: `grp_${img1.fileId}`,
            name: img1.filename,
            front: {
              fileId: img1.fileId,
              filename: img1.filename,
              mimeType: img1.mimeType,
              rotation: 0,
              confidence: 0.75,
              sortOrder: currentSortOrder,
              qualityScore: 'GOOD'
            },
            documentType: classification,
            confidence: 0.75,
            layoutMode,
            orientation: 'PORTRAIT',
            status: 'DETECTED',
            sortOrder: currentSortOrder,
            readinessScore: 'READY'
          });
          currentSortOrder++;
          unpairedImages.unshift(img2); // re-evaluate img2
        }
      } else {
        // Single remaining image
        const img = unpairedImages.shift()!;
        const classification = this.classifyCardDimensions(img.width, img.height);
        const layoutMode: CardLayoutMode = classification === 'CARD_SMALL' ? 'SMALL_CARD' : 'FIT_PAGE';

        groups.push({
          id: `grp_${img.fileId}`,
          name: img.filename,
          front: {
            fileId: img.fileId,
            filename: img.filename,
            mimeType: img.mimeType,
            rotation: 0,
            confidence: 0.85,
            sortOrder: currentSortOrder,
            qualityScore: 'GOOD'
          },
          documentType: classification,
          confidence: 0.85,
          layoutMode,
          orientation: 'PORTRAIT',
          status: 'DETECTED',
          sortOrder: currentSortOrder,
          readinessScore: 'READY'
        });
        currentSortOrder++;
      }
    }

    return groups;
  }

  private static classifyCardDimensions(w?: number, h?: number): DocumentClassification {
    if (!w || !h) return 'CARD_SMALL';
    const ratio = Math.max(w, h) / Math.min(w, h);
    if (ratio >= 1.4 && ratio <= 1.8) {
      return 'CARD_SMALL';
    } else if (ratio >= 1.2 && ratio < 1.4) {
      return 'CARD_LARGE';
    }
    return 'DOCUMENT_PAGE';
  }

  public static swapFrontBack(group: DocumentGroup): DocumentGroup {
    if (!group.back) return group;
    return {
      ...group,
      front: { ...group.back },
      back: { ...group.front },
      status: 'MANUALLY_CONFIRMED'
    };
  }

  /**
   * Section R & Customer UX: Break a pair into two independent document groups
   */
  public static ungroup(group: DocumentGroup): DocumentGroup[] {
    if (!group.back) return [group];

    const group1: DocumentGroup = {
      id: `grp_${group.front.fileId}`,
      name: group.front.filename || 'Item 1',
      front: { ...group.front },
      back: null,
      documentType: 'DOCUMENT_PAGE',
      confidence: 1.0,
      layoutMode: 'FIT_PAGE',
      orientation: group.orientation,
      status: 'MANUALLY_CONFIRMED',
      sortOrder: group.sortOrder ?? 0,
      readinessScore: 'READY'
    };

    const group2: DocumentGroup = {
      id: `grp_${group.back.fileId}`,
      name: group.back.filename || 'Item 2',
      front: { ...group.back },
      back: null,
      documentType: 'DOCUMENT_PAGE',
      confidence: 1.0,
      layoutMode: 'FIT_PAGE',
      orientation: group.orientation,
      status: 'MANUALLY_CONFIRMED',
      sortOrder: (group.sortOrder ?? 0) + 1,
      readinessScore: 'READY'
    };

    return [group1, group2];
  }

  /**
   * Section R & Customer UX: Group two independent single items into one Front/Back card group
   */
  public static groupAsPair(group1: DocumentGroup, group2: DocumentGroup): DocumentGroup {
    return {
      id: `grp_${group1.front.fileId}_${group2.front.fileId}`,
      name: 'ID / Card Document',
      front: { ...group1.front },
      back: { ...group2.front },
      documentType: 'CARD_SMALL',
      confidence: 1.0,
      layoutMode: 'SMALL_CARD',
      orientation: 'PORTRAIT',
      status: 'MANUALLY_CONFIRMED',
      sortOrder: group1.sortOrder ?? 0,
      readinessScore: 'READY'
    };
  }

  public static rotateSide(side: DocumentSide, degrees?: number): DocumentSide {
    const delta = degrees ?? 90;
    const nextRot = ((side.rotation + delta) % 360) as 0 | 90 | 180 | 270;
    return {
      ...side,
      rotation: nextRot
    };
  }

  public static resetCrop(side: DocumentSide): DocumentSide {
    return {
      ...side,
      crop: undefined
    };
  }
}
