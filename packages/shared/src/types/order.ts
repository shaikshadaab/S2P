import { OrderFile } from './file';

export interface OrderDraft {
  id: string;
  shopId: string;
  organizationId: string;
  isGuest: boolean;
  guestSessionId?: string | null;
  ownerUid?: string | null;
  status: 'DRAFT' | 'READY_FOR_UPLOAD' | 'CONVERTED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
  convertedOrderId?: string | null;
}

export type OrderStatus =
  | 'DRAFT'
  | 'FILE_PROCESSING'
  | 'CONFIGURED'
  | 'AWAITING_PAYMENT'
  | 'RECEIVED'
  | 'ACCEPTED'
  | 'QUEUED_FOR_PRINT'
  | 'PRINTING'
  | 'FINISHING'
  | 'READY'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'PAYMENT_FAILED'
  | 'CANCELLED'
  | 'PRINT_FAILED'
  | 'REPRINT_REQUIRED'
  | 'STATUS_UNKNOWN';

export type PaymentStatus =
  | 'UNPAID'
  | 'CASH_PENDING'
  | 'UPI_PENDING'
  | 'MANUAL_UPI_REVIEW_PENDING'
  | 'MANUAL_UPI_NOT_FOUND'
  | 'PAID'
  | 'PENDING'
  | 'MANUAL_VERIFICATION_REQUIRED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'CASH'
  | 'MANUAL_UPI'
  | 'ONLINE_GATEWAY';

export type PaperSize = 'A4' | 'A3' | 'A2' | 'A1' | 'LEGAL' | 'LETTER' | 'PHOTO_4X6' | 'PASSPORT_PHOTO_SHEET';
export type PrintColorMode = 'BW' | 'COLOR';
export type PrintDuplexMode = 'SINGLE' | 'DOUBLE';
export type PrintOrientation = 'AUTO' | 'PORTRAIT' | 'LANDSCAPE';
export type PageOrientation = PrintOrientation;
export type PrintScaling = 'FIT' | 'ACTUAL_SIZE';
export type PrintFitMode = PrintScaling;
export type PaperType = 'NORMAL_75GSM' | 'BOND_85GSM' | 'GLOSSY_PHOTO' | 'MATTE_PHOTO';
export type FinishingType = 'NONE' | 'SPIRAL_BINDING' | 'LAMINATION' | 'STAPLING';

export interface PrintConfiguration {
  paperSize: PaperSize;
  colorMode: PrintColorMode;
  duplexMode: PrintDuplexMode;
  copies: number;
  pageRange: string;
  orientation: PrintOrientation;
  scaling: PrintScaling;
  fitMode?: PrintFitMode;
  paperType: PaperType;
  finishing: FinishingType;
}

export interface PriceSnapshot {
  calculatedAt: string;
  pricingVersion: string;
  pricingRuleIds?: string[];
  orientation?: PrintOrientation;
  scaling?: PrintScaling;
  pageCount: number;
  totalSides: number;
  sheetCount: number;
  printCostPaise: number;
  paperCostPaise: number;
  finishingCostPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  printCost: number;
  paperCost: number;
  finishingCost: number;
  discount: number;
  tax: number;
  total: number;
  currency: 'INR';
}

export interface OrderItem {
  id: string;
  itemId?: string;
  orderId: string;
  fileId: string;
  file?: OrderFile;
  config: PrintConfiguration;
  selectedPages: number[];
  selectedPageCount: number;
  orientation?: PrintOrientation;
  scaling?: PrintScaling;
  printedSides: number;
  estimatedSheets: number;
  pricingSnapshot: PriceSnapshot;
  printMasterSnapshot?: any;
  printerRoute?: {
    printerId?: string | null;
    queueName?: string | null;
    deviceId?: string | null;
    routedAt?: string;
  };
  sortOrder?: number;
}

export interface OrderTimelineEvent {
  id: string;
  status: OrderStatus;
  timestamp: string;
  actorId: string;
  actorRole: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  organizationId: string;
  shopId: string;
  customerId?: string | null;
  customerName: string;
  customerMobile: string;
  customerPhone?: string;
  customerEmail?: string | null;
  draftId?: string;
  guestSessionId?: string | null;
  ownerUid?: string | null;
  isGuest: boolean;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string | null;
  paymentVerifiedBy?: string | null;
  paymentVerifiedAt?: string | null;
  customerClaimedPaidAt?: string | null;
  customerClaimedUtr?: string | null;
  manualPaymentReference?: string | null;
  currency: 'INR';
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  totalAmount: number;
  items: OrderItem[];
  pricingSnapshot: PriceSnapshot;
  timeline: OrderTimelineEvent[];
  assignedDeviceId?: string | null;
  assignedPrinterId?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteRequest {
  draftId: string;
  fileId: string;
  pageRange?: string;
  selectedPages?: number[];
  paperSize: PaperSize;
  colorMode: PrintColorMode;
  duplexMode: PrintDuplexMode;
  copies: number;
  orientation?: PrintOrientation;
  scaling?: PrintScaling;
  fitMode?: PrintFitMode;
  paperType?: PaperType;
  finishing?: FinishingType;
}

export interface QuoteResponse {
  quoteId: string;
  pricingVersion: string;
  pricingRuleIds?: string[];
  orientation?: PrintOrientation;
  scaling?: PrintScaling;
  shopId: string;
  fileId: string;
  pageCount: number;
  selectedPageCount: number;
  selectedPages: number[];
  copies: number;
  totalSides: number;
  sheetCount: number;
  printCostPaise: number;
  paperCostPaise: number;
  finishingCostPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  totalRupees: number;
  currency: 'INR';
  expiresAt: string;
  calculatedAt: string;
  breakdown: {
    printCost: number;
    paperCost: number;
    finishingCost: number;
    discount: number;
    tax: number;
    total: number;
  };
}

export function generateCustomerOrderNumber(): string {
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const randomSeq = Math.floor(100000 + Math.random() * 900000);
  return `S2P-${yearSuffix}${randomSeq}`;
}

export interface PaymentEvent {
  id: string;
  organizationId: string;
  shopId: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  previousStatus: PaymentStatus | null;
  newStatus: PaymentStatus;
  amountPaise: number;
  actorType: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
  actorUid: string | null;
  actorRole: string | null;
  createdAt: string;
}

export interface OrderStatusHistory {
  id: string;
  organizationId: string;
  shopId: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
  actorUid: string | null;
  actorRole: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface ShopCounter {
  shopId: string;
  year: number;
  lastSequence: number;
  updatedAt: string;
}
