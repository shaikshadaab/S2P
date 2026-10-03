import test from "node:test";
import assert from "node:assert/strict";
import { calculatePrintPrice } from "../dist/pricing/pricing-engine.js";

const defaultRules = {
  id: "rule-1",
  shopId: "shop-1",
  a4BwSingle: 2.0,
  a4BwDouble: 1.5,
  a4ColorSingle: 10.0,
  a4ColorDouble: 8.0,
  a3BwSingle: 5.0,
  a3ColorSingle: 20.0,
  photoSingle: 25.0,
  serviceFee: 2.0,
  minOrderAmount: 10.0,
  taxPercentage: 0,
  discountPercentage: 0,
  maxAllowedPages: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test("Pricing Engine - Simple A4 B&W Single Side", () => {
  const result = calculatePrintPrice(
    {
      totalPagesInDocument: 10,
      pageRangeText: "all",
      colorMode: "bw",
      paperSize: "A4",
      isDuplex: false,
      copies: 1,
    },
    defaultRules
  );

  assert.equal(result.selectedPageCount, 10);
  assert.equal(result.printableSides, 10);
  assert.equal(result.physicalSheets, 10);
  assert.equal(result.baseAmount, 20.0);
  assert.equal(result.serviceFee, 2.0);
  assert.equal(result.finalAmount, 22.0);
  assert.equal(result.minOrderFloorApplied, false);
});

test("Pricing Engine - Minimum Order Floor Enforcement", () => {
  const result = calculatePrintPrice(
    {
      totalPagesInDocument: 1,
      pageRangeText: "1",
      colorMode: "bw",
      paperSize: "A4",
      isDuplex: false,
      copies: 1,
    },
    defaultRules
  );

  assert.equal(result.baseAmount, 2.0);
  assert.equal(result.subtotal, 4.0);
  assert.equal(result.minOrderFloorApplied, true);
  assert.equal(result.finalAmount, 10.0);
});

test("Pricing Engine - Duplex Printing with Odd Page Count", () => {
  const result = calculatePrintPrice(
    {
      totalPagesInDocument: 5,
      pageRangeText: "all",
      colorMode: "bw",
      paperSize: "A4",
      isDuplex: true,
      copies: 1,
    },
    { ...defaultRules, serviceFee: 0, minOrderAmount: 0 }
  );

  assert.equal(result.printableSides, 5);
  assert.equal(result.physicalSheets, 3);
  assert.equal(result.baseAmount, 8.0);
  assert.equal(result.finalAmount, 8.0);
});

test("Pricing Engine - Pages Per Sheet (2 pages on 1 side)", () => {
  const result = calculatePrintPrice(
    {
      totalPagesInDocument: 8,
      pageRangeText: "all",
      colorMode: "bw",
      paperSize: "A4",
      isDuplex: false,
      pagesPerSheet: 2,
      copies: 1,
    },
    { ...defaultRules, serviceFee: 0, minOrderAmount: 0 }
  );

  assert.equal(result.printableSides, 4);
  assert.equal(result.physicalSheets, 4);
  assert.equal(result.finalAmount, 8.0);
});

test("Pricing Engine - Copies Multiplier", () => {
  const result = calculatePrintPrice(
    {
      totalPagesInDocument: 2,
      pageRangeText: "all",
      colorMode: "bw",
      paperSize: "A4",
      isDuplex: false,
      copies: 5,
    },
    { ...defaultRules, serviceFee: 1.0, minOrderAmount: 0 }
  );

  assert.equal(result.physicalSheets, 10);
  assert.equal(result.baseAmount, 20.0);
  assert.equal(result.finalAmount, 21.0);
});

test("Pricing Engine - Tax and Discount Calculation", () => {
  const rulesWithTaxAndDiscount = {
    ...defaultRules,
    serviceFee: 5.0,
    minOrderAmount: 0,
    discountPercentage: 10,
    taxPercentage: 18,
  };

  const result = calculatePrintPrice(
    {
      totalPagesInDocument: 10,
      pageRangeText: "all",
      colorMode: "color",
      paperSize: "A4",
      isDuplex: false,
      copies: 1,
    },
    rulesWithTaxAndDiscount
  );

  assert.equal(result.baseAmount, 100.0);
  assert.equal(result.discountAmount, 10.0);
  assert.equal(result.serviceFee, 5.0);
  assert.equal(result.subtotal, 95.0);
  assert.equal(result.taxAmount, 17.1);
  assert.equal(result.finalAmount, 112.1);
});

test("Pricing Engine - Throws when exceeding max allowed pages", () => {
  assert.throws(
    () =>
      calculatePrintPrice(
        {
          totalPagesInDocument: 120,
          pageRangeText: "all",
          colorMode: "bw",
          paperSize: "A4",
          isDuplex: false,
          copies: 1,
        },
        defaultRules
      ),
    /exceeds shop maximum/
  );
});
