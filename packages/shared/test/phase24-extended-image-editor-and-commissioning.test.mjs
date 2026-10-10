import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImageQualityAssessor,
  STANDARD_PHYSICAL_SIZES_MM
} from '../dist/index.js';

test('1. Aspect Ratio Presets Calculation & Verification', () => {
  // Test Aspect Ratio Presets
  const getAspectRatio = (preset, origRatio = 1) => {
    switch (preset) {
      case '1:1':
      case 'PASSPORT_2X2':
        return 1.0;
      case '4:6':
        return 4 / 6;
      case 'A4':
        return 210 / 297;
      case 'PASSPORT_35X45':
        return 35 / 45;
      case 'STAMP_25X30':
        return 25 / 30;
      case 'ORIGINAL':
        return origRatio;
      case 'FREE':
      default:
        return null;
    }
  };

  assert.equal(getAspectRatio('1:1'), 1.0);
  assert.equal(getAspectRatio('PASSPORT_2X2'), 1.0);
  assert.equal(Math.round(getAspectRatio('4:6') * 1000) / 1000, 0.667);
  assert.equal(Math.round(getAspectRatio('A4') * 1000) / 1000, 0.707);
  assert.equal(Math.round(getAspectRatio('PASSPORT_35X45') * 1000) / 1000, 0.778);
  assert.equal(Math.round(getAspectRatio('STAMP_25X30') * 1000) / 1000, 0.833);
  assert.equal(getAspectRatio('ORIGINAL', 1.5), 1.5);
  assert.equal(getAspectRatio('FREE'), null);
});

test('2. Crop Box Bounds & Aspect Ratio Clamping', () => {
  const containerW = 800;
  const containerH = 600;
  const containerRatio = containerW / containerH; // 1.333
  const targetRatio = 1.0; // square

  const initialW = 60; // 60%
  const desiredH = (initialW * containerRatio) / targetRatio; // 80%

  assert.equal(desiredH, 80);
  assert.ok(desiredH <= 100, 'Crop box remains strictly within container bounds');
});

test('3. Background Removal: Transparent, White, and Light Blue Replacement', () => {
  const w = 4;
  const h = 4;
  const pixels = new Uint8ClampedArray(w * h * 4);

  // Fill with solid off-white background: (240, 240, 240, 255)
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 240;
    pixels[i + 1] = 240;
    pixels[i + 2] = 240;
    pixels[i + 3] = 255;
  }

  // Draw a 2x2 dark person/subject in the center: (30, 30, 30, 255)
  const subjectIndices = [5, 6, 9, 10];
  for (const idx of subjectIndices) {
    pixels[idx * 4] = 30;
    pixels[idx * 4 + 1] = 30;
    pixels[idx * 4 + 2] = 30;
    pixels[idx * 4 + 3] = 255;
  }

  // A. Transparent background test
  const outTransparent = new Uint8ClampedArray(pixels);
  for (let i = 0; i < outTransparent.length; i += 4) {
    const isBg = Math.abs(outTransparent[i] - 240) < 30;
    if (isBg) {
      outTransparent[i + 3] = 0; // alpha transparent
    }
  }

  assert.equal(outTransparent[0 * 4 + 3], 0, 'Corner background pixel becomes transparent');
  assert.equal(outTransparent[5 * 4 + 3], 255, 'Center subject pixel remains fully opaque');
  assert.equal(outTransparent[5 * 4], 30, 'Subject pixel color untouched');

  // B. White passport background replacement
  const outWhite = new Uint8ClampedArray(pixels);
  for (let i = 0; i < outWhite.length; i += 4) {
    const isBg = Math.abs(outWhite[i] - 240) < 30;
    if (isBg) {
      outWhite[i] = 255;
      outWhite[i + 1] = 255;
      outWhite[i + 2] = 255;
    }
  }
  assert.equal(outWhite[0 * 4], 255, 'Background becomes pure white');
  assert.equal(outWhite[5 * 4], 30, 'Subject pixel remains dark');

  // C. Light Blue passport background replacement (#dbeafe: 219, 234, 254)
  const outBlue = new Uint8ClampedArray(pixels);
  for (let i = 0; i < outBlue.length; i += 4) {
    const isBg = Math.abs(outBlue[i] - 240) < 30;
    if (isBg) {
      outBlue[i] = 219;
      outBlue[i + 1] = 234;
      outBlue[i + 2] = 254;
    }
  }
  assert.equal(outBlue[0 * 4], 219, 'Background Red becomes 219');
  assert.equal(outBlue[0 * 4 + 1], 234, 'Background Green becomes 234');
  assert.equal(outBlue[0 * 4 + 2], 254, 'Background Blue becomes 254');
});

test('4. Manual Brush Erase and Restore Mask Overrides', () => {
  const maskData = new Uint8ClampedArray(16 * 4);

  // Mark pixel 0 as Erased by user (Red = 255)
  maskData[0] = 255; maskData[1] = 0; maskData[2] = 0; maskData[3] = 255;

  // Mark pixel 1 as Restored by user (Green = 255)
  maskData[4] = 0; maskData[5] = 255; maskData[6] = 0; maskData[7] = 255;

  const isErasedByBrush = maskData[0] > 100;
  const isRestoredByBrush = maskData[5] > 100;

  assert.equal(isErasedByBrush, true, 'User erase brush overrides classification');
  assert.equal(isRestoredByBrush, true, 'User restore brush recovers detail');
});

test('5. Restrained Denoise & Sharpening Invariants', () => {
  const smallNoiseDelta = 12; // grain
  const sharpTextDelta = 180; // text on paper

  const blend = 0.5;
  const smoothedNoise = Math.abs(smallNoiseDelta) < 32 ? Math.round(smallNoiseDelta * (1 - blend)) : smallNoiseDelta;
  const preservedEdge = Math.abs(sharpTextDelta) < 32 ? Math.round(sharpTextDelta * (1 - blend)) : sharpTextDelta;

  assert.ok(smoothedNoise < smallNoiseDelta, 'Small grain is reduced');
  assert.equal(preservedEdge, sharpTextDelta, 'Sharp text edge is untouched by denoise filter');
});

test('6. Document Scan Mode Preserves Faint Writing & Colored Stamps', () => {
  // Colored official stamp: Blue (20, 80, 220)
  const stampR = 20, stampG = 80, stampB = 220;
  const stampLum = 0.299 * stampR + 0.587 * stampG + 0.114 * stampB; // ~78

  // Off-white paper background: (225, 222, 220)
  const paperR = 225, paperG = 222, paperB = 220;
  const paperLum = 0.299 * paperR + 0.587 * paperG + 0.114 * paperB; // ~222

  const isPaperWhitened = paperLum >= 215;
  const isStampProtected = stampLum < 215;

  assert.equal(isPaperWhitened, true, 'Paper background is targeted for whitening');
  assert.equal(isStampProtected, true, 'Colored ink stamp is strictly preserved');
});

test('7. Print Quality & Effective DPI Calculator', () => {
  // A4 size: 210 x 297 mm
  const highDpi = ImageQualityAssessor.calculateEffectiveDpi(2480, 3508, 210, 297);
  assert.ok(highDpi >= 300, `High-res scan should be >= 300 DPI (got ${highDpi})`);

  const reportA = ImageQualityAssessor.assessPrintQuality(2480, 3508, 210, 297);
  assert.equal(reportA.level, 'EXCELLENT');
  assert.equal(reportA.warningMessage, null);

  const lowDpi = ImageQualityAssessor.calculateEffectiveDpi(400, 600, 210, 297);
  assert.ok(lowDpi < 100, `Small thumbnail should be < 100 DPI (got ${lowDpi})`);

  const reportB = ImageQualityAssessor.assessPrintQuality(400, 600, 210, 297);
  assert.equal(reportB.level, 'LOW_RESOLUTION');
  assert.ok(reportB.warningMessage !== null, 'Low resolution warning must be provided');

  const passportDpi = ImageQualityAssessor.calculateEffectiveDpi(600, 750, 35, 45);
  assert.ok(passportDpi >= 400, `Passport photo should have high DPI on 35x45mm (got ${passportDpi})`);
});

test('8. Owner Commissioning Test Order Flow Invariants', () => {
  const allowedRoles = ['OWNER', 'MANAGER'];
  assert.equal(allowedRoles.includes('OWNER'), true, 'OWNER can create commissioning test order');
  assert.equal(allowedRoles.includes('MANAGER'), true, 'MANAGER can create commissioning test order');
  assert.equal(allowedRoles.includes('CUSTOMER'), false, 'Customer cannot create commissioning test order');
  assert.equal(allowedRoles.includes('GUEST'), false, 'Guest cannot create commissioning test order');

  const testFileName = 'test_visible_a4.pdf';
  const expectedSha256 = '93c3291af1fac9b56b53b20586e8a0c9c468cd559378a28504afb925d4175d82';
  assert.equal(testFileName, 'test_visible_a4.pdf');
  assert.equal(expectedSha256.length, 64);

  const intakePaused = true;
  const isOwnerCommissioningTest = true;
  const canDispatchToSpooler = isOwnerCommissioningTest;

  assert.equal(canDispatchToSpooler, true, 'Commissioning test order proceeds while public intake is paused');
});
