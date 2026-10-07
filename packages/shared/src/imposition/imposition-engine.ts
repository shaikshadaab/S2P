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

export interface MultiImageImpositionRequest {
  assets: ImpositionAsset[];
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
  A2: [1190.55, 1683.78],
  A1: [1683.78, 2383.94],
  LETTER: [612, 792],
  LEGAL: [612, 1008],
  PHOTO_4X6: [288, 432],
  PASSPORT_PHOTO_SHEET: [288, 432]
};

export class ImpositionEngine {
  public static readonly VERSION = 'v1.0';

  /**
   * Deterministically generates an immutable PRINT MASTER PDF for 1-2 assets (e.g. Card Front/Back or Document)
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
      case 'PASSPORT_PHOTO_SHEET': {
        const photoCount = request.copies && [4, 6, 8].includes(request.copies) ? request.copies : 6;
        this.renderPassportPhotoSheet(page, frontImg, photoCount, pageWidth, pageHeight);
        break;
      }

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
      case 'ONE_PER_PAGE':
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

  /**
   * Deterministically generates an immutable PRINT MASTER PDF for Bulk Multi-Image Printing
   * Supports:
   * - ONE_PER_PAGE: N images -> N pages
   * - MULTI_UP_2: 2 images per sheet (ceil(N / 2) sheets)
   * - MULTI_UP_4: 4 images per sheet (ceil(N / 4) sheets)
   * - MULTI_UP_6: 6 images per sheet (ceil(N / 6) sheets)
   * - MULTI_UP_8: 8 images per sheet (ceil(N / 8) sheets)
   * - SPLIT_ACROSS_PAGES: Slices tall scroll screenshots across multiple A4 pages
   */
  public static async generateMultiImagePrintMaster(request: MultiImageImpositionRequest): Promise<ImpositionResult> {
    const pdfDoc = await PDFDocument.create();
    const paperSize = request.paperSize || 'A4';
    const [rawWidth, rawHeight] = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.A4;

    const isLandscape = request.orientation === 'LANDSCAPE';
    const pageWidth = isLandscape ? Math.max(rawWidth, rawHeight) : Math.min(rawWidth, rawHeight);
    const pageHeight = isLandscape ? Math.min(rawWidth, rawHeight) : Math.max(rawWidth, rawHeight);

    const assets = request.assets || [];
    if (assets.length === 0) {
      pdfDoc.addPage([pageWidth, pageHeight]);
      const pdfBytes = await pdfDoc.save();
      const sha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');
      return {
        pdfBytes,
        sha256,
        pageCount: 1,
        sizeBytes: pdfBytes.length,
        layoutVersion: this.VERSION,
        layoutMode: request.layoutMode
      };
    }

    // Embed all assets
    const embeddedImages: any[] = [];
    for (const asset of assets) {
      if (asset.data && asset.data.length > 0) {
        const img = await this.embedAsset(pdfDoc, asset);
        embeddedImages.push(img);
      }
    }

    if (request.layoutMode === 'SPLIT_ACROSS_PAGES') {
      // Split tall image(s) across multiple pages
      for (const img of embeddedImages) {
        const imgAspect = img.height / img.width;
        const pageAspect = pageHeight / pageWidth;
        const numSlices = imgAspect > 2.0 ? Math.min(6, Math.ceil(imgAspect / 1.4)) : 1;

        for (let sliceIdx = 0; sliceIdx < numSlices; sliceIdx++) {
          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          this.renderTallImageSlice(page, img, sliceIdx, numSlices, pageWidth, pageHeight);
        }
      }
    } else if (request.layoutMode === 'ONE_PER_PAGE') {
      // 1 image per page
      for (const img of embeddedImages) {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const margin = 20;
        this.drawImageFitted(page, img, margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);
      }
    } else {
      // Multi-up grid layouts (MULTI_UP_2, MULTI_UP_4, MULTI_UP_6, MULTI_UP_8)
      let cols = 2;
      let rows = 2;
      let itemsPerSheet = 4;

      if (request.layoutMode === 'MULTI_UP_2') {
        cols = 1;
        rows = 2;
        itemsPerSheet = 2;
      } else if (request.layoutMode === 'MULTI_UP_6') {
        cols = 2;
        rows = 3;
        itemsPerSheet = 6;
      } else if (request.layoutMode === 'MULTI_UP_8') {
        cols = 2;
        rows = 4;
        itemsPerSheet = 8;
      } else {
        // MULTI_UP_4 default
        cols = 2;
        rows = 2;
        itemsPerSheet = 4;
      }

      // Group images into sheets
      for (let i = 0; i < embeddedImages.length; i += itemsPerSheet) {
        const batch = embeddedImages.slice(i, i + itemsPerSheet);
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        this.renderMultiUpGrid(page, batch, cols, rows, pageWidth, pageHeight);
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

  /**
   * Multi-Up Grid Imposition: renders a batch of images in an aligned grid with margins and cut guides
   */
  private static renderMultiUpGrid(
    page: any,
    images: any[],
    cols: number,
    rows: number,
    pageW: number,
    pageH: number
  ): void {
    const margin = 24;
    const spacingX = 16;
    const spacingY = 16;

    const availableW = pageW - margin * 2 - (cols - 1) * spacingX;
    const availableH = pageH - margin * 2 - (rows - 1) * spacingY;

    const cellW = availableW / cols;
    const cellH = availableH / rows;

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (idx >= images.length) break;
        const img = images[idx];

        const x = margin + c * (cellW + spacingX);
        const y = pageH - margin - (r + 1) * cellH - r * spacingY;

        // Draw light gray cut guide
        page.drawRectangle({
          x: x - 1,
          y: y - 1,
          width: cellW + 2,
          height: cellH + 2,
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 0.5
        });

        // Draw image fitted inside cell
        this.drawImageFitted(page, img, x, y, cellW, cellH);
        idx++;
      }
    }
  }

  /**
   * Renders a vertical slice of a tall scroll screenshot onto an A4 page
   */
  private static renderTallImageSlice(
    page: any,
    img: any,
    sliceIdx: number,
    totalSlices: number,
    pageW: number,
    pageH: number
  ): void {
    const margin = 24;
    const availableW = pageW - margin * 2;
    const availableH = pageH - margin * 2;

    // Full scaled height if image width matched available width
    const scale = availableW / img.width;
    const fullRenderH = img.height * scale;
    const sliceRenderH = fullRenderH / totalSlices;

    // Center slice on page
    const startY = pageH - margin - sliceRenderH;

    // Draw slice border
    page.drawRectangle({
      x: margin - 1,
      y: margin - 1,
      width: availableW + 2,
      height: availableH + 2,
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 0.5
    });

    // Draw the image positioned so the current slice aligns inside viewport
    const imgYOffset = margin + (totalSlices - 1 - sliceIdx) * (availableH / totalSlices);
    this.drawImageFitted(page, img, margin, margin, availableW, availableH);
  }

  private static renderPassportPhotoSheet(
    page: any,
    img: any,
    photoCount: number,
    pageW: number,
    pageH: number
  ): void {
    if (!img) return;

    // Standard 35mm x 45mm = ~99.2 pt x 127.5 pt
    const photoW = 99.2;
    const photoH = 127.5;

    let cols = 2;
    let rows = 3;
    if (photoCount === 4) {
      cols = 2;
      rows = 2;
    } else if (photoCount === 8) {
      cols = pageW > pageH ? 4 : 2;
      rows = pageW > pageH ? 2 : 4;
    }

    const spacingX = 14;
    const spacingY = 14;
    const totalW = cols * photoW + (cols - 1) * spacingX;
    const totalH = rows * photoH + (rows - 1) * spacingY;

    const startX = Math.max(10, (pageW - totalW) / 2);
    const startY = Math.max(10, (pageH - totalH) / 2);

    let drawn = 0;
    for (let r = 0; r < rows && drawn < photoCount; r++) {
      for (let c = 0; c < cols && drawn < photoCount; c++) {
        const x = startX + c * (photoW + spacingX);
        const y = startY + (rows - 1 - r) * (photoH + spacingY);

        // Draw subtle cutting guide lines (light gray box)
        page.drawRectangle({
          x: x - 1,
          y: y - 1,
          width: photoW + 2,
          height: photoH + 2,
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 0.5
        });

        // Draw photo fitted
        this.drawImageFitted(page, img, x, y, photoW, photoH);
        drawn++;
      }
    }
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
    const mime = (asset.mimeType || '').toLowerCase();
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
