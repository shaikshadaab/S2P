import { PDFDocument, rgb, degrees } from 'pdf-lib';
import * as crypto from 'crypto';
import { PaperSize, PrintOrientation, PrintColorMode } from '../types/order';
import { CardLayoutMode, DocumentGroup, PrintMasterSnapshot } from '../types/document-group';

export interface ImpositionAsset {
  data: Uint8Array | Buffer;
  mimeType: string;
  rotation?: number; // 0, 90, 180, 270
}

export interface ImpositionRequest {
  documentGroup?: DocumentGroup;
  frontAsset: ImpositionAsset;
  backAsset?: ImpositionAsset | null;
  paperSize?: PaperSize;
  layoutMode: CardLayoutMode;
  orientation?: PrintOrientation;
  colorMode?: PrintColorMode;
  copies?: number;
}

export interface ImpositionResult {
  pdfBytes: Uint8Array;
  sha256: string;
  pageCount: number;
  sizeBytes: number;
  layoutVersion: string;
  layoutMode: CardLayoutMode;
}

// Paper dimensions in points (72 pt per inch)
const PAPER_DIMENSIONS: Record<PaperSize, [number, number]> = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
  LETTER: [612, 792],
  LEGAL: [612, 1008],
  PHOTO_4X6: [288, 432]
};

export class ImpositionEngine {
  public static readonly VERSION = 'v1.0';

  /**
   * Deterministically generates an immutable PRINT MASTER PDF
   */
  public static async generatePrintMaster(request: ImpositionRequest): Promise<ImpositionResult> {
    const pdfDoc = await PDFDocument.create();
    const paperSize = request.paperSize || 'A4';
    const [rawWidth, rawHeight] = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.A4;

    const isLandscape = request.orientation === 'LANDSCAPE';
    const pageWidth = isLandscape ? Math.max(rawWidth, rawHeight) : Math.min(rawWidth, rawHeight);
    const pageHeight = isLandscape ? Math.min(rawWidth, rawHeight) : Math.max(rawWidth, rawHeight);

    // Embed front image
    const frontImg = await this.embedAsset(pdfDoc, request.frontAsset);
    let backImg = null;
    if (request.backAsset && request.backAsset.data.length > 0) {
      backImg = await this.embedAsset(pdfDoc, request.backAsset);
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    switch (request.layoutMode) {
      case 'SMALL_CARD': {
        // Standard ID Card dimension: ~85.6mm x 54mm = 242.6 pt x 153.1 pt
        const targetW = 242.6;
        const targetH = 153.1;
        this.renderCardImposition(page, frontImg, backImg, targetW, targetH, pageWidth, pageHeight, 'Side-by-Side (Small Card)');
        break;
      }

      case 'LARGE_CARD': {
        // Larger half-page Card dimension: ~135mm x 90mm = 382.7 pt x 255.1 pt
        const targetW = 380.0;
        const targetH = 250.0;
        this.renderCardImposition(page, frontImg, backImg, targetW, targetH, pageWidth, pageHeight, 'Side-by-Side (Large Card)');
        break;
      }

      case 'FIT_PAGE':
      case 'ORIGINAL':
      default: {
        // Full Page Document placement preserving margins
        const margin = 20;
        const availableW = pageWidth - margin * 2;
        const availableH = pageHeight - margin * 2;

        if (frontImg && backImg) {
          // Two sides stacked or side-by-side to fit page
          const halfH = (availableH - 20) / 2;
          this.drawImageFitted(page, frontImg, margin, pageHeight - margin - halfH, availableW, halfH);
          this.drawImageFitted(page, backImg, margin, margin, availableW, halfH);
        } else if (frontImg) {
          this.drawImageFitted(page, frontImg, margin, margin, availableW, availableH);
        }
        break;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const sha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');

    return {
      pdfBytes,
      sha256,
      pageCount: pdfDoc.getPageCount(),
      sizeBytes: pdfBytes.length,
      layoutVersion: this.VERSION,
      layoutMode: request.layoutMode
    };
  }

  private static renderCardImposition(
    page: any,
    frontImg: any,
    backImg: any,
    cardW: number,
    cardH: number,
    pageW: number,
    pageH: number,
    label: string
  ): void {
    const spacing = 24;

    if (frontImg && backImg) {
      // Check if side-by-side fits page width
      const totalW = cardW * 2 + spacing;
      if (totalW <= pageW - 40) {
        // Side-by-side placement
        const startX = (pageW - totalW) / 2;
        const centerY = (pageH - cardH) / 2;

        // Front Card
        this.renderCardSlot(page, frontImg, startX, centerY, cardW, cardH, 'FRONT');
        // Back Card
        this.renderCardSlot(page, backImg, startX + cardW + spacing, centerY, cardW, cardH, 'BACK');
      } else {
        // Stacked placement (Top & Bottom)
        const totalH = cardH * 2 + spacing;
        const startY = (pageH - totalH) / 2;
        const centerX = (pageW - cardW) / 2;

        // Front Card (Top)
        this.renderCardSlot(page, frontImg, centerX, startY + cardH + spacing, cardW, cardH, 'FRONT');
        // Back Card (Bottom)
        this.renderCardSlot(page, backImg, centerX, startY, cardW, cardH, 'BACK');
      }
    } else if (frontImg) {
      // Single card centered
      const centerX = (pageW - cardW) / 2;
      const centerY = (pageH - cardH) / 2;
      this.renderCardSlot(page, frontImg, centerX, centerY, cardW, cardH, 'FRONT');
    }
  }

  private static renderCardSlot(
    page: any,
    img: any,
    x: number,
    y: number,
    targetW: number,
    targetH: number,
    tag: string
  ): void {
    // Draw subtle cut-border / alignment guides (light gray)
    page.drawRectangle({
      x: x - 1,
      y: y - 1,
      width: targetW + 2,
      height: targetH + 2,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 0.5
    });

    // Draw the image fitted inside slot preserving aspect ratio
    this.drawImageFitted(page, img, x, y, targetW, targetH);
  }

  private static drawImageFitted(
    page: any,
    img: any,
    boxX: number,
    boxY: number,
    boxW: number,
    boxH: number
  ): void {
    const imgAspect = img.width / img.height;
    const boxAspect = boxW / boxH;

    let drawW: number;
    let drawH: number;

    if (imgAspect > boxAspect) {
      drawW = boxW;
      drawH = boxW / imgAspect;
    } else {
      drawH = boxH;
      drawW = boxH * imgAspect;
    }

    const offsetX = boxX + (boxW - drawW) / 2;
    const offsetY = boxY + (boxH - drawH) / 2;

    page.drawImage(img, {
      x: offsetX,
      y: offsetY,
      width: drawW,
      height: drawH
    });
  }

  private static async embedAsset(pdfDoc: PDFDocument, asset: ImpositionAsset): Promise<any> {
    const mime = asset.mimeType.toLowerCase();
    const isPng = mime.includes('png') || (asset.data[0] === 0x89 && asset.data[1] === 0x50);
    const isJpg = mime.includes('jpeg') || mime.includes('jpg') || (asset.data[0] === 0xff && asset.data[1] === 0xd8);

    if (isPng) {
      return await pdfDoc.embedPng(asset.data);
    } else if (isJpg) {
      return await pdfDoc.embedJpg(asset.data);
    } else {
      // Fallback: Try embedding as PNG first, then JPG
      try {
        return await pdfDoc.embedPng(asset.data);
      } catch {
        return await pdfDoc.embedJpg(asset.data);
      }
    }
  }
}
