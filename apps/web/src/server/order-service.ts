if (typeof window !== 'undefined') {
  throw new Error('FATAL: order-service is server-only and cannot be imported into a browser bundle.');
}

import crypto from 'crypto';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  calculatePrintPrice,
  parsePageRange,
  canTransitionOrder,
  Order,
  OrderItem,
  OrderDraft,
  OrderFile,
  PriceSnapshot,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  PrintOrientation,
  PrintScaling,
  PaymentEvent,
  OrderStatusHistory,
  Shop,
  PricingRule,
  ShopPrintOptions,
  UserRole,
  ShopMember,
  ServicePricingRules,
  UpiPaymentUtils
} from '@s2p/shared';

export interface CallerIdentity {
  isAuthenticated: boolean;
  uid?: string;
  isGuest: boolean;
  guestSessionId?: string;
  newGuestSessionToken?: string;
}


export function normalizeIndianMobile(raw: string): { valid: boolean; normalized: string; digits: string } {
  if (!raw) return { valid: false, normalized: '', digits: '' };
  let cleaned = raw.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0091')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  const valid = /^[6-9]\d{9}$/.test(cleaned);
  return {
    valid,
    normalized: valid ? `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}` : raw.trim(),
    digits: valid ? cleaned : ''
  };
}

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '—';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    const tenDigits = digitsOnly.slice(-10);
    return `+91 ${tenDigits.slice(0, 3)}*** **${tenDigits.slice(-2)}`;
  }
  return phone;
}

export const VALID_STAFF_ROLES: readonly UserRole[] = [
  'OWNER',
  'MANAGER',
  'COUNTER_STAFF',
  'PRINT_OPERATOR',
  'FINISHING_STAFF'
] as const;

export const DEFAULT_SHOP_PRINT_OPTIONS: ShopPrintOptions = {
  paperSizes: [
    { id: 'A4', label: 'A4 (210 × 297 mm)', enabled: true, sortOrder: 1 },
    { id: 'A3', label: 'A3 (297 × 420 mm)', enabled: true, sortOrder: 2 }
  ],
  paperTypes: [
    { id: 'NORMAL_75GSM', label: 'Standard 75 GSM', enabled: true, sortOrder: 1 },
    { id: 'BOND_85GSM', label: 'Bond 85 GSM', enabled: true, sortOrder: 2 },
    { id: 'GLOSSY_PHOTO', label: 'Glossy Photo Paper', enabled: true, sortOrder: 3 },
    { id: 'MATTE_PHOTO', label: 'Matte Photo Paper', enabled: true, sortOrder: 4 }
  ],
  colorModes: [
    { id: 'BW', label: 'Black & White', enabled: true, sortOrder: 1 },
    { id: 'COLOR', label: 'Full Color', enabled: true, sortOrder: 2 }
  ],
  duplexModes: [
    { id: 'SINGLE', label: 'Single-sided', enabled: true, sortOrder: 1 },
    { id: 'DOUBLE', label: 'Double-sided (Duplex)', enabled: true, sortOrder: 2 }
  ],
  orientations: [
    { id: 'AUTO', label: 'Auto (Recommended)', enabled: true, sortOrder: 1 },
    { id: 'PORTRAIT', label: 'Portrait', enabled: true, sortOrder: 2 },
    { id: 'LANDSCAPE', label: 'Landscape', enabled: true, sortOrder: 3 }
  ],
  scalings: [
    { id: 'FIT', label: 'Fit to Page', enabled: true, sortOrder: 1 },
    { id: 'ACTUAL_SIZE', label: 'Actual Size (100%)', enabled: true, sortOrder: 2 }
  ],
  finishingOptions: [
    { id: 'NONE', label: 'None', enabled: true, sortOrder: 1 },
    { id: 'SPIRAL_BINDING', label: 'Spiral Binding', enabled: true, sortOrder: 2 },
    { id: 'LAMINATION', label: 'Lamination', enabled: true, sortOrder: 3 }
  ]
};

/**
 * Phase 4.2 Fail-closed Option Helper
 * Missing shop.printOptions throws SHOP_OPTIONS_NOT_CONFIGURED in production.
 * Only explicit S2P_TEST_MODE=true allows development defaults.
 */
export function getShopEffectiveOptions(shop: Shop): ShopPrintOptions {
  if (shop.printOptions) {
    return shop.printOptions;
  }
  if (process.env.S2P_TEST_MODE === 'true') {
    return DEFAULT_SHOP_PRINT_OPTIONS;
  }
  throw new Error('SHOP_OPTIONS_NOT_CONFIGURED: Shop print options not configured.');
}

export function validateShopOptions(
  shop: Shop,
  config: {
    paperSize?: string;
    paperType?: string;
    colorMode?: string;
    duplexMode?: string;
    orientation?: string;
    scaling?: string;
    finishing?: string;
  }
) {
  const options = getShopEffectiveOptions(shop);

  if (config.paperSize) {
    const opt = options.paperSizes.find(o => o.id === config.paperSize);
    if (!opt || !opt.enabled) {
      throw new Error('OPTION_DISABLED: Paper size ' + config.paperSize + ' is not enabled for this shop.');
    }
  }

  if (config.paperType) {
    const opt = options.paperTypes.find(o => o.id === config.paperType);
    if (!opt || !opt.enabled) {
      throw new Error('OPTION_DISABLED: Paper type ' + config.paperType + ' is not enabled for this shop.');
    }
  }

  if (config.colorMode) {
    const opt = options.colorModes.find(o => o.id === config.colorMode);
    if (!opt || !opt.enabled) {
      throw new Error('OPTION_DISABLED: Color mode ' + config.colorMode + ' is not enabled for this shop.');
    }
  }

  if (config.duplexMode) {
    const opt = options.duplexModes.find(o => o.id === config.duplexMode);
    if (!opt || !opt.enabled) {
      throw new Error('OPTION_DISABLED: Duplex mode ' + config.duplexMode + ' is not enabled for this shop.');
    }
  }

  if (config.orientation) {
    const opt = options.orientations.find(o => o.id === config.orientation);
    if (!opt || !opt.enabled) {
      throw new Error('OPTION_DISABLED: Orientation ' + config.orientation + ' is not enabled for this shop.');
    }
  }

  if (config.scaling) {
    const opt = options.scalings.find(o => o.id === config.scaling);
    if (!opt || !opt.enabled) {
      throw new Error('OPTION_DISABLED: Scaling ' + config.scaling + ' is not enabled for this shop.');
    }
  }

  if (config.finishing && config.finishing !== 'NONE') {
    const opt = options.finishingOptions.find(o => o.id === config.finishing);
    if (!opt || !opt.enabled) {
      throw new Error('OPTION_DISABLED: Finishing option ' + config.finishing + ' is not enabled for this shop.');
    }
  }
}

/**
 * Section 2 Canonical Helper: getActiveShopMember
 * Validates canonical collection 'shopMembers' and deterministic document ID '{uid}_{shopId}'
 */
export async function getActiveShopMember(
  db: Firestore,
  uid: string,
  shopId: string
): Promise<ShopMember> {
  if (!uid || !shopId) {
    throw new Error('UNAUTHORIZED: uid and shopId are required.');
  }

  const memberDocId = `${uid}_${shopId}`;
  const docRef = db.collection('shopMembers').doc(memberDocId);
  let snap = await docRef.get();

  if (!snap.exists) {
    const querySnap = await db.collection('shopMembers')
      .where('shopId', '==', shopId)
      .where('userId', '==', uid)
      .limit(1)
      .get();
    if (!querySnap.empty) {
      snap = querySnap.docs[0];
    } else {
      const querySnap2 = await db.collection('shopMembers')
        .where('shopId', '==', shopId)
        .where('uid', '==', uid)
        .limit(1)
        .get();
      if (!querySnap2.empty) {
        snap = querySnap2.docs[0];
      }
    }
  }

  if (!snap.exists) {
    throw new Error('UNAUTHORIZED: Staff membership required for this shop.');
  }

  const data = snap.data() as Partial<ShopMember>;
  if (!data || data.status !== 'ACTIVE') {
    throw new Error('FORBIDDEN: Staff membership is inactive or invalid.');
  }

  const docUid = data.userId || (data as any).uid;
  if (docUid !== uid) {
    throw new Error('FORBIDDEN: Membership uid does not match authenticated user.');
  }

  if (data.shopId !== shopId) {
    throw new Error('FORBIDDEN: Membership shopId does not match requested shop.');
  }

  if (!data.role || !VALID_STAFF_ROLES.includes(data.role as UserRole)) {
    throw new Error('FORBIDDEN: Staff role is invalid or unauthorized.');
  }

  return {
    id: memberDocId,
    userId: uid,
    shopId,
    role: data.role as UserRole,
    status: 'ACTIVE',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  } as ShopMember;
}

/**
 * In-Transaction Helper: getActiveShopMemberInTransaction
 */
export async function getActiveShopMemberInTransaction(
  transaction: FirebaseFirestore.Transaction,
  db: Firestore,
  uid: string,
  shopId: string
): Promise<ShopMember> {
  if (!uid || !shopId) {
    throw new Error('UNAUTHORIZED: uid and shopId are required.');
  }

  const memberDocId = `${uid}_${shopId}`;
  const docRef = db.collection('shopMembers').doc(memberDocId);
  const snap = await transaction.get(docRef);

  if (!snap.exists) {
    throw new Error('UNAUTHORIZED: Staff membership required for this shop.');
  }

  const data = snap.data() as Partial<ShopMember>;
  if (!data || data.status !== 'ACTIVE') {
    throw new Error('FORBIDDEN: Staff membership is inactive or invalid.');
  }

  const docUid = data.userId || (data as any).uid;
  if (docUid !== uid) {
    throw new Error('FORBIDDEN: Membership uid does not match authenticated user.');
  }

  if (data.shopId !== shopId) {
    throw new Error('FORBIDDEN: Membership shopId does not match requested shop.');
  }

  if (!data.role || !VALID_STAFF_ROLES.includes(data.role as UserRole)) {
    throw new Error('FORBIDDEN: Staff role is invalid or unauthorized.');
  }

  return {
    id: memberDocId,
    userId: uid,
    shopId,
    role: data.role as UserRole,
    status: 'ACTIVE',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  } as ShopMember;
}

export interface ActivePricingConfiguration {
  version: string;
  rules: PricingRule[];
  customPricing: Partial<ServicePricingRules>;
}

function mapRulesToCustomPricing(rawRules: any[]): Partial<ServicePricingRules> {
  const customPricing: Partial<ServicePricingRules> = {};

  for (const r of rawRules) {
    if (!r) continue;

    // Direct property assignments
    if (typeof r.a4BwSingle === 'number') customPricing.a4BwSingle = r.a4BwSingle;
    if (typeof r.a4BwDouble === 'number') customPricing.a4BwDouble = r.a4BwDouble;
    if (typeof r.a4ColorSingle === 'number') customPricing.a4ColorSingle = r.a4ColorSingle;
    if (typeof r.a4ColorDouble === 'number') customPricing.a4ColorDouble = r.a4ColorDouble;
    if (typeof r.a3BwSingle === 'number') customPricing.a3BwSingle = r.a3BwSingle;
    if (typeof r.a3BwDouble === 'number') customPricing.a3BwDouble = r.a3BwDouble;
    if (typeof r.a3ColorSingle === 'number') customPricing.a3ColorSingle = r.a3ColorSingle;
    if (typeof r.a3ColorDouble === 'number') customPricing.a3ColorDouble = r.a3ColorDouble;
    if (typeof r.photoPaperExtra === 'number') customPricing.photoPaperExtra = r.photoPaperExtra;
    if (typeof r.spiralBindingBase === 'number') customPricing.spiralBindingBase = r.spiralBindingBase;
    if (typeof r.spiralBindingPerSheet === 'number') customPricing.spiralBindingPerSheet = r.spiralBindingPerSheet;
    if (typeof r.laminationA4 === 'number') customPricing.laminationA4 = r.laminationA4;
    if (typeof r.laminationA3 === 'number') customPricing.laminationA3 = r.laminationA3;
    if (typeof r.minimumOrderAmount === 'number') customPricing.minimumOrderAmount = r.minimumOrderAmount;
    if (typeof r.taxRatePercent === 'number') customPricing.taxRatePercent = r.taxRatePercent;

    // Standard PricingRule schema mapping (paperSizeCode, printMode, sideMode, unitPricePaise)
    const rate = typeof r.unitPricePaise === 'number'
      ? r.unitPricePaise / 100
      : (typeof r.unitPriceRupees === 'number'
          ? r.unitPriceRupees
          : (typeof r.pricePerSide === 'number' ? r.pricePerSide : undefined));

    if (typeof rate === 'number' && rate >= 0) {
      const size = r.paperSizeCode || r.paperSize;
      const mode = r.printMode || r.colorMode;
      const side = r.sideMode || r.duplexMode || 'SINGLE';

      if (size === 'A4') {
        if (mode === 'BW') {
          if (side === 'SINGLE') customPricing.a4BwSingle = rate;
          else if (side === 'DOUBLE' || side === 'DUPLEX') customPricing.a4BwDouble = rate;
          else {
            customPricing.a4BwSingle = rate;
            customPricing.a4BwDouble = rate * 1.5;
          }
        } else if (mode === 'COLOR') {
          if (side === 'SINGLE') customPricing.a4ColorSingle = rate;
          else if (side === 'DOUBLE' || side === 'DUPLEX') customPricing.a4ColorDouble = rate;
          else {
            customPricing.a4ColorSingle = rate;
            customPricing.a4ColorDouble = rate * 2;
          }
        }
      } else if (size === 'A3') {
        if (mode === 'BW') {
          if (side === 'SINGLE') customPricing.a3BwSingle = rate;
          else if (side === 'DOUBLE' || side === 'DUPLEX') customPricing.a3BwDouble = rate;
          else {
            customPricing.a3BwSingle = rate;
            customPricing.a3BwDouble = rate * 1.5;
          }
        } else if (mode === 'COLOR') {
          if (side === 'SINGLE') customPricing.a3ColorSingle = rate;
          else if (side === 'DOUBLE' || side === 'DUPLEX') customPricing.a3ColorDouble = rate;
          else {
            customPricing.a3ColorSingle = rate;
            customPricing.a3ColorDouble = rate * 2;
          }
        }
      }
    }
  }

  return customPricing;
}

/**
 * Section 3 & 4: Load Firestore pricing rules and return strictly typed ActivePricingConfiguration.
 * No Promise<any>.
 */
export async function loadShopPricingRules(
  db: Firestore,
  shopId: string
): Promise<ActivePricingConfiguration> {
  const snapshot = await db.collection('pricingRules')
    .where('shopId', '==', shopId)
    .where('enabled', '==', true)
    .get();

  if (!snapshot.empty) {
    const rules = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PricingRule));
    return {
      version: '2.0.0-firestore-collection',
      rules,
      customPricing: mapRulesToCustomPricing(rules)
    };
  }

  // Check shop document
  const shopDoc = await db.collection('shops').doc(shopId).get();
  if (shopDoc.exists) {
    const shopData = shopDoc.data();
    if (shopData && Array.isArray(shopData.pricingRules) && shopData.pricingRules.length > 0) {
      const rules = shopData.pricingRules.filter((r: PricingRule) => r.enabled !== false);
      return {
        version: '2.0.0-shop-doc',
        rules,
        customPricing: mapRulesToCustomPricing(rules)
      };
    }
    if (shopData && shopData.servicePricing && typeof shopData.servicePricing === 'object') {
      return {
        version: '2.0.0-shop-servicePricing',
        rules: [],
        customPricing: mapRulesToCustomPricing([shopData.servicePricing])
      };
    }
  }

  // Check shopPricingSettings
  const settingsDoc = await db.collection('shopPricingSettings').doc(shopId).get();
  if (settingsDoc.exists && settingsDoc.data()?.pricingRules) {
    const rules = settingsDoc.data()?.pricingRules;
    return {
      version: '2.0.0-settings-doc',
      rules,
      customPricing: mapRulesToCustomPricing(rules)
    };
  }

  // Fallback ONLY when explicit S2P_TEST_MODE=true is configured
  if (process.env.S2P_TEST_MODE === 'true') {
    const shared = await import('@s2p/shared');
    return {
      version: '2.0.0-test-fallback',
      rules: [],
      customPricing: shared.DEFAULT_SHAKEEL_PRICING ? { ...shared.DEFAULT_SHAKEEL_PRICING } : {}
    };
  }

  // Production: FAIL CLOSED
  throw new Error('PRICING_NOT_CONFIGURED: Active pricing rules not configured for shop.');
}

/**
 * Creates an order draft for a shop
 */
export async function createDraftService(
  db: Firestore,
  shopId: string,
  identity: CallerIdentity
) {
  if (!shopId) throw new Error('shopId is required.');

  const shopDoc = await db.collection('shops').doc(shopId).get();
  if (!shopDoc.exists) throw new Error('Shop not found.');
  const shopData = shopDoc.data();
  if (!shopData || shopData.status !== 'ACTIVE') throw new Error('Shop is currently inactive.');
  const organizationId = shopData.organizationId;
  if (!organizationId) throw new Error('Shop missing organizationId configuration.');

  const draftId = 'dft_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  const draftRecord: OrderDraft = {
    id: draftId,
    shopId,
    organizationId,
    isGuest: identity.isGuest,
    guestSessionId: identity.guestSessionId || null,
    ownerUid: identity.uid || null,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    expiresAt
  };

  await db.collection('orderDrafts').doc(draftId).set({
    ...draftRecord,
    createdAtServer: FieldValue.serverTimestamp()
  });

  return {
    success: true,
    draftId,
    shopId,
    organizationId,
    expiresAt,
    isGuest: identity.isGuest,
    guestSessionToken: identity.newGuestSessionToken || null
  };
}

/**
 * Authoritative quote calculation.
 * Loads active Firestore pricing rules and passes them directly to calculatePrintPrice.
 */
export async function calculateQuoteService(
  db: Firestore,
  input: {
    shopId?: string;
    draftId: string;
    fileId: string;
    copies?: number;
    colorMode?: string;
    duplexMode?: string;
    paperSize?: string;
    paperType?: string;
    orientation?: PrintOrientation;
    scaling?: PrintScaling;
    finishing?: string;
    pageRange?: string;
  },
  identity: CallerIdentity
) {
  const { draftId, fileId } = input;
  if (!draftId || !fileId) throw new Error('draftId and fileId are required.');

  const draftDoc = await db.collection('orderDrafts').doc(draftId).get();
  if (!draftDoc.exists) throw new Error('Order draft not found.');
  const draft = draftDoc.data() as OrderDraft;
  if (draft.status !== 'DRAFT') throw new Error('Draft is not active. Status: ' + draft.status);

  if (input.shopId && input.shopId !== draft.shopId) {
    throw new Error('Order draft does not belong to the requested shop.');
  }

  if (identity.isAuthenticated && identity.uid) {
    if (draft.ownerUid && draft.ownerUid !== identity.uid) throw new Error('Draft belongs to another user account.');
  } else if (identity.isGuest) {
    if (draft.guestSessionId && draft.guestSessionId !== identity.guestSessionId) throw new Error('Guest session does not own this draft.');
  }

  const fileDoc = await db.collection('orderFiles').doc(fileId).get();
  if (!fileDoc.exists) throw new Error('File record not found.');
  const file = fileDoc.data() as OrderFile;

  if (file.orderId !== draftId) throw new Error('File does not belong to this draft.');
  if (file.shopId !== draft.shopId) throw new Error('File shop does not match draft shop.');
  if (file.organizationId !== draft.organizationId) throw new Error('File organization does not match draft organization.');

  const shopDoc = await db.collection('shops').doc(draft.shopId).get();
  if (!shopDoc.exists) throw new Error('Shop not found.');
  const shop = shopDoc.data() as Shop;
  if (shop.status !== 'ACTIVE') throw new Error('Shop is currently inactive.');

  validateShopOptions(shop, input);

  // Section 3: Load active Firestore rules and ensure they drive calculation
  const activePricing = await loadShopPricingRules(db, draft.shopId);

  const totalPages = file.pageCount || 1;
  const pageRangeStr = (input.pageRange || 'all').trim();
  const selectedPages = parsePageRange(pageRangeStr, totalPages);
  if (selectedPages.length === 0) throw new Error('Selected page range resulted in 0 pages.');

  const orientation: PrintOrientation = input.orientation === 'LANDSCAPE' ? 'LANDSCAPE' : input.orientation === 'PORTRAIT' ? 'PORTRAIT' : 'AUTO';
  const scaling: PrintScaling = input.scaling === 'ACTUAL_SIZE' ? 'ACTUAL_SIZE' : 'FIT';
  const paperSize = input.paperSize === 'A3' ? 'A3' : 'A4';
  const colorMode = input.colorMode === 'COLOR' ? 'COLOR' : 'BW';
  const duplexMode = input.duplexMode === 'DOUBLE' ? 'DOUBLE' : 'SINGLE';
  const copies = Math.min(100, Math.max(1, Number(input.copies) || 1));
  const paperType = input.paperType || 'NORMAL_75GSM';
  const finishing = input.finishing || 'NONE';

  const priceResult = calculatePrintPrice({
    shopId: draft.shopId,
    pageCount: totalPages,
    selectedPages,
    copies,
    colorMode,
    duplexMode,
    paperSize,
    paperType: paperType as any,
    finishing: finishing as any,
    customPricing: activePricing.customPricing
  });

  const printCostPaise = Math.round(priceResult.printCost * 100);
  const paperCostPaise = Math.round(priceResult.paperCost * 100);
  const finishingCostPaise = Math.round(priceResult.finishingCost * 100);
  const subtotalPaise = Math.round(priceResult.subtotal * 100);
  const discountPaise = Math.round(priceResult.discount * 100);
  const taxPaise = Math.round(priceResult.tax * 100);
  const totalPaise = Math.round(priceResult.total * 100);

  const quoteId = 'qte_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const quoteRecord = {
    quoteId,
    organizationId: draft.organizationId,
    shopId: draft.shopId,
    draftId,
    fileId,
    selectedPages,
    selectedPageCount: selectedPages.length,
    paperSize,
    paperType,
    colorMode,
    duplexMode,
    copies,
    orientation,
    scaling,
    finishing,
    printCostPaise,
    paperCostPaise,
    finishingCostPaise,
    subtotalPaise,
    discountPaise,
    taxPaise,
    totalPaise,
    totalRupees: priceResult.total,
    currency: 'INR' as const,
    pricingVersion: activePricing.version,
    pricingRuleIds: activePricing.rules.length > 0 ? activePricing.rules.map(r => r.id) : ['custom_pricing'],
    createdAt: nowIso,
    expiresAt,
    createdAtServer: FieldValue.serverTimestamp()
  };

  await db.collection('priceQuotes').doc(quoteId).set(quoteRecord);

  return {
    success: true,
    quote: quoteRecord,
    ...quoteRecord,
    pageCount: totalPages,
    totalSides: priceResult.totalSides,
    sheetCount: priceResult.sheetCount,
    breakdown: {
      printCost: priceResult.printCost,
      paperCost: priceResult.paperCost,
      finishingCost: priceResult.finishingCost,
      discount: priceResult.discount,
      tax: priceResult.tax,
      total: priceResult.total
    }
  };
}

export interface CreateAuthoritativeOrderInput {
  shopId?: string;
  draftId: string;
  fileId?: string;
  quoteId?: string;
  items?: Array<{ fileId: string; quoteId: string }>;
  enforceAvailability?: boolean;
  customer: {
    name: string;
    mobile: string;
    phone?: string;
    email?: string | null;
    marketingConsent?: boolean;
  };
  paymentMethod: PaymentMethod;
}

export interface AvailabilityCheckResult {
  available: boolean;
  reason?: 'AGENT_OFFLINE' | 'PRINTER_OFFLINE' | 'NO_COMPATIBLE_ROUTE' | 'INTAKE_PAUSED' | 'SHOP_INACTIVE' | 'UPLOAD_ENDPOINT_NOT_CONFIGURED' | 'TUNNEL_UNREACHABLE';
  message: string;
  onlineDeviceCount: number;
  onlinePhysicalPrinters: number;
  agentUploadUrl?: string | null;
}

export async function checkShopPrintingAvailability(
  db: Firestore,
  shopId: string,
  requiredItems?: Array<{ paperSize?: string; colorMode?: string }>
): Promise<AvailabilityCheckResult> {
  const now = Date.now();

  // 0. Check shop exists, active status, and manualPause
  const shopDoc = await db.collection('shops').doc(shopId).get();
  if (!shopDoc.exists) {
    return {
      available: false,
      reason: 'SHOP_INACTIVE',
      message: 'Target shop does not exist.',
      onlineDeviceCount: 0,
      onlinePhysicalPrinters: 0
    };
  }
  const shopData = shopDoc.data();
  if (shopData?.status !== 'ACTIVE') {
    return {
      available: false,
      reason: 'SHOP_INACTIVE',
      message: 'Target shop is currently inactive.',
      onlineDeviceCount: 0,
      onlinePhysicalPrinters: 0
    };
  }
  if (shopData?.settings?.manualPause === true) {
    return {
      available: false,
      reason: 'INTAKE_PAUSED',
      message: 'Customer intake is temporarily paused by shop staff.',
      onlineDeviceCount: 0,
      onlinePhysicalPrinters: 0
    };
  }

  // 1. Check devices for this shop
  const devicesSnap = await db.collection('devices')
    .where('shopId', '==', shopId)
    .get();

  const onlineDevices = devicesSnap.docs.filter(doc => {
    const d = doc.data();
    if (d.status !== 'ONLINE') return false;
    const hb = new Date(d.lastHeartbeatAt || 0).getTime();
    return now - hb <= 90 * 1000;
  });

  if (onlineDevices.length === 0) {
    return {
      available: false,
      reason: 'AGENT_OFFLINE',
      message: 'Printing is temporarily unavailable at this shop. Please try again shortly.',
      onlineDeviceCount: 0,
      onlinePhysicalPrinters: 0
    };
  }

  const primaryDevice = onlineDevices[0].data();
  const agentUploadUrl = (primaryDevice.agentUploadUrl || shopData?.settings?.agentUploadUrl || '').trim();

  if (!agentUploadUrl) {
    return {
      available: false,
      reason: 'UPLOAD_ENDPOINT_NOT_CONFIGURED',
      message: 'Shop PC direct upload tunnel is not configured.',
      onlineDeviceCount: onlineDevices.length,
      onlinePhysicalPrinters: 0,
      agentUploadUrl: null
    };
  }

  // Live endpoint reachability verification: check reachability, not merely a stored HTTPS URL
  const isLocalOrTest = process.env.S2P_TEST_MODE === 'true' || agentUploadUrl.includes('localhost') || agentUploadUrl.includes('127.0.0.1');
  if (!isLocalOrTest) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const pingRes = await fetch(`${agentUploadUrl}/api/agent/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!pingRes.ok) {
        return {
          available: false,
          reason: 'TUNNEL_UNREACHABLE',
          message: 'Shop PC upload endpoint is unreachable. Please restart start-free-tunnel.bat.',
          onlineDeviceCount: onlineDevices.length,
          onlinePhysicalPrinters: 0,
          agentUploadUrl
        };
      }
    } catch {
      return {
        available: false,
        reason: 'TUNNEL_UNREACHABLE',
        message: 'Shop PC upload endpoint is unreachable. Please restart start-free-tunnel.bat.',
        onlineDeviceCount: onlineDevices.length,
        onlinePhysicalPrinters: 0,
        agentUploadUrl
      };
    }
  }

  // 2. Check enabled physical printers
  const printersSnap = await db.collection('printers')
    .where('shopId', '==', shopId)
    .where('printerKind', '==', 'PHYSICAL')
    .where('isEnabled', '==', true)
    .get();

  const onlinePrinters = printersSnap.docs
    .map(doc => doc.data() as any)
    .filter(p => p.isOnline === true);

  if (onlinePrinters.length === 0) {
    return {
      available: false,
      reason: 'PRINTER_OFFLINE',
      message: 'Printing is temporarily unavailable at this shop. Please try again shortly.',
      onlineDeviceCount: onlineDevices.length,
      onlinePhysicalPrinters: 0,
      agentUploadUrl
    };
  }

  // 3. Routing check if items provided
  if (requiredItems && requiredItems.length > 0) {
    for (const item of requiredItems) {
      const reqPaper = item.paperSize || 'A4';
      const reqColor = item.colorMode === 'COLOR';

      const hasMatch = onlinePrinters.some(p => {
        const caps = p.capabilities || {};
        const supportsPaper = caps.paperSizes ? caps.paperSizes.includes(reqPaper) : true;
        const supportsColor = reqColor ? Boolean(caps.colorSupported) : true;
        return supportsPaper && supportsColor;
      });

      if (!hasMatch) {
        return {
          available: false,
          reason: 'NO_COMPATIBLE_ROUTE',
          message: 'Printing is temporarily unavailable at this shop. Please try again shortly.',
          onlineDeviceCount: onlineDevices.length,
          onlinePhysicalPrinters: onlinePrinters.length,
          agentUploadUrl
        };
      }
    }
  }

  return {
    available: true,
    message: 'Printing is available.',
    onlineDeviceCount: onlineDevices.length,
    onlinePhysicalPrinters: onlinePrinters.length,
    agentUploadUrl
  };
}

export async function createAuthoritativeOrder(
  db: Firestore,
  input: CreateAuthoritativeOrderInput,
  identity: CallerIdentity
) {
  const { draftId, customer, paymentMethod, enforceAvailability } = input;

  // Support both multi-item input (items[]) and single-item input (fileId, quoteId)
  let itemsToProcess: Array<{ fileId: string; quoteId: string }> = [];
  if (Array.isArray(input.items) && input.items.length > 0) {
    itemsToProcess = input.items;
  } else if (input.fileId && input.quoteId) {
    itemsToProcess = [{ fileId: input.fileId, quoteId: input.quoteId }];
  } else {
    throw new Error('draftId and at least one item (fileId and quoteId) are required.');
  }

  if (!draftId) {
    throw new Error('draftId is required.');
  }

  const customerName = (customer?.name || '').trim();
  if (!customerName || customerName.length < 2) {
    throw new Error('Please enter your name (at least 2 characters).');
  }
  const phoneCheck = normalizeIndianMobile(customer?.mobile || customer?.phone || '');
  if (!phoneCheck.valid) {
    throw new Error('Please enter a valid 10-digit Indian mobile number (e.g. +91 95815 29381).');
  }
  const customerMobile = phoneCheck.normalized;
  const customerPhone = phoneCheck.digits;
  const customerEmail = (customer?.email || '').trim() || null;
  const marketingConsent = Boolean(customer?.marketingConsent);

  if (paymentMethod !== 'CASH' && paymentMethod !== 'MANUAL_UPI' && (paymentMethod as any) !== 'ONLINE_GATEWAY') {
    throw new Error('Invalid payment method. Only CASH, MANUAL_UPI, and ONLINE_GATEWAY are supported.');
  }

  // Execute single concurrency-safe transaction
  const txResult = await db.runTransaction(async (transaction) => {
    // 1. Read Draft
    const draftRef = db.collection('orderDrafts').doc(draftId);
    const draftDoc = await transaction.get(draftRef);
    if (!draftDoc.exists) throw new Error('Order draft not found.');
    const draft = draftDoc.data() as OrderDraft;

    // Idempotency: If draft was already converted, return existing order
    if (draft.status === 'CONVERTED' && draft.convertedOrderId) {
      const existingOrderDoc = await transaction.get(db.collection('orders').doc(draft.convertedOrderId));
      if (existingOrderDoc.exists) {
        const existingOrder = existingOrderDoc.data() as Order;
        return {
          success: true,
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          isExisting: true,
          order: existingOrder
        };
      }
    }

    if (draft.status !== 'DRAFT') {
      throw new Error('Invalid draft status: ' + draft.status);
    }

    if (input.shopId && input.shopId !== draft.shopId) {
      throw new Error('Order draft does not belong to the requested shop.');
    }

    // Ownership check
    if (identity.isAuthenticated && identity.uid) {
      if (draft.ownerUid && draft.ownerUid !== identity.uid) {
        throw new Error('Draft belongs to another user account.');
      }
    } else if (identity.isGuest) {
      if (draft.guestSessionId && draft.guestSessionId !== identity.guestSessionId) {
        throw new Error('Guest session does not own this draft.');
      }
    }

    // 2. Read Shop
    const shopRef = db.collection('shops').doc(draft.shopId);
    const shopDoc = await transaction.get(shopRef);
    if (!shopDoc.exists) throw new Error('Shop not found.');
    const shop = shopDoc.data() as Shop;
    if (shop.status !== 'ACTIVE') throw new Error('Shop is currently inactive.');

    if (paymentMethod === 'MANUAL_UPI') {
      if (!shop.upiConfig || !shop.upiConfig.isEnabled || !shop.upiConfig.upiId) {
        throw new Error('UPI payments are temporarily unavailable for this shop.');
      }
    }

    // Availability Gate check (enforce in production or when explicitly requested)
    if (enforceAvailability || process.env.S2P_ENFORCE_AVAILABILITY === 'true') {
      const availCheck = await checkShopPrintingAvailability(db, draft.shopId);
      if (!availCheck.available) {
        throw new Error('PRINTING_UNAVAILABLE: ' + availCheck.message);
      }
    }

    const activePricing = await loadShopPricingRules(db, draft.shopId);
    const nowIso = new Date().toISOString();
    const orderId = 'ord_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');

    // 3. Process All Items
    const processedOrderItems: OrderItem[] = [];
    let cumulativePrintCostPaise = 0;
    let cumulativePaperCostPaise = 0;
    let cumulativeFinishingCostPaise = 0;
    let cumulativeSubtotalPaise = 0;
    let cumulativeDiscountPaise = 0;
    let cumulativeTaxPaise = 0;
    let cumulativeTotalPaise = 0;
    let cumulativeTotalRupees = 0;
    let firstPricingSnapshot: PriceSnapshot | null = null;

    for (let i = 0; i < itemsToProcess.length; i++) {
      const itemInput = itemsToProcess[i];
      const curFileId = itemInput.fileId;
      const curQuoteId = itemInput.quoteId;

      // Read File
      const fileRef = db.collection('orderFiles').doc(curFileId);
      const fileDoc = await transaction.get(fileRef);
      if (!fileDoc.exists) throw new Error('File record not found for file ' + curFileId);
      const file = fileDoc.data() as OrderFile;

      if (file.orderId !== draftId) throw new Error('File does not belong to this draft.');
      if (file.shopId !== draft.shopId) throw new Error('File shop does not match draft shop.');
      if (file.organizationId !== draft.organizationId) throw new Error('File organization does not match draft organization.');
      if (!file.documentAvailable) throw new Error('Document is no longer available.');

      // Read Quote & Verify
      const quoteRef = db.collection('priceQuotes').doc(curQuoteId);
      const quoteDoc = await transaction.get(quoteRef);
      if (!quoteDoc.exists) throw new Error('Price quote not found for quote ' + curQuoteId);
      const quote = quoteDoc.data();
      if (!quote) throw new Error('Price quote data is missing.');

      if (quote.draftId !== draftId) throw new Error('Quote does not belong to this draft.');
      if (quote.fileId !== curFileId) throw new Error('Quote does not belong to this file.');
      if (quote.shopId !== draft.shopId) throw new Error('Quote shop does not match draft shop.');
      if (quote.organizationId !== draft.organizationId) throw new Error('Quote organization does not match draft organization.');
      if (new Date(quote.expiresAt).getTime() <= Date.now()) {
        throw new Error('Price quote has expired. Please recalculate.');
      }

      const selectedPages: number[] = quote.selectedPages;
      const paperSize = quote.paperSize;
      const paperType = quote.paperType;
      const colorMode = quote.colorMode;
      const duplexMode = quote.duplexMode;
      const copies = quote.copies;
      const orientation: PrintOrientation = quote.orientation;
      const scaling: PrintScaling = quote.scaling;
      const finishing = quote.finishing;

      // Recompute price with active pricing rules to prevent stale pricing checkout
      const recomputed = calculatePrintPrice({
        shopId: draft.shopId,
        pageCount: file.pageCount || 1,
        selectedPages,
        copies,
        colorMode,
        duplexMode,
        paperSize,
        paperType: paperType as any,
        finishing: finishing as any,
        customPricing: activePricing.customPricing
      });

      const recomputedTotalPaise = Math.round(recomputed.total * 100);
      if (recomputedTotalPaise !== quote.totalPaise) {
        const err = new Error('PRICE_CHANGED: Pricing rules have changed since quote was generated. Please review and place order again.');
        (err as any).code = 'PRICE_CHANGED';
        (err as any).oldTotalPaise = quote.totalPaise;
        (err as any).newTotalPaise = recomputedTotalPaise;
        (err as any).newTotalRupees = recomputed.total;
        throw err;
      }

      const itemPrintCostPaise = Math.round(recomputed.printCost * 100);
      const itemPaperCostPaise = Math.round(recomputed.paperCost * 100);
      const itemFinishingCostPaise = Math.round(recomputed.finishingCost * 100);
      const itemSubtotalPaise = Math.round(recomputed.subtotal * 100);
      const itemDiscountPaise = Math.round(recomputed.discount * 100);
      const itemTaxPaise = Math.round(recomputed.tax * 100);

      cumulativePrintCostPaise += itemPrintCostPaise;
      cumulativePaperCostPaise += itemPaperCostPaise;
      cumulativeFinishingCostPaise += itemFinishingCostPaise;
      cumulativeSubtotalPaise += itemSubtotalPaise;
      cumulativeDiscountPaise += itemDiscountPaise;
      cumulativeTaxPaise += itemTaxPaise;
      cumulativeTotalPaise += recomputedTotalPaise;
      cumulativeTotalRupees += recomputed.total;

      const itemPricingSnapshot: PriceSnapshot = {
        calculatedAt: nowIso,
        pricingVersion: quote.pricingVersion || activePricing.version,
        pageCount: file.pageCount || 1,
        totalSides: recomputed.totalSides,
        sheetCount: recomputed.sheetCount,
        orientation,
        scaling,
        printCostPaise: itemPrintCostPaise,
        paperCostPaise: itemPaperCostPaise,
        finishingCostPaise: itemFinishingCostPaise,
        discountPaise: itemDiscountPaise,
        taxPaise: itemTaxPaise,
        totalPaise: recomputedTotalPaise,
        printCost: recomputed.printCost,
        paperCost: recomputed.paperCost,
        finishingCost: recomputed.finishingCost,
        discount: recomputed.discount,
        tax: recomputed.tax,
        total: recomputed.total,
        currency: 'INR'
      };

      if (!firstPricingSnapshot) {
        firstPricingSnapshot = itemPricingSnapshot;
      }

      const orderItemId = 'item_' + Date.now().toString(36) + '_' + (i + 1);
      const orderItem: OrderItem = {
        id: orderItemId,
        orderId,
        fileId: curFileId,
        config: {
          paperSize: paperSize as any,
          colorMode: colorMode as any,
          duplexMode: duplexMode as any,
          copies,
          pageRange: selectedPages.join(','),
          orientation,
          scaling,
          fitMode: scaling,
          paperType: paperType as any,
          finishing: finishing as any
        },
        selectedPages,
        selectedPageCount: selectedPages.length,
        orientation,
        scaling,
        printedSides: recomputed.totalSides,
        estimatedSheets: recomputed.sheetCount,
        pricingSnapshot: itemPricingSnapshot
      };

      processedOrderItems.push(orderItem);
    }

    // 5. Read/Increment Shop Counter Transactionally
    const counterRef = db.collection('shopCounters').doc(draft.shopId);
    const counterDoc = await transaction.get(counterRef);
    const currentYear = Number(new Date().getFullYear().toString().slice(-2));
    let nextSeq = 1;
    if (counterDoc.exists) {
      const cdata = counterDoc.data();
      if (cdata && cdata.year === currentYear) {
        nextSeq = (Number(cdata.lastSequence) || 0) + 1;
      }
    }
    const orderNumber = 'S2P-' + currentYear + '-' + nextSeq.toString().padStart(6, '0');
    const manualPaymentRef = paymentMethod === 'MANUAL_UPI' ? UpiPaymentUtils.generateManualPaymentReference(orderNumber) : null;

    // 6. Construct Order & Timeline
    const initialStatus: OrderStatus = 'RECEIVED';
    const initialPaymentStatus: PaymentStatus = paymentMethod === 'CASH'
      ? 'CASH_PENDING'
      : (paymentMethod === 'ONLINE_GATEWAY' ? 'UNPAID' : 'UPI_PENDING');

    const timelineEvent = {
      id: 'evt_' + Date.now().toString(36) + '_1',
      status: initialStatus,
      timestamp: nowIso,
      actorId: identity.uid || (identity.guestSessionId ? 'guest_' + identity.guestSessionId.slice(-6) : 'customer'),
      actorRole: 'CUSTOMER',
      note: paymentMethod === 'CASH'
        ? 'Order created. Cash payment pending at counter.'
        : (paymentMethod === 'ONLINE_GATEWAY'
            ? 'Order created. Online payment gateway initiated.'
            : 'Order created. Manual UPI payment pending verification.')
    };

    const paymentEventId = 'pevt_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    const paymentEvent: PaymentEvent = {
      id: paymentEventId,
      organizationId: draft.organizationId,
      shopId: draft.shopId,
      orderId,
      paymentMethod,
      previousStatus: null,
      newStatus: initialPaymentStatus,
      amountPaise: cumulativeTotalPaise,
      actorType: 'CUSTOMER',
      actorUid: identity.uid || identity.guestSessionId || 'guest',
      actorRole: 'CUSTOMER',
      createdAt: nowIso
    };

    const historyId = 'hist_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    const orderHistory: OrderStatusHistory = {
      id: historyId,
      organizationId: draft.organizationId,
      shopId: draft.shopId,
      orderId,
      fromStatus: null,
      toStatus: initialStatus,
      actorType: 'CUSTOMER',
      actorUid: identity.uid || identity.guestSessionId || 'guest',
      actorRole: 'CUSTOMER',
      reason: 'Initial order placement',
      createdAt: nowIso
    };

    const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    const auditRecord = {
      id: auditId,
      organizationId: draft.organizationId,
      shopId: draft.shopId,
      action: 'ORDER_CREATED',
      targetType: 'ORDER',
      targetId: orderId,
      actorId: identity.uid || (identity.guestSessionId ? 'guest_' + identity.guestSessionId.slice(-6) : 'customer'),
      actorRole: 'CUSTOMER',
      timestamp: nowIso,
      details: { orderNumber, paymentMethod, totalPaise: cumulativeTotalPaise, itemCount: processedOrderItems.length }
    };

    const orderRecord: Order = {
      id: orderId,
      orderNumber,
      organizationId: draft.organizationId,
      shopId: draft.shopId,
      customerId: identity.uid || null,
      customerName,
      customerMobile,
      customerPhone,
      phoneVerified: false,
      marketingConsent,
      customerEmail,
      draftId,
      guestSessionId: identity.guestSessionId || draft.guestSessionId || null,
      ownerUid: identity.uid || draft.ownerUid || null,
      isGuest: !identity.isAuthenticated,
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
      paymentMethod,
      currency: 'INR',
      manualPaymentReference: manualPaymentRef,
      subtotalPaise: cumulativeSubtotalPaise,
      discountPaise: cumulativeDiscountPaise,
      taxPaise: cumulativeTaxPaise,
      totalPaise: cumulativeTotalPaise,
      totalAmount: cumulativeTotalRupees,
      items: processedOrderItems,
      pricingSnapshot: firstPricingSnapshot || {
        calculatedAt: nowIso,
        pricingVersion: activePricing.version,
        pageCount: 1,
        totalSides: 1,
        sheetCount: 1,
        printCostPaise: cumulativePrintCostPaise,
        paperCostPaise: cumulativePaperCostPaise,
        finishingCostPaise: cumulativeFinishingCostPaise,
        discountPaise: cumulativeDiscountPaise,
        taxPaise: cumulativeTaxPaise,
        totalPaise: cumulativeTotalPaise,
        printCost: cumulativePrintCostPaise / 100,
        paperCost: cumulativePaperCostPaise / 100,
        finishingCost: cumulativeFinishingCostPaise / 100,
        discount: cumulativeDiscountPaise / 100,
        tax: cumulativeTaxPaise / 100,
        total: cumulativeTotalRupees,
        currency: 'INR'
      },
      timeline: [timelineEvent],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // 7. Atomic Writes inside the SAME transaction
    transaction.set(counterRef, {
      shopId: draft.shopId,
      year: currentYear,
      lastSequence: nextSeq,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    transaction.set(db.collection('orders').doc(orderId), {
      ...orderRecord,
      createdAtServer: FieldValue.serverTimestamp(),
      updatedAtServer: FieldValue.serverTimestamp()
    });

    for (const item of processedOrderItems) {
      transaction.set(db.collection('orderItems').doc(item.id), item);
    }

    transaction.update(draftRef, {
      status: 'CONVERTED',
      convertedOrderId: orderId,
      convertedAt: nowIso,
      updatedAt: nowIso
    });

    transaction.set(db.collection('paymentEvents').doc(paymentEventId), {
      ...paymentEvent,
      createdAtServer: FieldValue.serverTimestamp()
    });

    transaction.set(db.collection('orderStatusHistory').doc(historyId), {
      ...orderHistory,
      createdAtServer: FieldValue.serverTimestamp()
    });

    transaction.set(db.collection('auditLogs').doc(auditId), {
      ...auditRecord,
      timestampServer: FieldValue.serverTimestamp()
    });

    return {
      success: true,
      orderId,
      orderNumber,
      paymentStatus: initialPaymentStatus,
      status: initialStatus,
      order: orderRecord
    };
  });
}

/**
 * Section 11, 12, 13: Staff Action Updates (Transactional & Idempotent)
 * Runs entirely within a Firestore transaction:
 * - Reads order
 * - Reads and validates canonical shopMembers/{uid}_{shopId}
 * - Validates role
 * - Enforces state machine & payment idempotency
 * - Writes order, paymentEvents, orderStatusHistory, auditLog
 */
export async function updateOrderStatusAtomic(
  db: Firestore,
  input: {
    orderId: string;
    action: string;
    note?: string;
  },
  identity: CallerIdentity
) {
  const { orderId, action, note } = input;
  if (!identity.isAuthenticated || !identity.uid) {
    throw new Error('Authentication required.');
  }

  const txResult = await db.runTransaction(async (transaction) => {
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) throw new Error('Order not found.');
    const order = orderDoc.data() as Order;

    // Validate canonical shop member
    const member = await getActiveShopMemberInTransaction(transaction, db, identity.uid!, order.shopId);
    const role = member.role;

    // Role-based restrictions
    if (action === 'MARK_CASH_PAID' || action === 'CONFIRM_UPI_PAID' || action === 'CANCEL_ORDER') {
      if (!['OWNER', 'MANAGER', 'COUNTER_STAFF'].includes(role)) {
        throw new Error('Insufficient permissions for ' + action);
      }
    } else if (action === 'ACCEPT_ORDER' || action === 'HOLD_ORDER') {
      if (!['OWNER', 'MANAGER', 'COUNTER_STAFF', 'PRINT_OPERATOR'].includes(role)) {
        throw new Error('Insufficient permissions for ' + action);
      }
    }

    let newStatus: OrderStatus = order.status;
    let newPaymentStatus: PaymentStatus = order.paymentStatus;
    let eventNote = note || '';
    let isPaymentChanged = false;
    let isStatusChanged = false;

    switch (action) {
      case 'ACCEPT_ORDER':
        // Idempotency: if already ACCEPTED, return current state
        if (order.status === 'ACCEPTED') {
          return { success: true, order, isIdempotent: true, message: 'Order already ACCEPTED.' };
        }
        if (!canTransitionOrder(order.status, 'ACCEPTED')) {
          throw new Error('Cannot transition order from ' + order.status + ' to ACCEPTED');
        }
        newStatus = 'ACCEPTED';
        isStatusChanged = true;
        eventNote = eventNote || 'Order accepted by staff.';
        break;

      case 'MARK_CASH_PAID':
        if (order.paymentMethod !== 'CASH') {
          throw new Error('Order payment method is not Cash.');
        }
        // Section 12 Idempotency: if already PAID, return current state without duplicate payment event
        if (order.paymentStatus === 'PAID') {
          return { success: true, order, isIdempotent: true, message: 'Payment already marked as PAID.' };
        }
        if (order.paymentStatus !== 'CASH_PENDING') {
          throw new Error('Cannot mark cash paid for order with payment status: ' + order.paymentStatus);
        }
        newPaymentStatus = 'PAID';
        isPaymentChanged = true;
        eventNote = eventNote || 'Cash payment received and confirmed at counter.';
        break;

      case 'CONFIRM_UPI_PAID':
        if (order.paymentMethod !== 'MANUAL_UPI') {
          throw new Error('Order payment method is not UPI.');
        }
        // Section 12 Idempotency: if already PAID, return current state without duplicate payment event
        if (order.paymentStatus === 'PAID') {
          return { success: true, order, isIdempotent: true, message: 'Payment already confirmed as PAID.' };
        }
        if (order.paymentStatus !== 'UPI_PENDING' && order.paymentStatus !== 'MANUAL_UPI_REVIEW_PENDING') {
          throw new Error('Cannot confirm UPI payment for order with payment status: ' + order.paymentStatus);
        }
        newPaymentStatus = 'PAID';
        isPaymentChanged = true;
        eventNote = eventNote || 'Manual UPI payment verified and confirmed by staff.';
        break;

      case 'MARK_UPI_NOT_FOUND':
        if (order.paymentMethod !== 'MANUAL_UPI') {
          throw new Error('Order payment method is not UPI.');
        }
        if (order.paymentStatus === 'PAID') {
          throw new Error('Cannot mark an already paid order as not found.');
        }
        newPaymentStatus = 'MANUAL_UPI_NOT_FOUND';
        isPaymentChanged = true;
        eventNote = eventNote || 'Manual UPI payment not found by staff at counter.';
        break;

      case 'HOLD_ORDER':
        if (order.status === 'ON_HOLD') {
          return { success: true, order, isIdempotent: true, message: 'Order already ON_HOLD.' };
        }
        if (!canTransitionOrder(order.status, 'ON_HOLD')) {
          throw new Error('Cannot put order on hold from status: ' + order.status);
        }
        newStatus = 'ON_HOLD';
        isStatusChanged = true;
        eventNote = eventNote || 'Order put on hold by staff.';
        break;

      case 'CANCEL_ORDER':
        if (order.status === 'CANCELLED') {
          return { success: true, order, isIdempotent: true, message: 'Order already CANCELLED.' };
        }
        if (order.status === 'COMPLETED') {
          throw new Error('Cannot cancel an already completed order.');
        }
        if (!canTransitionOrder(order.status, 'CANCELLED')) {
          throw new Error('Cannot transition order from ' + order.status + ' to CANCELLED');
        }
        newStatus = 'CANCELLED';
        isStatusChanged = true;
        eventNote = eventNote || 'Order cancelled by staff.';
        break;

      default:
        throw new Error('Unknown staff action: ' + action);
    }

    const nowIso = new Date().toISOString();
    const timelineEvent = {
      id: 'evt_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex'),
      status: newStatus,
      timestamp: nowIso,
      actorId: identity.uid!,
      actorRole: role,
      note: eventNote
    };

    const updatedTimeline = [...(order.timeline || []), timelineEvent];

    // Transactional Writes
    transaction.update(orderRef, {
      status: newStatus,
      paymentStatus: newPaymentStatus,
      timeline: updatedTimeline,
      updatedAt: nowIso,
      updatedAtServer: FieldValue.serverTimestamp()
    });

    if (isPaymentChanged) {
      const paymentEventId = 'pevt_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      const paymentEvent: PaymentEvent = {
        id: paymentEventId,
        organizationId: order.organizationId,
        shopId: order.shopId,
        orderId,
        paymentMethod: order.paymentMethod,
        previousStatus: order.paymentStatus,
        newStatus: newPaymentStatus,
        amountPaise: order.totalPaise,
        actorType: 'STAFF',
        actorUid: identity.uid!,
        actorRole: role,
        createdAt: nowIso
      };
      transaction.set(db.collection('paymentEvents').doc(paymentEventId), {
        ...paymentEvent,
        createdAtServer: FieldValue.serverTimestamp()
      });
    }

    if (isStatusChanged) {
      const historyId = 'hist_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      const orderHistory: OrderStatusHistory = {
        id: historyId,
        organizationId: order.organizationId,
        shopId: order.shopId,
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        actorType: 'STAFF',
        actorUid: identity.uid!,
        actorRole: role,
        reason: eventNote,
        createdAt: nowIso
      };
      transaction.set(db.collection('orderStatusHistory').doc(historyId), {
        ...orderHistory,
        createdAtServer: FieldValue.serverTimestamp()
      });
    }

    const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    transaction.set(db.collection('auditLogs').doc(auditId), {
      id: auditId,
      organizationId: order.organizationId,
      shopId: order.shopId,
      action: 'STAFF_' + action,
      targetType: 'ORDER',
      targetId: orderId,
      actorId: identity.uid,
      actorRole: role,
      timestamp: nowIso,
      timestampServer: FieldValue.serverTimestamp(),
      details: {
        fromStatus: order.status,
        toStatus: newStatus,
        fromPaymentStatus: order.paymentStatus,
        toPaymentStatus: newPaymentStatus,
        note: eventNote
      }
    });

    const updatedOrder: Order = {
      ...order,
      status: newStatus,
      paymentStatus: newPaymentStatus,
      timeline: updatedTimeline,
      updatedAt: nowIso
    };

    return {
      success: true,
      order: updatedOrder
    };
  });

  if (txResult && (txResult as any).success && (action === 'MARK_CASH_PAID' || action === 'CONFIRM_UPI_PAID')) {
    try {
      const { autoDispatchOrderForPrint } = await import('./print-job-service');
      await autoDispatchOrderForPrint(db, (txResult as any).order.id, (txResult as any).order.shopId);
    } catch (dispErr: any) {
      console.warn('[updateOrderStatusAtomic] Auto dispatch warning:', dispErr?.message);
    }
  }

  return txResult;
}

/**
 * Authoritative single order fetch
 */
export async function getOrderAuthoritative(
  db: Firestore,
  orderId: string,
  identity: CallerIdentity
): Promise<Order> {
  const orderDoc = await db.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) throw new Error('Order not found.');
  const order = orderDoc.data() as Order;

  let allowed = false;
  if (identity.isAuthenticated && identity.uid) {
    if (order.customerId === identity.uid || order.ownerUid === identity.uid) {
      allowed = true;
    } else {
      try {
        const member = await getActiveShopMember(db, identity.uid, order.shopId);
        if (member.status === 'ACTIVE') {
          allowed = true;
        }
      } catch {
        // Not an active shop member
      }
    }
  } else if (identity.isGuest && identity.guestSessionId) {
    if (order.guestSessionId === identity.guestSessionId) {
      allowed = true;
    }
  }

  if (!allowed) throw new Error('Unauthorized to view this order.');
  return order;
}

/**
 * Authoritative shop orders query (Staff Only)
 */
export async function getShopOrdersAuthoritative(
  db: Firestore,
  shopId: string,
  identity: CallerIdentity
): Promise<Order[]> {
  if (!identity.isAuthenticated || !identity.uid) {
    throw new Error('Authentication required for shop orders.');
  }

  // Authorize via canonical helper
  await getActiveShopMember(db, identity.uid, shopId);

  const snapshot = await db.collection('orders')
    .where('shopId', '==', shopId)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();

  return snapshot.docs.map(doc => doc.data() as Order);
}

/**
 * Shop options query service
 */
export async function getShopOptionsService(db: Firestore, shopId: string) {
  const shopDoc = await db.collection('shops').doc(shopId).get();
  if (!shopDoc.exists) throw new Error('Shop not found.');
  const shop = shopDoc.data() as Shop;
  if (shop.status !== 'ACTIVE') throw new Error('Shop is currently inactive.');

  return {
    success: true,
    shopId: shop.id,
    name: shop.name,
    slug: shop.slug,
    organizationId: shop.organizationId,
    printOptions: getShopEffectiveOptions(shop),
    upiConfig: await (async () => {
      const manualUpiDoc = await db.collection('shops').doc(shopId).collection('paymentSettings').doc('manualUpi').get();
      if (manualUpiDoc.exists) {
        const data = manualUpiDoc.data();
        return {
          upiId: data?.upiId || '',
          merchantName: data?.payeeName || data?.merchantName || '',
          providerLabel: data?.providerLabel || 'PhonePe / UPI',
          verificationMode: data?.verificationMode || 'STAFF_CONFIRMATION',
          showQr: data?.showQr !== false,
          showUpiIntent: data?.showUpiIntent !== false,
          isEnabled: Boolean(data?.enabled ?? data?.isEnabled),
          isVerified: Boolean(data?.isVerified),
          verificationState: data?.verificationState || 'UNVERIFIED'
        };
      }
      return shop.upiConfig ? {
        upiId: shop.upiConfig.upiId,
        merchantName: shop.upiConfig.merchantName,
        providerLabel: (shop.upiConfig as any).providerLabel || 'PhonePe / UPI',
        verificationMode: (shop.upiConfig as any).verificationMode || 'STAFF_CONFIRMATION',
        showQr: (shop.upiConfig as any).showQr !== false,
        showUpiIntent: (shop.upiConfig as any).showUpiIntent !== false,
        isEnabled: shop.upiConfig.isEnabled,
        isVerified: shop.upiConfig.isVerified
      } : null;
    })()
  };
}
