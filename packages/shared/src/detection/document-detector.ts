import { DocumentClassification, CardLayoutMode, DocumentGroup, DocumentSide } from '../types/document-group';
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
      { x: 2, y: 2 },
      { x: width - 3, y: 2 },
      { x: 2, y: height - 3 },
      { x: width - 3, y: height - 3 }
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

    const cropW = Math.max(1, maxX - minX + 1);
    const cropH = Math.max(1, maxY - minY + 1);
    const ratio = Math.max(cropW, cropH) / Math.min(cropW, cropH);

    // Standard ID Card ratio = 85.6mm / 54mm = 1.585
    const cardDelta = Math.abs(ratio - 1.585);
    let classification: DocumentClassification = 'DOCUMENT_A4';
    let baseConfidence = 0.50;

    if (ratio >= 1.40 && ratio <= 1.80) {
      classification = 'CARD_SMALL';
      baseConfidence = Math.max(0.75, Math.min(0.98, 0.98 - cardDelta * 0.8));
    } else if (ratio >= 1.20 && ratio < 1.40) {
      classification = 'CARD_LARGE';
      baseConfidence = Math.max(0.70, Math.min(0.90, 0.90 - Math.abs(ratio - 1.30) * 0.8));
    } else {
      classification = 'DOCUMENT_A4';
      baseConfidence = Math.max(0.65, Math.min(0.92, 0.92 - Math.abs(ratio - 1.414) * 0.5));
    }

    const orientation: PrintOrientation = cropW >= cropH ? 'LANDSCAPE' : 'PORTRAIT';

    // Crop image into output PNG
    const croppedPng = new PNG({ width: cropW, height: cropH });
    PNG.bitblt(png, croppedPng, minX, minY, cropW, cropH, 0, 0);
    const croppedBuffer = PNG.sync.write(croppedPng);

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
      croppedBuffer
    };
  }

  /**
   * Evaluates whether two images belong together as Front & Back of the same document.
   * Completely ignores filename and evaluates purely on visual aspect ratio & dimension consistency.
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
   */
  public static analyzeAndGroupFiles(files: FileMetadataInput[]): DocumentGroup[] {
    if (!files || files.length === 0) return [];

    const groups: DocumentGroup[] = [];

    // Filter images vs PDFs
    const images = files.filter(f => f.mimeType.startsWith('image/'));
    const pdfs = files.filter(f => f.mimeType === 'application/pdf');

    // 1. Process PDFs
    for (const pdf of pdfs) {
      groups.push({
        id: `grp_${pdf.fileId}`,
        name: pdf.filename,
        front: {
          fileId: pdf.fileId,
          filename: pdf.filename,
          mimeType: pdf.mimeType,
          rotation: 0,
          confidence: 1.0
        },
        documentType: 'PDF_DOCUMENT',
        confidence: 1.0,
        layoutMode: 'FIT_PAGE',
        orientation: 'PORTRAIT',
        status: 'DETECTED'
      });
    }

    // 2. Process Images with Smart Pairing based on Image Dimensions / Analysis
    const unpairedImages = [...images];

    while (unpairedImages.length > 0) {
      if (unpairedImages.length >= 2) {
        const img1 = unpairedImages.shift()!;
        const img2 = unpairedImages.shift()!;

        // Analyze dimensions
        const ratio1 = (img1.width && img1.height) ? Math.max(img1.width, img1.height) / Math.min(img1.width, img1.height) : 1.585;
        const ratio2 = (img2.width && img2.height) ? Math.max(img2.width, img2.height) / Math.min(img2.width, img2.height) : 1.585;
        const ratioDiff = Math.abs(ratio1 - ratio2);

        // Check if pairing is valid (aspect ratio difference <= 0.20)
        if (ratioDiff <= 0.20) {
          const classification = this.classifyCardDimensions(img1.width, img1.height);
          const layoutMode: CardLayoutMode = classification === 'CARD_SMALL' ? 'SMALL_CARD' : 'LARGE_CARD';

          // Derived dynamic confidence (NOT hardcoded 0.95)
          const derivedConfidence = Number((0.96 - ratioDiff * 0.5).toFixed(3));

          groups.push({
            id: `grp_${img1.fileId}_${img2.fileId}`,
            name: 'ID / Card Document',
            front: {
              fileId: img1.fileId,
              filename: img1.filename,
              mimeType: img1.mimeType,
              rotation: 0,
              confidence: derivedConfidence
            },
            back: {
              fileId: img2.fileId,
              filename: img2.filename,
              mimeType: img2.mimeType,
              rotation: 0,
              confidence: derivedConfidence
            },
            documentType: classification,
            confidence: derivedConfidence,
            layoutMode,
            orientation: 'PORTRAIT',
            status: 'DETECTED'
          });
        } else {
          // Unrelated images! Do NOT pair. Create separate group for img1, put img2 back to process
          const classification = this.classifyCardDimensions(img1.width, img1.height);
          const layoutMode: CardLayoutMode = classification === 'CARD_SMALL' ? 'SMALL_CARD' : 'FIT_PAGE';
          const derivedConfidence = 0.70;

          groups.push({
            id: `grp_${img1.fileId}`,
            name: img1.filename,
            front: {
              fileId: img1.fileId,
              filename: img1.filename,
              mimeType: img1.mimeType,
              rotation: 0,
              confidence: derivedConfidence
            },
            documentType: classification,
            confidence: derivedConfidence,
            layoutMode,
            orientation: 'PORTRAIT',
            status: 'DETECTED'
          });

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
            confidence: 0.85
          },
          documentType: classification,
          confidence: 0.85,
          layoutMode,
          orientation: 'PORTRAIT',
          status: 'DETECTED'
        });
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
    return 'DOCUMENT_A4';
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

  public static rotateSide(side: DocumentSide): DocumentSide {
    const nextRot = ((side.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    return {
      ...side,
      rotation: nextRot
    };
  }
}
