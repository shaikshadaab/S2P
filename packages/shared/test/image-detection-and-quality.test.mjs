import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImageQualityAssessor,
  ImageDetectionEngine,
  STANDARD_PHYSICAL_SIZES_MM
} from '../dist/index.js';

test('ImageQualityAssessor - Effective DPI calculation accuracy', () => {
  // A4 paper: 210 x 297 mm
  // 300 DPI on A4 requires ~2480 x 3508 pixels
  const dpi300 = ImageQualityAssessor.calculateEffectiveDpi(2480, 3508, 210, 297);
  assert.ok(dpi300 >= 299 && dpi300 <= 301, 'Expected ~300 DPI, got ' + dpi300);

  // Indian Passport: 35 x 45 mm
  // 300 DPI on 35x45mm requires ~413 x 531 pixels
  const dpiPassport = ImageQualityAssessor.calculateEffectiveDpi(413, 531, 35, 45);
  assert.ok(dpiPassport >= 299 && dpiPassport <= 301, 'Expected ~300 DPI for passport, got ' + dpiPassport);

  // Low resolution: 600 x 800 pixels on A4
  const dpiLow = ImageQualityAssessor.calculateEffectiveDpi(600, 800, 210, 297);
  assert.ok(dpiLow < 100, 'Expected < 100 DPI, got ' + dpiLow);

  // Edge case: zero or negative dimensions return 0
  assert.equal(ImageQualityAssessor.calculateEffectiveDpi(0, 0, 210, 297), 0);
  assert.equal(ImageQualityAssessor.calculateEffectiveDpi(1000, 1000, 0, 0), 0);
});

test('ImageQualityAssessor - Quality classification levels and non-blocking invariant', () => {
  // 1. Excellent: 300+ DPI
  const excellent = ImageQualityAssessor.assessPrintQuality(2480, 3508, 210, 297);
  assert.equal(excellent.level, 'EXCELLENT');
  assert.equal(excellent.warningMessage, null);
  assert.equal(excellent.isPrintable, true);

  // 2. Good: 200 - 299 DPI
  const good = ImageQualityAssessor.assessPrintQuality(1800, 2500, 210, 297);
  assert.equal(good.level, 'GOOD');
  assert.equal(good.warningMessage, null);
  assert.equal(good.isPrintable, true);

  // 3. Fair: 150 - 199 DPI
  const fair = ImageQualityAssessor.assessPrintQuality(1300, 1800, 210, 297);
  assert.equal(fair.level, 'FAIR');
  assert.ok(fair.warningMessage !== null);
  assert.equal(fair.isPrintable, true);

  // 4. Low Resolution: < 150 DPI
  const low = ImageQualityAssessor.assessPrintQuality(600, 800, 210, 297);
  assert.equal(low.level, 'LOW_RESOLUTION');
  assert.ok(low.warningMessage?.includes('Low resolution'));
  assert.ok(low.recommendation?.includes('smaller physical size'));
  // Critical Invariant: Never silently block a valid print based on quality score alone
  assert.equal(low.isPrintable, true);
});

test('ImageDetectionEngine - Document aspect ratio & keyword detection', () => {
  // A4 Document ratio: 1.414 (e.g. 1414 x 1000 px)
  const docScan = ImageDetectionEngine.detectImageMode(1414, 1000, { filename: 'electricity_bill.jpg' });
  assert.equal(docScan.suggestedMode, 'DOCUMENT');
  assert.ok(docScan.confidence >= 0.85);

  // File with receipt keyword
  const receipt = ImageDetectionEngine.detectImageMode(1200, 900, { filename: 'cash_receipt_001.png' });
  assert.equal(receipt.suggestedMode, 'DOCUMENT');
  assert.ok(receipt.confidence >= 0.85);
});

test('ImageDetectionEngine - Portrait / Passport photo detection', () => {
  // Passport photo ratio: 35x45 mm (~1.286:1 vertical)
  const portrait = ImageDetectionEngine.detectImageMode(350, 450, { filename: 'my_photo.jpg' });
  assert.equal(portrait.suggestedMode, 'PORTRAIT');
  assert.ok(portrait.confidence >= 0.80);

  // Keyword match
  const passportName = ImageDetectionEngine.detectImageMode(600, 800, { filename: 'passport_size_photo.jpg' });
  assert.equal(passportName.suggestedMode, 'PORTRAIT');
  assert.ok(passportName.confidence >= 0.85);
});

test('ImageDetectionEngine - ID Card CR80 ratio detection', () => {
  // CR80 ratio: 85.6 x 54.0 mm (~1.585:1)
  const idCard = ImageDetectionEngine.detectImageMode(856, 540, { filename: 'identity_doc.jpg' });
  assert.equal(idCard.suggestedMode, 'ID_CARD');
  assert.ok(idCard.confidence >= 0.80);

  // Keyword match (Aadhaar / PAN)
  const aadhar = ImageDetectionEngine.detectImageMode(1000, 600, { filename: 'aadhaar_card_front.png' });
  assert.equal(aadhar.suggestedMode, 'ID_CARD');
  assert.ok(aadhar.confidence >= 0.90);
});

test('ImageDetectionEngine - General Photo fallback for landscape images', () => {
  // Wide landscape 16:9 ratio with no document keywords
  const landscape = ImageDetectionEngine.detectImageMode(1920, 1080, { filename: 'sunset_beach.jpg' });
  assert.equal(landscape.suggestedMode, 'GENERAL_PHOTO');
  assert.equal(landscape.requiresManualChoice, true);
});
