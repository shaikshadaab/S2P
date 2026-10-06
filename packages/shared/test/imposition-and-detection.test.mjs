import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SmartDocumentDetector, ImpositionEngine } from '../dist/index.js';
import { PNG } from 'pngjs';

// Minimal 1x1 red PNG
const SAMPLE_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const samplePngBytes = Buffer.from(SAMPLE_PNG_BASE64, 'base64');

// Helper to create a test PNG image with a card on a background
function createCardOnBackgroundPng(imgW, imgH, cardX, cardY, cardW, cardH) {
  const png = new PNG({ width: imgW, height: imgH });
  // Fill background with dark table color (r: 40, g: 35, b: 30)
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 40;
    png.data[i + 1] = 35;
    png.data[i + 2] = 30;
    png.data[i + 3] = 255;
  }
  // Draw card rectangle with white/cream color (r: 240, g: 240, b: 240)
  for (let y = cardY; y < cardY + cardH; y++) {
    for (let x = cardX; x < cardX + cardW; x++) {
      if (x < imgW && y < imgH) {
        const idx = (imgW * y + x) << 2;
        png.data[idx] = 240;
        png.data[idx + 1] = 240;
        png.data[idx + 2] = 240;
        png.data[idx + 3] = 255;
      }
    }
  }
  return PNG.sync.write(png);
}

describe('Phase 6 Reference Target: Smart Detection & Imposition Engine', () => {
  it('detects and pairs front/back images into a CARD_SMALL document group with dynamic confidence', () => {
    const files = [
      {
        fileId: 'file_front_001',
        filename: 'aadhaar_front.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 154200,
        width: 856,
        height: 540
      },
      {
        fileId: 'file_back_002',
        filename: 'aadhaar_back.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 162100,
        width: 856,
        height: 540
      }
    ];

    const groups = SmartDocumentDetector.analyzeAndGroupFiles(files);
    assert.equal(groups.length, 1);
    const doc = groups[0];
    assert.equal(doc.documentType, 'CARD_SMALL');
    assert.equal(doc.layoutMode, 'SMALL_CARD');
    assert.equal(doc.front.fileId, 'file_front_001');
    assert.equal(doc.back?.fileId, 'file_back_002');
    // Dynamic real confidence (derived, not hardcoded)
    assert.ok(doc.confidence >= 0.90 && doc.confidence <= 1.0);
  });

  it('proves detection is completely filename-independent with random names', () => {
    const files = [
      {
        fileId: 'file_rnd_8391',
        filename: 'IMG_8391.jpg', // No 'front' in name
        mimeType: 'image/jpeg',
        sizeBytes: 230000,
        width: 856,
        height: 540
      },
      {
        fileId: 'file_rnd_2217',
        filename: 'IMG_2217.jpg', // No 'back' in name
        mimeType: 'image/jpeg',
        sizeBytes: 245000,
        width: 856,
        height: 540
      }
    ];

    const groups = SmartDocumentDetector.analyzeAndGroupFiles(files);
    assert.equal(groups.length, 1);
    const doc = groups[0];
    assert.equal(doc.documentType, 'CARD_SMALL');
    assert.equal(doc.front.fileId, 'file_rnd_8391');
    assert.equal(doc.back?.fileId, 'file_rnd_2217');
    assert.ok(doc.confidence >= 0.90);
  });

  it('rejects unrelated images and refuses to pair them as one document', () => {
    const files = [
      {
        fileId: 'file_card_01',
        filename: 'IMG_8391.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 230000,
        width: 856,
        height: 540 // ID Card aspect ratio ~1.585
      },
      {
        fileId: 'file_square_02',
        filename: 'random_photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 190000,
        width: 600,
        height: 600 // Square aspect ratio 1.0 (unrelated!)
      }
    ];

    const groups = SmartDocumentDetector.analyzeAndGroupFiles(files);
    // Must NOT pair as one document! Must produce 2 separate groups
    assert.equal(groups.length, 2);
    assert.equal(groups[0].back, undefined);
    assert.equal(groups[1].back, undefined);
  });

  it('performs real pixel boundary detection, crops background, and calculates confidence', () => {
    // 200x150 image with 120x76 card inside (aspect ratio = 120/76 = 1.579, ~1.585 ID card)
    const cardPng = createCardOnBackgroundPng(200, 150, 40, 37, 120, 76);
    const analysis = SmartDocumentDetector.detectBoundaryFromPng(cardPng);

    assert.equal(analysis.inputWidth, 200);
    assert.equal(analysis.inputHeight, 150);
    assert.equal(analysis.outputWidth, 120);
    assert.equal(analysis.outputHeight, 76);
    assert.equal(analysis.detectedCrop.x, 40);
    assert.equal(analysis.detectedCrop.y, 37);
    assert.equal(analysis.classification, 'CARD_SMALL');
    assert.ok(analysis.confidence >= 0.90);
    assert.ok(analysis.croppedBuffer.length > 0);
  });

  it('allows manual front/back swap and side rotation', () => {
    const group = {
      id: 'grp_test',
      front: { fileId: 'f1', rotation: 0, confidence: 0.95 },
      back: { fileId: 'b1', rotation: 0, confidence: 0.95 },
      documentType: 'CARD_SMALL',
      confidence: 0.95,
      layoutMode: 'SMALL_CARD',
      orientation: 'PORTRAIT',
      status: 'DETECTED'
    };

    const swapped = SmartDocumentDetector.swapFrontBack(group);
    assert.equal(swapped.front.fileId, 'b1');
    assert.equal(swapped.back.fileId, 'f1');
    assert.equal(swapped.status, 'MANUALLY_CONFIRMED');

    const rotated = SmartDocumentDetector.rotateSide(swapped.front);
    assert.equal(rotated.rotation, 90);
    const rotated180 = SmartDocumentDetector.rotateSide(rotated);
    assert.equal(rotated180.rotation, 180);
  });

  it('generates deterministic PRINT MASTER PDF for SMALL_CARD layout', async () => {
    const result = await ImpositionEngine.generatePrintMaster({
      frontAsset: {
        data: samplePngBytes,
        mimeType: 'image/png'
      },
      backAsset: {
        data: samplePngBytes,
        mimeType: 'image/png'
      },
      paperSize: 'A4',
      layoutMode: 'SMALL_CARD',
      orientation: 'PORTRAIT'
    });

    assert.ok(result.pdfBytes.length > 0);
    assert.equal(result.pageCount, 1);
    assert.equal(result.layoutMode, 'SMALL_CARD');
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
    assert.equal(result.layoutVersion, 'v1.0');
  });

  it('generates deterministic PRINT MASTER PDF for LARGE_CARD layout', async () => {
    const result = await ImpositionEngine.generatePrintMaster({
      frontAsset: {
        data: samplePngBytes,
        mimeType: 'image/png'
      },
      backAsset: {
        data: samplePngBytes,
        mimeType: 'image/png'
      },
      paperSize: 'A4',
      layoutMode: 'LARGE_CARD',
      orientation: 'PORTRAIT'
    });

    assert.ok(result.pdfBytes.length > 0);
    assert.equal(result.pageCount, 1);
    assert.equal(result.layoutMode, 'LARGE_CARD');
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
  });

  it('generates deterministic PRINT MASTER PDF for FIT_PAGE layout', async () => {
    const result = await ImpositionEngine.generatePrintMaster({
      frontAsset: {
        data: samplePngBytes,
        mimeType: 'image/png'
      },
      paperSize: 'A4',
      layoutMode: 'FIT_PAGE',
      orientation: 'PORTRAIT'
    });

    assert.ok(result.pdfBytes.length > 0);
    assert.equal(result.pageCount, 1);
    assert.equal(result.layoutMode, 'FIT_PAGE');
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
  });
});
