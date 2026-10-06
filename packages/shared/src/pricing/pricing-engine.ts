import {
  PriceQuoteInput,
  PriceQuote,
  PriceQuoteLineItem,
  PricingRule,
  Service,
  PaperSizeConfig,
  PaperTypeConfig,
  FinishingConfig,
  ShopPricingSettings,
  PricingSnapshot,
  PricingEngineError,
  PriceCalculationInput,
  PriceCalculationResult,
  ServicePricingRules
} from '../types/pricing';
import { parsePageRange } from '../utils/page-range';

export interface QuoteCalculationContext {
  services: Service[];
  paperSizes: PaperSizeConfig[];
  paperTypes?: PaperTypeConfig[];
  finishingOptions?: FinishingConfig[];
  pricingRules: PricingRule[];
  shopSettings?: ShopPricingSettings;
}

/**
 * Authoritative S2P Pricing Engine (Phase 2)
 * Pure domain logic. Operates strictly in integer paise.
 * Never uses floating-point rupees for authoritative calculations.
 */
export function calculatePrintQuote(
  input: PriceQuoteInput,
  context: QuoteCalculationContext
): PriceQuote {
  // 1. Validate Copies
  if (!input.copies || typeof input.copies !== 'number' || input.copies < 1 || !Number.isInteger(input.copies)) {
    throw new PricingEngineError('INVALID_COPIES', 'Copies must be an integer greater than or equal to 1', {
      providedCopies: input.copies
    });
  }
  if (input.copies > 1000) {
    throw new PricingEngineError('INVALID_COPIES', 'Copies exceeds maximum order limit of 1000', {
      providedCopies: input.copies
    });
  }

  // 2. Validate Document Pages
  if (!input.totalDocumentPages || input.totalDocumentPages < 1 || !Number.isInteger(input.totalDocumentPages)) {
    throw new PricingEngineError('INVALID_PAGE_COUNT', 'Total document pages must be an integer greater than 0', {
      totalDocumentPages: input.totalDocumentPages
    });
  }

  // 3. Resolve Selected Pages
  let selectedPages: number[] = [];
  if (input.selectedPages && input.selectedPages.length > 0) {
    for (const p of input.selectedPages) {
      if (p < 1 || p > input.totalDocumentPages || !Number.isInteger(p)) {
        throw new PricingEngineError('INVALID_PAGE_RANGE', `Page number ${p} is out of bounds (1-${input.totalDocumentPages})`);
      }
    }
    selectedPages = Array.from(new Set(input.selectedPages)).sort((a, b) => a - b);
  } else if (input.selectedPageRange && input.selectedPageRange.trim()) {
    try {
      selectedPages = parsePageRange(input.selectedPageRange, input.totalDocumentPages);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid page range specification';
      throw new PricingEngineError('INVALID_PAGE_RANGE', msg, { range: input.selectedPageRange });
    }
  } else {
    selectedPages = Array.from({ length: input.totalDocumentPages }, (_, i) => i + 1);
  }

  if (selectedPages.length === 0) {
    throw new PricingEngineError('INVALID_PAGE_COUNT', 'No valid printable pages were selected for calculation');
  }

  const selectedPageCount = selectedPages.length;

  // 4. Validate Service Enabled
  const matchedService = context.services.find(s => s.code === input.serviceCode && s.shopId === input.shopId);
  if (!matchedService) {
    throw new PricingEngineError('SERVICE_DISABLED', `Service "${input.serviceCode}" is not configured for shop "${input.shopId}"`, {
      serviceCode: input.serviceCode,
      shopId: input.shopId
    });
  }
  if (!matchedService.enabled) {
    throw new PricingEngineError('SERVICE_DISABLED', `Service "${matchedService.name}" is currently disabled by shop management`, {
      serviceCode: input.serviceCode,
      serviceName: matchedService.name
    });
  }

  // 5. Validate Paper Size Enabled
  const matchedPaperSize = context.paperSizes.find(p => p.code === input.paperSize);
  if (!matchedPaperSize || !matchedPaperSize.enabled) {
    throw new PricingEngineError('PAPER_SIZE_DISABLED', `Paper size "${input.paperSize}" is not available or currently disabled`, {
      paperSize: input.paperSize
    });
  }

  // 6. Validate Paper Type (if specified)
  if (input.paperType && context.paperTypes) {
    const matchedPaperType = context.paperTypes.find(pt => pt.code === input.paperType);
    if (matchedPaperType && !matchedPaperType.enabled) {
      throw new PricingEngineError('PAPER_TYPE_DISABLED', `Paper type "${input.paperType}" is currently disabled`, {
        paperType: input.paperType
      });
    }
  }

  // 7. Calculate Printable Sides and Physical Sheets
  // PDF = 20 selected pages, Copies = 2
  // Printable page sides: 20 * 2 = 40
  // For SINGLE: sheet estimate = 20 * 2 = 40
  // For DUPLEX: sheet estimate = ceil(20 / 2) * 2 = 10 * 2 = 20
  const printedSides = selectedPageCount * input.copies;
  const isDuplex = input.sideMode === 'DUPLEX';
  const sheetsPerCopy = isDuplex ? Math.ceil(selectedPageCount / 2) : selectedPageCount;
  const estimatedSheets = sheetsPerCopy * input.copies;

  // 8. Authoritative Pricing Rule Lookup
  // Search for the most specific rule for: shopId + serviceCode + paperSize + printMode + sideMode
  const matchingRules = context.pricingRules.filter(r =>
    r.enabled &&
    r.shopId === input.shopId &&
    (r.serviceCode === input.serviceCode || r.serviceCode === 'DOCUMENT_PRINT') &&
    r.paperSizeCode === input.paperSize &&
    r.printMode === input.printMode
  );

  // Match exact side mode if configured, else fallback to generic rule
  const exactRule = matchingRules.find(r => r.sideMode === input.sideMode) ||
                    matchingRules.find(r => !r.sideMode);

  if (!exactRule) {
    throw new PricingEngineError(
      'PRICING_NOT_CONFIGURED',
      `No active pricing rule found for ${input.serviceCode} (${input.paperSize}, ${input.printMode}, ${input.sideMode}). Configuration required in shop settings.`,
      {
        shopId: input.shopId,
        serviceCode: input.serviceCode,
        paperSize: input.paperSize,
        printMode: input.printMode,
        sideMode: input.sideMode
      }
    );
  }

  // 9. Determine Unit Price with Quantity Tiers (VOLUME RATE)
  // In S2P V1 VOLUME RATE: The matched quantity tier sets the per-unit price for all units for that item
  let effectiveUnitPricePaise = exactRule.unitPricePaise;
  let appliedTier: { minUnits: number; maxUnits?: number; unitPricePaise: number } | null = null;

  if (exactRule.quantityTiers && exactRule.quantityTiers.length > 0) {
    const tierQuantity = exactRule.billingUnit === 'PER_SHEET' ? estimatedSheets : printedSides;
    for (const tier of exactRule.quantityTiers) {
      if (tierQuantity >= tier.minUnits && (!tier.maxUnits || tierQuantity <= tier.maxUnits)) {
        effectiveUnitPricePaise = tier.unitPricePaise;
        appliedTier = tier;
        break;
      }
    }
  }

  // 10. Calculate Base Print Charge
  const lineItems: PriceQuoteLineItem[] = [];

  let basePrintQuantity = printedSides;
  if (exactRule.billingUnit === 'PER_SHEET') {
    basePrintQuantity = estimatedSheets;
  } else if (exactRule.billingUnit === 'PER_COPY') {
    basePrintQuantity = input.copies;
  } else if (exactRule.billingUnit === 'FIXED') {
    basePrintQuantity = 1;
  }

  let basePrintTotalPaise = basePrintQuantity * effectiveUnitPricePaise;
  if (exactRule.minimumChargePaise && basePrintTotalPaise < exactRule.minimumChargePaise) {
    basePrintTotalPaise = exactRule.minimumChargePaise;
  }

  const printItemNotes = appliedTier
    ? `Volume tier applied: ${basePrintQuantity} ${exactRule.billingUnit} × ₹${(effectiveUnitPricePaise / 100).toFixed(2)}`
    : `${basePrintQuantity} ${exactRule.billingUnit} × ₹${(effectiveUnitPricePaise / 100).toFixed(2)}`;

  lineItems.push({
    code: `PRINT_${input.paperSize}_${input.printMode}_${input.sideMode}`,
    name: `${matchedPaperSize.displayName} ${input.printMode === 'BW' ? 'Black & White' : 'Color'} Print (${isDuplex ? 'Double-Sided' : 'Single-Sided'})`,
    unit: exactRule.billingUnit,
    quantity: basePrintQuantity,
    unitPricePaise: effectiveUnitPricePaise,
    totalPaise: basePrintTotalPaise,
    calculationNotes: printItemNotes
  });

  // 11. Calculate Finishing Charges
  if (input.finishingOptions && input.finishingOptions.length > 0 && context.finishingOptions) {
    for (const optCode of input.finishingOptions) {
      if (optCode === 'NONE') continue;

      const finishConfig = context.finishingOptions.find(f => f.code === optCode);
      if (!finishConfig) {
        throw new PricingEngineError('FINISHING_OPTION_DISABLED', `Finishing option "${optCode}" is not recognized`);
      }
      if (!finishConfig.enabled) {
        throw new PricingEngineError('FINISHING_OPTION_DISABLED', `Finishing option "${finishConfig.name}" is currently disabled by shop`);
      }

      let finishQty = 1;
      let finishUnitPricePaise = finishConfig.fixedPricePaise;
      let finishTotalPaise = 0;

      if (finishConfig.pricingType === 'FIXED_PER_COPY') {
        finishQty = input.copies;
        finishTotalPaise = finishQty * finishConfig.fixedPricePaise;
      } else if (finishConfig.pricingType === 'PER_SHEET') {
        finishQty = estimatedSheets;
        const rate = finishConfig.perUnitChargePaise || finishConfig.fixedPricePaise;
        finishUnitPricePaise = rate;
        finishTotalPaise = finishQty * rate;
      } else {
        // FIXED
        finishQty = 1;
        finishTotalPaise = finishConfig.fixedPricePaise;
      }

      lineItems.push({
        code: `FINISHING_${finishConfig.code}`,
        name: finishConfig.name,
        unit: finishConfig.pricingType,
        quantity: finishQty,
        unitPricePaise: finishUnitPricePaise,
        totalPaise: finishTotalPaise,
        calculationNotes: `${finishQty} units × ₹${(finishUnitPricePaise / 100).toFixed(2)}`
      });
    }
  }

  // 12. Subtotal and Minimum Order Threshold
  let subtotalPaise = lineItems.reduce((acc, item) => acc + item.totalPaise, 0);

  if (context.shopSettings?.minimumOrderPaise && subtotalPaise < context.shopSettings.minimumOrderPaise) {
    const adjustmentPaise = context.shopSettings.minimumOrderPaise - subtotalPaise;
    lineItems.push({
      code: 'MINIMUM_ORDER_ADJUSTMENT',
      name: 'Minimum Order Charge Adjustment',
      unit: 'FIXED',
      quantity: 1,
      unitPricePaise: adjustmentPaise,
      totalPaise: adjustmentPaise,
      calculationNotes: `Subtotal ₹${(subtotalPaise / 100).toFixed(2)} adjusted to shop minimum threshold ₹${(context.shopSettings.minimumOrderPaise / 100).toFixed(2)}`
    });
    subtotalPaise = context.shopSettings.minimumOrderPaise;
  }

  // 13. Tax Calculation (configurable in basis points: 100 basis points = 1%)
  let taxPaise = 0;
  if (context.shopSettings?.taxEnabled && context.shopSettings.taxRateBasisPoints > 0) {
    taxPaise = Math.round((subtotalPaise * context.shopSettings.taxRateBasisPoints) / 10000);
  }

  const discountPaise = 0;
  const totalPaise = subtotalPaise + taxPaise - discountPaise;

  const now = new Date();
  const calculatedAt = now.toISOString();
  // 15-minute quote expiration
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    quoteId,
    shopId: input.shopId,
    currency: 'INR',
    serviceCode: input.serviceCode,
    selectedPages,
    selectedPageCount,
    copies: input.copies,
    printedSides,
    estimatedSheets,
    lineItems,
    subtotalPaise,
    discountPaise,
    taxPaise,
    totalPaise,
    pricingVersion: '2.0.0',
    calculatedAt,
    expiresAt
  };
}

/**
 * Creates an immutable PricingSnapshot for future order preservation.
 */
export function createPricingSnapshot(
  quote: PriceQuote,
  rules: PricingRule[]
): PricingSnapshot {
  const ruleIds = rules.map(r => r.id);
  const unitAmounts: Record<string, number> = {};
  const quantities: Record<string, number> = {};

  for (const item of quote.lineItems) {
    unitAmounts[item.code] = item.unitPricePaise;
    quantities[item.code] = item.quantity;
  }

  return {
    quoteId: quote.quoteId,
    pricingRuleIds: ruleIds,
    pricingVersion: quote.pricingVersion,
    unitAmounts,
    quantities,
    lineItems: quote.lineItems.map(item => ({ ...item })),
    subtotalPaise: quote.subtotalPaise,
    taxPaise: quote.taxPaise,
    discountPaise: quote.discountPaise,
    totalPaise: quote.totalPaise,
    currency: quote.currency,
    calculatedAt: quote.calculatedAt
  };
}

// -------------------------------------------------------------
// Backwards compatibility layer for Phase 0 / Phase 1 tests
// -------------------------------------------------------------
export const DEFAULT_SHAKEEL_PRICING: ServicePricingRules = {
  a4BwSingle: 2.0,
  a4BwDouble: 3.0,
  a4ColorSingle: 10.0,
  a4ColorDouble: 18.0,
  a3BwSingle: 10.0,
  a3BwDouble: 15.0,
  a3ColorSingle: 25.0,
  a3ColorDouble: 40.0,
  photoPaperExtra: 15.0,
  spiralBindingBase: 30.0,
  spiralBindingPerSheet: 0.2,
  laminationA4: 20.0,
  laminationA3: 40.0,
  minimumOrderAmount: 5.0,
  taxRatePercent: 0,
  quantitySlabs: [
    { minSides: 1, maxSides: 20, pricePerSide: 2.0 },
    { minSides: 21, maxSides: 100, pricePerSide: 1.8 },
    { minSides: 101, maxSides: 500, pricePerSide: 1.5 },
    { minSides: 501, pricePerSide: 1.2 }
  ]
};

export function calculatePrintPrice(input: PriceCalculationInput): PriceCalculationResult {
  const custom = input.customPricing || {};
  const rules = {
    ...DEFAULT_SHAKEEL_PRICING,
    ...custom,
    quantitySlabs: custom.quantitySlabs !== undefined
      ? custom.quantitySlabs
      : ((custom.a4BwSingle !== undefined || custom.a4BwDouble !== undefined) ? [] : DEFAULT_SHAKEEL_PRICING.quantitySlabs)
  };
  const pagesPerCopy = input.selectedPages.length;
  const copies = Math.max(1, input.copies || 1);
  const totalSides = pagesPerCopy * copies;

  if (totalSides === 0) {
    return {
      totalSides: 0,
      sheetCount: 0,
      printCost: 0,
      paperCost: 0,
      finishingCost: 0,
      discount: 0,
      tax: 0,
      subtotal: 0,
      total: rules.minimumOrderAmount,
      currency: 'INR'
    };
  }

  const isDuplex = input.duplexMode === 'DOUBLE';
  const sheetsPerCopy = isDuplex ? Math.ceil(pagesPerCopy / 2) : pagesPerCopy;
  const totalSheets = sheetsPerCopy * copies;

  let ratePerSide = 2.0;
  if (input.paperSize === 'A3') {
    if (input.colorMode === 'COLOR') {
      ratePerSide = isDuplex ? rules.a3ColorDouble / 2 : rules.a3ColorSingle;
    } else {
      ratePerSide = isDuplex ? rules.a3BwDouble / 2 : rules.a3BwSingle;
    }
  } else {
    if (input.colorMode === 'COLOR') {
      ratePerSide = isDuplex ? rules.a4ColorDouble / 2 : rules.a4ColorSingle;
    } else {
      ratePerSide = isDuplex ? rules.a4BwDouble / 2 : rules.a4BwSingle;
    }
  }

  if (input.paperSize === 'A4' && input.colorMode === 'BW' && rules.quantitySlabs && rules.quantitySlabs.length > 0) {
    for (const slab of rules.quantitySlabs) {
      if (totalSides >= slab.minSides && (!slab.maxSides || totalSides <= slab.maxSides)) {
        ratePerSide = isDuplex ? (slab.pricePerSide * 1.5) / 2 : slab.pricePerSide;
        break;
      }
    }
  }

  const printCost = Math.round(totalSides * ratePerSide * 100) / 100;

  let paperCost = 0;
  if (input.paperType === 'GLOSSY_PHOTO' || input.paperType === 'MATTE_PHOTO') {
    paperCost = Math.round(totalSheets * rules.photoPaperExtra * 100) / 100;
  }

  let finishingCost = 0;
  if (input.finishing === 'SPIRAL_BINDING') {
    finishingCost = Math.round((rules.spiralBindingBase + (sheetsPerCopy * rules.spiralBindingPerSheet)) * copies * 100) / 100;
  } else if (input.finishing === 'LAMINATION') {
    const lamRate = input.paperSize === 'A3' ? rules.laminationA3 : rules.laminationA4;
    finishingCost = Math.round(totalSheets * lamRate * 100) / 100;
  }

  const subtotal = Math.round((printCost + paperCost + finishingCost) * 100) / 100;
  const tax = rules.taxRatePercent > 0 ? Math.round((subtotal * rules.taxRatePercent / 100) * 100) / 100 : 0;
  const rawTotal = subtotal + tax;
  const total = Math.max(rules.minimumOrderAmount, Math.round(rawTotal * 100) / 100);

  return {
    totalSides,
    sheetCount: totalSheets,
    printCost,
    paperCost,
    finishingCost,
    discount: 0,
    tax,
    subtotal,
    total,
    currency: 'INR'
  };
}
