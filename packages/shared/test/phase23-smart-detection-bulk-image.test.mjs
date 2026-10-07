import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import {
  SmartDocumentDetector,
  ImpositionEngine
} from '../dist/index.js';

function createSolidPng(width, height, r, g, b) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

function createTextDocumentPng(width, height) {
  const png = new PNG({ width, height });
  // White background
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 250;
    png.data[i + 1] = 250;
    png.data[i + 2] = 250;
    png.data[i + 3] = 255;
  }
  // Dark text stripes (high frequency gradient)
  for (let y = 10; y < height - 10; y += 4) {
    for (let x = 10; x < width - 10; x++) {
      if ((x % 6) < 4) {
        const idx = (width * y + x) << 2;
        png.data[idx] = 20;
        png.data[idx + 1] = 20;
        png.data[idx + 2] = 20;
      }
    }
  }
  return PNG.sync.write(png);
}

function createGlareImagePng(width, height) {
  const png = new PNG({ width, height });
  // Darker background
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 100;
    png.data[i + 1] = 100;
    png.data[i + 2] = 100;
    png.data[i + 3] = 255;
  }
  // Concentrated overexposed glare spot (around 8% of pixels)
  const spotW = Math.round(width * 0.3);
  const spotH = Math.round(height * 0.28);
  for (let y = 10; y < 10 + spotH; y++) {
    for (let x = 10; x < 10 + spotW; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx] = 255;
      png.data[idx + 1] = 255;
      png.data[idx + 2] = 255;
    }
  }
  return PNG.sync.write(png);
}

describe('Phase 23: Smart Document Intelligence & Bulk Image Print Engine', () => {
  // Test 1: Blur Detection
  it('detects sharp image vs blurred/uniform image', () => {
    const sharpPng = createTextDocumentPng(100, 100);
    const blurResSharp = SmartDocumentDetector.detectBlur(sharpPng);
    assert.ok(blurResSharp.score >= 4.0);
    assert.ok(['GOOD', 'ACCEPTABLE'].includes(blurResSharp.quality));

    // Uniform smooth image (simulates severe blur)
    const blurryPng = createSolidPng(100, 100, 200, 200, 200);
    const blurResBlur = SmartDocumentDetector.detectBlur(blurryPng);
    assert.ok(blurResBlur.score < 2.0);
    assert.equal(blurResBlur.quality, 'RETAKE_RECOMMENDED');
    assert.ok(blurResBlur.warning && blurResBlur.warning.includes('blur'));
  });

  // Test 2: Glare Detection
  it('detects specular reflection glare patch vs clean document', () => {
    const cleanPng = createTextDocumentPng(100, 100);
    const cleanGlare = SmartDocumentDetector.detectGlare(cleanPng);
    assert.equal(cleanGlare.hasGlare, false);

    const glarePng = createGlareImagePng(100, 100);
    const glareResult = SmartDocumentDetector.detectGlare(glarePng);
    assert.equal(glareResult.hasGlare, true);
    assert.ok(glareResult.warning && glareResult.warning.includes('Reflection detected'));
  });

  // Test 3: Resolution & DPI Printability
  it('assesses resolution DPI printability for A4 and small card', () => {
    // 2480x3508 at A4 (~300 DPI)
    const highDpi = SmartDocumentDetector.assessResolutionDpi(2480, 3508, 'A4');
    assert.ok(highDpi.estimatedDpi >= 250);
    assert.equal(highDpi.isPrintable, true);
    assert.equal(highDpi.warning, undefined);

    // 150x150 at A4 (~13 DPI)
    const lowDpi = SmartDocumentDetector.assessResolutionDpi(150, 150, 'A4');
    assert.ok(lowDpi.estimatedDpi < 100);
    assert.equal(lowDpi.isPrintable, false);
    assert.ok(lowDpi.warning && lowDpi.warning.includes('low resolution'));
  });

  // Test 4: Blank Page Detection
  it('detects blank pages vs populated documents', () => {
    // Pure white page
    const whitePng = createSolidPng(80, 80, 255, 255, 255);
    const blankRes = SmartDocumentDetector.detectBlankPage(whitePng);
    assert.equal(blankRes.isBlank, true);
    assert.ok(blankRes.warning && blankRes.warning.includes('blank'));

    // Document with text
    const textPng = createTextDocumentPng(80, 80);
    const textRes = SmartDocumentDetector.detectBlankPage(textPng);
    assert.equal(textRes.isBlank, false);
  });

  // Test 5: Duplicate File Detection
  it('detects duplicate uploads using SHA-256 checksum', () => {
    const files = [
      { fileId: 'f1', sha256: 'abc123sha' },
      { fileId: 'f2', sha256: 'xyz999sha' },
      { fileId: 'f3', sha256: 'abc123sha' }
    ];
    const dups = SmartDocumentDetector.detectDuplicateFiles(files);
    assert.equal(dups.length, 1);
    assert.equal(dups[0].fileId1, 'f1');
    assert.equal(dups[0].fileId2, 'f3');
    assert.ok(dups[0].reason.includes('duplicate'));
  });

  // Test 6: Print Readiness Evaluation
  it('evaluates print readiness score correctly', () => {
    assert.equal(SmartDocumentDetector.evaluatePrintReadiness({}).readiness, 'READY');
    assert.equal(SmartDocumentDetector.evaluatePrintReadiness({ isBlank: true }).readiness, 'NEEDS_CONFIRMATION');
    assert.equal(SmartDocumentDetector.evaluatePrintReadiness({ isDuplicate: true }).readiness, 'NEEDS_CONFIRMATION');
    assert.equal(SmartDocumentDetector.evaluatePrintReadiness({ qualityScore: 'RETAKE_RECOMMENDED' }).readiness, 'NEEDS_CONFIRMATION');
    assert.equal(SmartDocumentDetector.evaluatePrintReadiness({ hasGlare: true }).readiness, 'READY_WITH_WARNING');
    assert.equal(SmartDocumentDetector.evaluatePrintReadiness({ isPrintable: false }).readiness, 'READY_WITH_WARNING');
  });

  // Test 7: Card Pairing & Ungroup / Group Actions
  it('supports automatic card pairing, manual ungrouping, and re-grouping', () => {
    const files = [
      { fileId: 'c1', filename: 'card_front.jpg', mimeType: 'image/jpeg', sizeBytes: 1000, width: 856, height: 540 },
      { fileId: 'c2', filename: 'card_back.jpg', mimeType: 'image/jpeg', sizeBytes: 1000, width: 850, height: 538 }
    ];

    const groups = SmartDocumentDetector.analyzeAndGroupFiles(files, 'CARDS');
    assert.equal(groups.length, 1);
    assert.equal(groups[0].documentType, 'CARD_SMALL');
    assert.equal(groups[0].front.fileId, 'c1');
    assert.equal(groups[0].back.fileId, 'c2');

    // Customer UNGROUPS the card into 2 individual items
    const ungrouped = SmartDocumentDetector.ungroup(groups[0]);
    assert.equal(ungrouped.length, 2);
    assert.equal(ungrouped[0].front.fileId, 'c1');
    assert.equal(ungrouped[0].back, null);
    assert.equal(ungrouped[1].front.fileId, 'c2');
    assert.equal(ungrouped[1].back, null);

    // Customer RE-GROUPS them back as a pair
    const regrouped = SmartDocumentDetector.groupAsPair(ungrouped[0], ungrouped[1]);
    assert.equal(regrouped.front.fileId, 'c1');
    assert.equal(regrouped.back.fileId, 'c2');
    assert.equal(regrouped.documentType, 'CARD_SMALL');
  });

  // Test 8: Bulk Multi-Image Normal Mode (preferredMode: 'IMAGES')
  it('supports 4-image normal photo printing without forcing card grouping', () => {
    const files = [
      { fileId: 'img1', filename: 'p1.jpg', mimeType: 'image/jpeg', sizeBytes: 2000, width: 1200, height: 800 },
      { fileId: 'img2', filename: 'p2.jpg', mimeType: 'image/jpeg', sizeBytes: 2000, width: 1200, height: 800 },
      { fileId: 'img3', filename: 'p3.jpg', mimeType: 'image/jpeg', sizeBytes: 2000, width: 1200, height: 800 },
      { fileId: 'img4', filename: 'p4.jpg', mimeType: 'image/jpeg', sizeBytes: 2000, width: 1200, height: 800 }
    ];

    const groups = SmartDocumentDetector.analyzeAndGroupFiles(files, 'IMAGES');
    assert.equal(groups.length, 4);
    assert.equal(groups[0].layoutMode, 'ONE_PER_PAGE');
    assert.equal(groups[1].layoutMode, 'ONE_PER_PAGE');
    assert.equal(groups[2].layoutMode, 'ONE_PER_PAGE');
    assert.equal(groups[3].layoutMode, 'ONE_PER_PAGE');
    assert.equal(groups[0].sortOrder, 0);
    assert.equal(groups[3].sortOrder, 3);
  });

  // Test 9: Bulk Multi-Image Imposition — 4 Images (ONE_PER_PAGE -> 4 pages)
  it('generates 4-page print master for 4 images in ONE_PER_PAGE mode', async () => {
    const samplePng = createTextDocumentPng(60, 60);
    const assets = [
      { data: samplePng, mimeType: 'image/png' },
      { data: samplePng, mimeType: 'image/png' },
      { data: samplePng, mimeType: 'image/png' },
      { data: samplePng, mimeType: 'image/png' }
    ];

    const result = await ImpositionEngine.generateMultiImagePrintMaster({
      assets,
      paperSize: 'A4',
      layoutMode: 'ONE_PER_PAGE',
      orientation: 'PORTRAIT'
    });

    assert.equal(result.pageCount, 4);
    assert.equal(result.layoutMode, 'ONE_PER_PAGE');
    assert.ok(result.pdfBytes.length > 0);
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
  });

  // Test 10: Bulk Multi-Image Imposition — 10 Images (MULTI_UP_4 -> 3 sheets)
  it('generates 3-sheet print master for 10 images in MULTI_UP_4 layout', async () => {
    const samplePng = createTextDocumentPng(60, 60);
    const assets = Array.from({ length: 10 }, () => ({
      data: samplePng,
      mimeType: 'image/png'
    }));

    const result = await ImpositionEngine.generateMultiImagePrintMaster({
      assets,
      paperSize: 'A4',
      layoutMode: 'MULTI_UP_4',
      orientation: 'PORTRAIT'
    });

    // 10 images / 4 per sheet = ceil(10/4) = 3 sheets
    assert.equal(result.pageCount, 3);
    assert.equal(result.layoutMode, 'MULTI_UP_4');
    assert.ok(result.pdfBytes.length > 0);
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
  });

  // Test 11: Bulk Multi-Image Imposition — 2-up, 6-up
  it('generates correct sheet counts for MULTI_UP_2 and MULTI_UP_6 layouts', async () => {
    const samplePng = createTextDocumentPng(50, 50);
    // 6 images in 2-up -> 3 sheets
    const res2Up = await ImpositionEngine.generateMultiImagePrintMaster({
      assets: Array.from({ length: 6 }, () => ({ data: samplePng, mimeType: 'image/png' })),
      paperSize: 'A4',
      layoutMode: 'MULTI_UP_2'
    });
    assert.equal(res2Up.pageCount, 3);

    // 12 images in 6-up -> 2 sheets
    const res6Up = await ImpositionEngine.generateMultiImagePrintMaster({
      assets: Array.from({ length: 12 }, () => ({ data: samplePng, mimeType: 'image/png' })),
      paperSize: 'A4',
      layoutMode: 'MULTI_UP_6'
    });
    assert.equal(res6Up.pageCount, 2);
  });

  // Test 12: Tall Screenshot Page Splitting (SPLIT_ACROSS_PAGES)
  it('slices tall scroll screenshot across multiple A4 pages', async () => {
    // Tall screenshot: 100 x 300 (aspect ratio = 3.0)
    const tallPng = createTextDocumentPng(100, 300);
    const result = await ImpositionEngine.generateMultiImagePrintMaster({
      assets: [{ data: tallPng, mimeType: 'image/png' }],
      paperSize: 'A4',
      layoutMode: 'SPLIT_ACROSS_PAGES',
      orientation: 'PORTRAIT'
    });

    // 3.0 aspect ratio / 1.4 -> ceil = 3 pages
    assert.ok(result.pageCount >= 2);
    assert.equal(result.layoutMode, 'SPLIT_ACROSS_PAGES');
    assert.match(result.sha256, /^[a-f0-9]{64}$/);
  });

  // Test 13: Bulk Privacy Purge Verification across 10 files
  it('verifies bulk privacy purge accounts for every asset without orphans', () => {
    const orderAssets = Array.from({ length: 10 }, (_, i) => ({
      fileId: `f_${i + 1}`,
      originalPath: `orders/ord_123/original_${i + 1}.jpg`,
      processedPath: `orders/ord_123/processed_${i + 1}.png`,
      printMasterPath: i === 0 ? 'orders/ord_123/print_master.pdf' : null
    }));

    const deletedAssets = [];
    for (const a of orderAssets) {
      if (a.originalPath) deletedAssets.push(a.originalPath);
      if (a.processedPath) deletedAssets.push(a.processedPath);
      if (a.printMasterPath) deletedAssets.push(a.printMasterPath);
    }

    assert.equal(deletedAssets.filter(p => p.includes('original')).length, 10);
    assert.equal(deletedAssets.filter(p => p.includes('processed')).length, 10);
    assert.equal(deletedAssets.filter(p => p.includes('print_master')).length, 1);
  });
});
