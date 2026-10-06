import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrintPrice, DEFAULT_SHAKEEL_PRICING } from '../dist/pricing/pricing-engine.js';

test('Pricing Engine - Single page A4 B&W respects minimum order amount', () => {
  const result = calculatePrintPrice({
    shopId: 'shakeel-online-services',
    pageCount: 1,
    selectedPages: [1],
    paperSize: 'A4',
    colorMode: 'BW',
    duplexMode: 'SINGLE',
    copies: 1,
    paperType: 'NORMAL_75GSM',
    finishing: 'NONE'
  });

  // 1 page = 2.00 printCost, but minimum order is 5.00
  assert.equal(result.totalSides, 1);
  assert.equal(result.printCost, 2.0);
  assert.equal(result.total, DEFAULT_SHAKEEL_PRICING.minimumOrderAmount);
});

test('Pricing Engine - A4 B&W duplex multi-copy calculation', () => {
  const result = calculatePrintPrice({
    shopId: 'shakeel-online-services',
    pageCount: 10,
    selectedPages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    paperSize: 'A4',
    colorMode: 'BW',
    duplexMode: 'DOUBLE',
    copies: 2,
    paperType: 'NORMAL_75GSM',
    finishing: 'NONE'
  });

  // 10 pages * 2 copies = 20 total sides.
  // Duplex rate is a4BwDouble/2 = 3.0 / 2 = 1.5 per side.
  // 20 * 1.5 = 30.00
  assert.equal(result.totalSides, 20);
  assert.equal(result.sheetCount, 10);
  assert.equal(result.printCost, 30.0);
  assert.equal(result.total, 30.0);
});

test('Pricing Engine - A4 Color with Spiral Binding finishing', () => {
  const result = calculatePrintPrice({
    shopId: 'shakeel-online-services',
    pageCount: 20,
    selectedPages: Array.from({ length: 20 }, (_, i) => i + 1),
    paperSize: 'A4',
    colorMode: 'COLOR',
    duplexMode: 'SINGLE',
    copies: 1,
    paperType: 'NORMAL_75GSM',
    finishing: 'SPIRAL_BINDING'
  });

  // Print: 20 sides * 10.0 = 200.00
  // Spiral: 30 base + (20 sheets * 0.20) = 34.00
  // Total = 234.00
  assert.equal(result.printCost, 200.0);
  assert.equal(result.finishingCost, 34.0);
  assert.equal(result.total, 234.0);
});
