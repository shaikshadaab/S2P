import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePrintQuote,
  createPricingSnapshot,
  PricingEngineError
} from "../dist/index.js";

const TEST_CONTEXT = {
  services: [
    { id: "s_bw", organizationId: "shakeel-online-services", shopId: "shakeel-online-services", code: "BW_PRINT", name: "B&W Print", category: "PRINT", enabled: true, displayOrder: 1, publicVisible: true, createdAt: "", updatedAt: "" },
    { id: "s_col", organizationId: "shakeel-online-services", shopId: "shakeel-online-services", code: "COLOR_PRINT", name: "Color Print", category: "PRINT", enabled: true, displayOrder: 2, publicVisible: true, createdAt: "", updatedAt: "" },
    { id: "s_dis", organizationId: "shakeel-online-services", shopId: "shakeel-online-services", code: "DOCUMENT_PRINT", name: "Doc Print", category: "PRINT", enabled: false, displayOrder: 3, publicVisible: true, createdAt: "", updatedAt: "" },
  ],
  paperSizes: [
    { code: "A4", displayName: "A4 Standard", widthMm: 210, heightMm: 297, enabled: true, displayOrder: 1 },
    { code: "A3", displayName: "A3 Large", widthMm: 297, heightMm: 420, enabled: true, displayOrder: 2 },
  ],
  finishingOptions: [
    { code: "NONE", name: "No Finishing", enabled: true, pricingType: "FIXED", fixedPricePaise: 0 },
    { code: "SPIRAL_BINDING", name: "Spiral Binding", enabled: true, pricingType: "FIXED_PER_COPY", fixedPricePaise: 3500 },
    { code: "LAMINATION", name: "Thermal Lamination", enabled: true, pricingType: "PER_SHEET", fixedPricePaise: 2000, perUnitChargePaise: 2000 }
  ],
  pricingRules: [
    {
      id: "r_a4_bw_s",
      organizationId: "shakeel-online-services",
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      paperSizeCode: "A4",
      printMode: "BW",
      sideMode: "SINGLE",
      billingUnit: "PER_PRINTED_SIDE",
      unitPricePaise: 200, // ₹2.00
      quantityTiers: [
        { minUnits: 1, maxUnits: 20, unitPricePaise: 200 },
        { minUnits: 21, maxUnits: 100, unitPricePaise: 180 },
        { minUnits: 101, unitPricePaise: 150 }
      ],
      enabled: true,
      createdAt: "",
      updatedAt: ""
    },
    {
      id: "r_a4_bw_d",
      organizationId: "shakeel-online-services",
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      paperSizeCode: "A4",
      printMode: "BW",
      sideMode: "DUPLEX",
      billingUnit: "PER_PRINTED_SIDE",
      unitPricePaise: 150, // ₹1.50 per side
      enabled: true,
      createdAt: "",
      updatedAt: ""
    },
    {
      id: "r_a4_col_s",
      organizationId: "shakeel-online-services",
      shopId: "shakeel-online-services",
      serviceCode: "COLOR_PRINT",
      paperSizeCode: "A4",
      printMode: "COLOR",
      sideMode: "SINGLE",
      billingUnit: "PER_PRINTED_SIDE",
      unitPricePaise: 1000, // ₹10.00
      enabled: true,
      createdAt: "",
      updatedAt: ""
    },
    {
      id: "r_a3_col_s",
      organizationId: "shakeel-online-services",
      shopId: "shakeel-online-services",
      serviceCode: "COLOR_PRINT",
      paperSizeCode: "A3",
      printMode: "COLOR",
      sideMode: "SINGLE",
      billingUnit: "PER_PRINTED_SIDE",
      unitPricePaise: 2500, // ₹25.00
      enabled: true,
      createdAt: "",
      updatedAt: ""
    }
  ],
  shopSettings: {
    shopId: "shakeel-online-services",
    organizationId: "shakeel-online-services",
    minimumOrderPaise: 500, // ₹5.00
    taxEnabled: false,
    taxRateBasisPoints: 0,
    pricesIncludeTax: false,
    currency: "INR",
    updatedAt: ""
  }
};

test("Pricing 1: A4 B&W single 1 copy (applies minimum order adjustment)", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 1,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "SINGLE",
      copies: 1
    },
    TEST_CONTEXT
  );

  assert.equal(quote.printedSides, 1);
  assert.equal(quote.estimatedSheets, 1);
  // Base print is 200 paise, adjusted to shop minimum order 500 paise (₹5.00)
  assert.equal(quote.totalPaise, 500);
  assert.equal(quote.lineItems.length, 2);
  assert.equal(quote.lineItems[0].totalPaise, 200);
  assert.equal(quote.lineItems[1].totalPaise, 300); // 500 - 200 adjustment
});

test("Pricing 2: A4 B&W duplex multi-page calculation", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 10,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "DUPLEX",
      copies: 2
    },
    TEST_CONTEXT
  );

  // 10 pages * 2 copies = 20 sides
  // 10 pages duplex = 5 sheets * 2 copies = 10 sheets
  // 20 sides * 150 paise = 3000 paise (₹30.00)
  assert.equal(quote.printedSides, 20);
  assert.equal(quote.estimatedSheets, 10);
  assert.equal(quote.totalPaise, 3000);
  assert.equal(quote.subtotalPaise, 3000);
});

test("Pricing 3: Multiple copies", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 5,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "SINGLE",
      copies: 3
    },
    TEST_CONTEXT
  );

  // 5 pages * 3 copies = 15 sides (in 1-20 tier: 200 paise) = 3000 paise (₹30.00)
  assert.equal(quote.printedSides, 15);
  assert.equal(quote.estimatedSheets, 15);
  assert.equal(quote.totalPaise, 3000);
});

test("Pricing 4: Custom page ranges", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 20,
      selectedPageRange: "1-4, 7",
      paperSize: "A4",
      printMode: "BW",
      sideMode: "SINGLE",
      copies: 2
    },
    TEST_CONTEXT
  );

  // Selected pages: [1, 2, 3, 4, 7] = 5 pages
  // 5 pages * 2 copies = 10 sides = 2000 paise (₹20.00)
  assert.equal(quote.selectedPageCount, 5);
  assert.equal(quote.printedSides, 10);
  assert.equal(quote.totalPaise, 2000);
});

test("Pricing 5: Odd page duplex (precise sheet ceiling calculation)", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 5,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "DUPLEX",
      copies: 2
    },
    TEST_CONTEXT
  );

  // 5 pages duplex = ceil(5 / 2) = 3 sheets per copy
  // 3 sheets * 2 copies = 6 sheets!
  // Sides = 5 * 2 = 10 sides
  // 10 sides * 150 paise = 1500 paise (₹15.00)
  assert.equal(quote.estimatedSheets, 6);
  assert.equal(quote.printedSides, 10);
  assert.equal(quote.totalPaise, 1500);
});

test("Pricing 6: A4 Color", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "COLOR_PRINT",
      totalDocumentPages: 10,
      paperSize: "A4",
      printMode: "COLOR",
      sideMode: "SINGLE",
      copies: 1
    },
    TEST_CONTEXT
  );

  // 10 pages * 1000 paise = 10000 paise (₹100.00)
  assert.equal(quote.printedSides, 10);
  assert.equal(quote.totalPaise, 10000);
});

test("Pricing 7: A3 Color", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "COLOR_PRINT",
      totalDocumentPages: 5,
      paperSize: "A3",
      printMode: "COLOR",
      sideMode: "SINGLE",
      copies: 1
    },
    TEST_CONTEXT
  );

  // 5 pages * 2500 paise = 12500 paise (₹125.00)
  assert.equal(quote.printedSides, 5);
  assert.equal(quote.totalPaise, 12500);
});

test("Pricing 8: Spiral binding finishing", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 10,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "SINGLE",
      copies: 2,
      finishingOptions: ["SPIRAL_BINDING"]
    },
    TEST_CONTEXT
  );

  // Base print: 10 * 2 = 20 sides * 200 paise = 4000 paise
  // Spiral binding: FIXED_PER_COPY = 2 copies * 3500 paise = 7000 paise
  // Total: 11000 paise (₹110.00)
  assert.equal(quote.totalPaise, 11000);
  const spiralItem = quote.lineItems.find(i => i.code === "FINISHING_SPIRAL_BINDING");
  assert.notEqual(spiralItem, undefined);
  assert.equal(spiralItem.totalPaise, 7000);
});

test("Pricing 9: Lamination finishing", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 5,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "SINGLE",
      copies: 1,
      finishingOptions: ["LAMINATION"]
    },
    TEST_CONTEXT
  );

  // Base print: 5 sides * 200 = 1000 paise
  // Lamination: PER_SHEET = 5 sheets * 2000 paise = 10000 paise
  // Total: 11000 paise (₹110.00)
  assert.equal(quote.totalPaise, 11000);
  const lamItem = quote.lineItems.find(i => i.code === "FINISHING_LAMINATION");
  assert.notEqual(lamItem, undefined);
  assert.equal(lamItem.totalPaise, 10000);
});

test("Pricing 10: Minimum charge at rule level", () => {
  const ctxWithRuleMin = {
    ...TEST_CONTEXT,
    pricingRules: [
      {
        ...TEST_CONTEXT.pricingRules[0],
        minimumChargePaise: 800 // Rule has ₹8.00 minimum
      }
    ]
  };

  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 2,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "SINGLE",
      copies: 1
    },
    ctxWithRuleMin
  );

  // 2 sides * 200 = 400 paise, adjusted to rule minimum 800 paise
  assert.equal(quote.lineItems[0].totalPaise, 800);
  assert.equal(quote.totalPaise, 800);
});

test("Pricing 11: Quantity tier boundary (VOLUME RATE)", () => {
  // Boundary 20 sides: in tier 1-20 (200 paise) = 4000 paise
  const quote20 = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 20,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "SINGLE",
      copies: 1
    },
    TEST_CONTEXT
  );
  assert.equal(quote20.totalPaise, 4000);

  // Boundary 21 sides: in tier 21-100 (180 paise) = 21 * 180 = 3780 paise
  const quote21 = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 21,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "SINGLE",
      copies: 1
    },
    TEST_CONTEXT
  );
  assert.equal(quote21.totalPaise, 3780);
});

test("Pricing 12: Quote expiration (15 minutes validity)", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 5,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "SINGLE",
      copies: 1
    },
    TEST_CONTEXT
  );

  const calcTime = new Date(quote.calculatedAt).getTime();
  const expireTime = new Date(quote.expiresAt).getTime();
  const diffMinutes = Math.round((expireTime - calcTime) / (60 * 1000));
  assert.equal(diffMinutes, 15, "Quote validity must be 15 minutes");
});

test("Pricing 13: Missing pricing rule throws PRICING_NOT_CONFIGURED", () => {
  assert.throws(
    () => {
      calculatePrintQuote(
        {
          shopId: "shakeel-online-services",
          serviceCode: "BW_PRINT",
          totalDocumentPages: 5,
          paperSize: "A3", // No A3 BW single rule in TEST_CONTEXT
          printMode: "BW",
          sideMode: "SINGLE",
          copies: 1
        },
        TEST_CONTEXT
      );
    },
    (err) => err.code === "PRICING_NOT_CONFIGURED"
  );
});

test("Pricing 14: Disabled service throws SERVICE_DISABLED", () => {
  assert.throws(
    () => {
      calculatePrintQuote(
        {
          shopId: "shakeel-online-services",
          serviceCode: "DOCUMENT_PRINT", // Disabled service
          totalDocumentPages: 5,
          paperSize: "A4",
          printMode: "BW",
          sideMode: "SINGLE",
          copies: 1
        },
        TEST_CONTEXT
      );
    },
    (err) => err.code === "SERVICE_DISABLED"
  );
});

test("Pricing 15: Invalid copies throws INVALID_COPIES", () => {
  assert.throws(
    () => {
      calculatePrintQuote(
        {
          shopId: "shakeel-online-services",
          serviceCode: "BW_PRINT",
          totalDocumentPages: 5,
          paperSize: "A4",
          printMode: "BW",
          sideMode: "SINGLE",
          copies: 0 // Invalid
        },
        TEST_CONTEXT
      );
    },
    (err) => err.code === "INVALID_COPIES"
  );
});

test("Pricing 16: Out-of-range pages throws INVALID_PAGE_RANGE", () => {
  assert.throws(
    () => {
      calculatePrintQuote(
        {
          shopId: "shakeel-online-services",
          serviceCode: "BW_PRINT",
          totalDocumentPages: 10,
          selectedPageRange: "1-5, 25", // 25 exceeds 10
          paperSize: "A4",
          printMode: "BW",
          sideMode: "SINGLE",
          copies: 1
        },
        TEST_CONTEXT
      );
    },
    (err) => err.code === "INVALID_PAGE_RANGE"
  );
});

test("Pricing 17: Integer paise precision (zero floating-point drift)", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 7,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "DUPLEX",
      copies: 3
    },
    TEST_CONTEXT
  );

  assert.equal(Number.isInteger(quote.subtotalPaise), true);
  assert.equal(Number.isInteger(quote.totalPaise), true);
  for (const item of quote.lineItems) {
    assert.equal(Number.isInteger(item.unitPricePaise), true);
    assert.equal(Number.isInteger(item.totalPaise), true);
  }
});

test("Pricing 18: Changing pricing after quote does not mutate snapshot", () => {
  const quote = calculatePrintQuote(
    {
      shopId: "shakeel-online-services",
      serviceCode: "BW_PRINT",
      totalDocumentPages: 10,
      paperSize: "A4",
      printMode: "BW",
      sideMode: "SINGLE",
      copies: 1
    },
    TEST_CONTEXT
  );

  const snapshot = createPricingSnapshot(quote, TEST_CONTEXT.pricingRules);

  // Now mutate active rate in context
  TEST_CONTEXT.pricingRules[0].unitPricePaise = 99999;

  // Snapshot must remain completely unchanged
  assert.equal(snapshot.totalPaise, quote.totalPaise);
  assert.equal(snapshot.unitAmounts["PRINT_A4_BW_SINGLE"], 200);
});
