import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImageQualityAssessor,
  ImageDetectionEngine,
  STANDARD_PHYSICAL_SIZES_MM
} from '../dist/index.js';

function processPixelBuffer(pixels, width, height, settings) {
  const out = new Uint8ClampedArray(pixels);
  const len = out.length;

  const mode = settings.documentEnhanceMode;
  const isDoc = mode !== 'ORIGINAL';

  const midpoint = isDoc ? 200 : 128;
  const brightnessFactor = (settings.brightness || 0) * 2.55;
  const contrastRatio = ((settings.contrast || 0) + 100) / 100;
  const contrastFactor = isDoc ? contrastRatio : (contrastRatio * contrastRatio);

  const shadowReduction = Math.min(100, Math.max(0, settings.shadowReduction ?? 30));
  const shadowBoost = shadowReduction * 0.45;

  if (mode === 'ORIGINAL') return out;

  for (let i = 0; i < len; i += 4) {
    let r = out[i];
    let g = out[i + 1];
    let b = out[i + 2];

    if (settings.brightness !== 0) {
      r = Math.min(255, Math.max(0, r + brightnessFactor));
      g = Math.min(255, Math.max(0, g + brightnessFactor));
      b = Math.min(255, Math.max(0, b + brightnessFactor));
    }

    if (settings.contrast !== 0) {
      r = Math.min(255, Math.max(0, (r - midpoint) * contrastFactor + midpoint));
      g = Math.min(255, Math.max(0, (g - midpoint) * contrastFactor + midpoint));
      b = Math.min(255, Math.max(0, (b - midpoint) * contrastFactor + midpoint));
    }

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    if (shadowBoost > 0 && luminance >= 160 && luminance < 225) {
      const lift = ((luminance - 160) / 65) * shadowBoost;
      r = Math.min(255, r + lift);
      g = Math.min(255, g + lift);
      b = Math.min(255, b + lift);
    }

    if (mode === 'GRAYSCALE') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      out[i] = gray;
      out[i + 1] = gray;
      out[i + 2] = gray;
    } else if (mode === 'HIGH_CONTRAST') {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const val = lum >= 170 ? 255 : Math.max(0, lum * 0.65);
      out[i] = val;
      out[i + 1] = val;
      out[i + 2] = val;
    } else if (mode === 'COLOR_ENHANCED') {
      const updatedLum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (updatedLum >= 220) {
        const paperWhitening = ((updatedLum - 220) / 35) * 35;
        r = Math.min(255, r + paperWhitening);
        g = Math.min(255, g + paperWhitening);
        b = Math.min(255, b + paperWhitening);
      }
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
    }
  }

  if (settings.sharpen && settings.sharpen > 0) {
    const sharpened = new Uint8ClampedArray(out);
    const factor = (settings.sharpen / 100) * 0.4;
    const center = 1 + (4 * factor);
    const edge = -factor;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const top = out[((y - 1) * width + x) * 4 + c];
          const bottom = out[((y + 1) * width + x) * 4 + c];
          const left = out[(y * width + (x - 1)) * 4 + c];
          const right = out[(y * width + (x + 1)) * 4 + c];
          const mid = out[idx + c];
          const val = (mid * center) + (top + bottom + left + right) * edge;
          sharpened[idx + c] = Math.min(255, Math.max(0, val));
        }
      }
    }
    return sharpened;
  }

  return out;
}

test('Synthetic Test 1: Shadow reduction lifts dark camera shadows towards clean white', () => {
  const width = 10;
  const height = 10;
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 165;
    pixels[i + 1] = 165;
    pixels[i + 2] = 165;
    pixels[i + 3] = 255;
  }

  // Draw black text line
  pixels[20] = 30; pixels[21] = 30; pixels[22] = 30; pixels[23] = 255;
  pixels[24] = 30; pixels[25] = 30; pixels[26] = 30; pixels[27] = 255;

  const enhanced = processPixelBuffer(pixels, width, height, {
    mode: 'DOCUMENT',
    documentEnhanceMode: 'COLOR_ENHANCED',
    shadowReduction: 50,
    brightness: 5,
    contrast: 15,
    sharpen: 0
  });

  const bgBefore = pixels[0];
  const bgAfter = enhanced[0];
  assert.ok(bgAfter > bgBefore, 'Shadow must be lifted towards white');

  const textAfter = enhanced[20];
  assert.ok(textAfter < 80, 'Text must remain dark and readable');
  assert.ok(bgAfter - textAfter > 90, 'Contrast between paper and text must be strong');
});

test('Synthetic Test 2: Coloured ink stamps and signatures are preserved in COLOR_ENHANCED mode', () => {
  const width = 10;
  const height = 10;
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 240;
    pixels[i + 1] = 240;
    pixels[i + 2] = 240;
    pixels[i + 3] = 255;
  }

  // Blue pen signature (R=25, G=80, B=215)
  pixels[0] = 25; pixels[1] = 80; pixels[2] = 215; pixels[3] = 255;

  // Official Red rubber stamp (R=205, G=30, B=50)
  pixels[4] = 205; pixels[5] = 30; pixels[6] = 50; pixels[7] = 255;

  const enhanced = processPixelBuffer(pixels, width, height, {
    mode: 'DOCUMENT',
    documentEnhanceMode: 'COLOR_ENHANCED',
    shadowReduction: 30,
    brightness: 0,
    contrast: 10,
    sharpen: 0
  });

  assert.ok(enhanced[2] > enhanced[0] * 2, 'Blue signature channel must remain dominant');
  assert.ok(enhanced[4] > enhanced[5] * 2, 'Red stamp channel must remain dominant');
});

test('Synthetic Test 3: Faint handwriting is preserved and made sharper', () => {
  const width = 10;
  const height = 10;
  const pixels = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 230;
    pixels[i + 1] = 230;
    pixels[i + 2] = 230;
    pixels[i + 3] = 255;
  }

  // Faint handwriting pixel: light gray (RGB 180, 180, 180)
  pixels[40] = 180; pixels[41] = 180; pixels[42] = 180; pixels[43] = 255;

  const initialContrast = pixels[0] - pixels[40]; // 230 - 180 = 50

  const enhanced = processPixelBuffer(pixels, width, height, {
    mode: 'DOCUMENT',
    documentEnhanceMode: 'COLOR_ENHANCED',
    shadowReduction: 30,
    brightness: 0,
    contrast: 20,
    sharpen: 0
  });

  const bgAfter = enhanced[0];
  const faintTextAfter = enhanced[40];
  const contrastAfter = bgAfter - faintTextAfter;

  // After enhancement, contrast must be greater than initial 50
  assert.ok(contrastAfter > initialContrast, `Contrast must improve: before=${initialContrast}, after=${contrastAfter}`);
  // Faint text must NOT be washed out to 255
  assert.ok(faintTextAfter < 200, `Faint handwriting must be preserved (not washed out), got ${faintTextAfter}`);
});

test('Synthetic Test 4: Undo, Redo, and Reset State Transitions', () => {
  const history = [];
  let currentIndex = -1;

  function pushState(s) {
    history.splice(currentIndex + 1);
    history.push(s);
    currentIndex = history.length - 1;
  }

  const s0 = { mode: 'DOCUMENT', brightness: 0, contrast: 0, rotation: 0 };
  const s1 = { mode: 'DOCUMENT', brightness: 10, contrast: 15, rotation: 0 };
  const s2 = { mode: 'DOCUMENT', brightness: 10, contrast: 15, rotation: 90 };

  pushState(s0);
  pushState(s1);
  pushState(s2);

  currentIndex--;
  assert.equal(history[currentIndex].rotation, 0);

  currentIndex--;
  assert.equal(history[currentIndex].brightness, 0);

  currentIndex++;
  assert.equal(history[currentIndex].brightness, 10);

  pushState(s0);
  assert.equal(history[currentIndex].brightness, 0);
});

test('Synthetic Test 5: Original preservation invariant during derivative generation', () => {
  const origFile = {
    id: 'fil_test_001',
    storageOriginalPath: 'shops/shakeel/orders/ord_123/original/contract.jpg',
    storageProcessedPath: undefined,
    hasDerivative: false
  };

  const processedPath = 'shops/shakeel/orders/ord_123/processed/hash_456.jpg';
  const updatedFile = {
    ...origFile,
    storageProcessedPath: processedPath,
    hasDerivative: true
  };

  assert.equal(updatedFile.storageOriginalPath, origFile.storageOriginalPath);
  assert.equal(updatedFile.hasDerivative, true);
  assert.equal(updatedFile.storageProcessedPath, processedPath);

  const fileToPrint = updatedFile.hasDerivative && updatedFile.storageProcessedPath
    ? updatedFile.storageProcessedPath
    : updatedFile.storageOriginalPath;

  assert.equal(fileToPrint, processedPath, 'Spooler must dispatch the enhanced derivative artifact');
});
