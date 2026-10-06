export type ServiceCode =
  | 'DOCUMENT_PRINT'
  | 'BW_PRINT'
  | 'COLOR_PRINT'
  | 'PHOTO_PRINT'
  | 'SCAN'
  | 'XEROX_COPY'
  | 'SPIRAL_BINDING'
  | 'LAMINATION';

export type ServiceCategory = 'PRINT' | 'SCAN' | 'COPY' | 'FINISHING' | 'OTHER';

export interface Service {
  id: string;
  organizationId: string;
  shopId: string;
  code: ServiceCode;
  name: string;
  description: string;
  category: ServiceCategory;
  enabled: boolean;
  displayOrder: number;
  publicVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaperSizeCode = 'A4' | 'A3' | 'A5' | 'LEGAL' | 'LETTER' | '4X6_PHOTO' | 'CUSTOM';

export interface PaperSizeConfig {
  code: PaperSizeCode | string;
  displayName: string;
  widthMm: number;
  heightMm: number;
  enabled: boolean;
  displayOrder: number;
}

export type PaperTypeCode =
  | 'NORMAL_70_GSM'
  | 'NORMAL_80_GSM'
  | '100_GSM'
  | 'GLOSSY'
  | 'MATTE'
  | 'PHOTO'
  | 'CARD_STOCK'
  | 'CUSTOM';

export interface PaperTypeConfig {
  code: PaperTypeCode | string;
  name: string;
  gsm?: number;
  category: 'STANDARD' | 'PHOTO' | 'HEAVY' | 'SPECIAL';
  enabled: boolean;
}

export type PrintMode = 'BW' | 'COLOR';
export type SideMode = 'SINGLE' | 'DUPLEX';
export type Orientation = 'AUTO' | 'PORTRAIT' | 'LANDSCAPE';
export type Scaling = 'FIT' | 'ACTUAL_SIZE';

export type FinishingCode =
  | 'NONE'
  | 'SPIRAL_BINDING'
  | 'LAMINATION'
  | 'STAPLING'
  | 'COMB_BINDING'
  | 'HARD_BINDING'
  | 'BOOKLET'
  | 'CUTTING';

export type FinishingPricingType = 'FIXED_PER_COPY' | 'PER_SHEET' | 'FIXED' | 'PER_UNIT';

export interface FinishingConfig {
  code: FinishingCode | string;
  name: string;
  enabled: boolean;
  pricingType: FinishingPricingType;
  fixedPricePaise: number;
  perUnitChargePaise?: number;
  metadata?: Record<string, unknown>;
}

export type BillingUnit =
  | 'PER_PRINTED_SIDE'
  | 'PER_SHEET'
  | 'PER_COPY'
  | 'FIXED'
  | 'PER_ITEM';

export interface VolumeRateTier {
  minUnits: number;
  maxUnits?: number;
  unitPricePaise: number;
}

export interface PricingRule {
  id: string;
  organizationId: string;
  shopId: string;
  serviceCode: ServiceCode | string;
  paperSizeCode: PaperSizeCode | string;
  paperTypeCode?: PaperTypeCode | string;
  printMode: PrintMode;
  sideMode?: SideMode;
  billingUnit: BillingUnit;
  unitPricePaise: number; // strictly integer paise
  minimumChargePaise?: number;
  quantityTiers?: VolumeRateTier[];
  enabled: boolean;
  effectiveFrom?: string;
  effectiveUntil?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface ShopPricingSettings {
  id?: string;
  shopId: string;
  organizationId: string;
  minimumOrderPaise: number; // strictly integer paise (e.g. 500 = ₹5.00)
  taxEnabled: boolean;
  taxName?: string;
  taxRateBasisPoints: number; // e.g. 1800 for 18%, integer
  pricesIncludeTax: boolean;
  currency: 'INR';
  updatedAt: string;
}

export interface PriceQuoteInput {
  shopId: string;
  serviceCode: ServiceCode | string;
  totalDocumentPages: number;
  selectedPageRange?: string;
  selectedPages?: number[];
  selectedPageCount?: number;
  paperSize: PaperSizeCode | string;
  paperType?: PaperTypeCode | string;
  printMode: PrintMode;
  sideMode: SideMode;
  copies: number;
  orientation?: Orientation;
  scaling?: Scaling;
  finishingOptions?: (FinishingCode | string)[];
  priority?: 'NORMAL' | 'EXPRESS';
  deliveryMode?: 'STORE_PICKUP' | 'LOCAL_DELIVERY';
}

export interface PriceQuoteLineItem {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPricePaise: number; // integer paise
  totalPaise: number;     // integer paise
  calculationNotes: string;
}

export interface PriceQuote {
  quoteId: string;
  shopId: string;
  currency: 'INR';
  serviceCode: string;
  selectedPages: number[];
  selectedPageCount: number;
  copies: number;
  printedSides: number;
  estimatedSheets: number;
  lineItems: PriceQuoteLineItem[];
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  pricingVersion: string;
  calculatedAt: string;
  expiresAt: string;
}

export interface PricingSnapshot {
  quoteId: string;
  pricingRuleIds: string[];
  pricingVersion: string;
  unitAmounts: Record<string, number>;
  quantities: Record<string, number>;
  lineItems: PriceQuoteLineItem[];
  subtotalPaise: number;
  taxPaise: number;
  discountPaise: number;
  totalPaise: number;
  currency: 'INR';
  calculatedAt: string;
}

export type PricingErrorCode =
  | 'PRICING_NOT_CONFIGURED'
  | 'SERVICE_DISABLED'
  | 'PAPER_SIZE_DISABLED'
  | 'PAPER_TYPE_DISABLED'
  | 'FINISHING_OPTION_DISABLED'
  | 'INVALID_COPIES'
  | 'INVALID_PAGE_COUNT'
  | 'INVALID_PAGE_RANGE'
  | 'SHOP_INACTIVE';

export class PricingEngineError extends Error {
  code: PricingErrorCode;
  details?: Record<string, unknown>;

  constructor(code: PricingErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'PricingEngineError';
    this.code = code;
    this.details = details;
  }
}

// Backwards compatibility types for Phase 0/1 test suites
export interface QuantitySlab {
  minSides: number;
  maxSides?: number;
  pricePerSide: number;
}

export interface ServicePricingRules {
  a4BwSingle: number;
  a4BwDouble: number;
  a4ColorSingle: number;
  a4ColorDouble: number;
  a3BwSingle: number;
  a3BwDouble: number;
  a3ColorSingle: number;
  a3ColorDouble: number;
  photoPaperExtra: number;
  spiralBindingBase: number;
  spiralBindingPerSheet: number;
  laminationA4: number;
  laminationA3: number;
  minimumOrderAmount: number;
  taxRatePercent: number;
  quantitySlabs?: QuantitySlab[];
}

export interface PriceCalculationInput {
  shopId: string;
  pageCount: number;
  selectedPages: number[];
  paperSize: 'A4' | 'A3' | 'LEGAL' | 'LETTER' | 'PHOTO_4X6';
  colorMode: 'BW' | 'COLOR';
  duplexMode: 'SINGLE' | 'DOUBLE';
  copies: number;
  paperType: 'NORMAL_75GSM' | 'BOND_85GSM' | 'GLOSSY_PHOTO' | 'MATTE_PHOTO';
  finishing: 'NONE' | 'SPIRAL_BINDING' | 'LAMINATION' | 'STAPLING';
  customPricing?: Partial<ServicePricingRules>;
}

export interface PriceCalculationResult {
  totalSides: number;
  sheetCount: number;
  printCost: number;
  paperCost: number;
  finishingCost: number;
  discount: number;
  tax: number;
  subtotal: number;
  total: number;
  currency: 'INR';
}
