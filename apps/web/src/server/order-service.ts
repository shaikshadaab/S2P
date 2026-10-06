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
  ServicePricingRules
} from '@s2p/shared';

export interface CallerIdentity {
  isAuthenticated: boolean;
  uid?: string;
  isGuest: boolean;
  guestSessionId?: string;
  newGuestSessionToken?: string;
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
  const snap = await docRef.get();

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
  fileId: string;
  quoteId: string; // REQUIRED
  customer: {
    name: string;
    mobile: string;
    email?: string | null;
  };
  paymentMethod: PaymentMethod;
}

/**
 * Section 6, 7, 8, 9: Atomic Authoritative Order Creation
 * Single concurrency-safe transaction enforcing:
 * - One draft -> Maximum one order
 * - quoteId required
 * - Quote configuration is authoritative (no client override)
 * - Detects active pricing changes and throws PRICE_CHANGED
 * - Atomic sequential shop counter reservation
 */
export async function createAuthoritativeOrder(
  db: Firestore,
  input: CreateAuthoritativeOrderInput,
  identity: CallerIdentity
) {
  const { draftId, fileId, quoteId, customer, paymentMethod } = input;

  if (!draftId || !fileId) {
    throw new Error('draftId and fileId are required.');
  }
  if (!quoteId) {
    throw new Error('quoteId is required. Authoritative quote must be requested prior to checkout.');
  }

  const customerName = (customer?.name || '').trim();
  const customerMobile = (customer?.mobile || '').trim();
  const customerEmail = (customer?.email || '').trim() || null;

  if (!customerName) throw new Error('Customer name is required.');
  if (!/^[6-9]\d{9}$/.test(customerMobile)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }

  if (paymentMethod !== 'CASH' && paymentMethod !== 'MANUAL_UPI') {
    throw new Error('Invalid payment method. Only CASH and MANUAL_UPI are supported.');
  }

  // Execute single concurrency-safe transaction
  return await db.runTransaction(async (transaction) => {
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

    // 3. Read File
    const fileRef = db.collection('orderFiles').doc(fileId);
    const fileDoc = await transaction.get(fileRef);
    if (!fileDoc.exists) throw new Error('File record not found.');
    const file = fileDoc.data() as OrderFile;

    if (file.orderId !== draftId) throw new Error('File does not belong to this draft.');
    if (file.shopId !== draft.shopId) throw new Error('File shop does not match draft shop.');
    if (file.organizationId !== draft.organizationId) throw new Error('File organization does not match draft organization.');
    if (!file.documentAvailable) throw new Error('Document is no longer available.');

    // 4. Read Quote & Verify
    const quoteRef = db.collection('priceQuotes').doc(quoteId);
    const quoteDoc = await transaction.get(quoteRef);
    if (!quoteDoc.exists) throw new Error('Price quote not found.');
    const quote = quoteDoc.data();
    if (!quote) throw new Error('Price quote data is missing.');

    if (quote.draftId !== draftId) throw new Error('Quote does not belong to this draft.');
    if (quote.fileId !== fileId) throw new Error('Quote does not belong to this file.');
    if (quote.shopId !== draft.shopId) throw new Error('Quote shop does not match draft shop.');
    if (quote.organizationId !== draft.organizationId) throw new Error('Quote organization does not match draft organization.');
    if (new Date(quote.expiresAt).getTime() <= Date.now()) {
      throw new Error('Price quote has expired. Please recalculate.');
    }

    // Section 8: Authoritative configuration comes directly from Quote
    const selectedPages: number[] = quote.selectedPages;
    const paperSize = quote.paperSize;
    const paperType = quote.paperType;
    const colorMode = quote.colorMode;
    const duplexMode = quote.duplexMode;
    const copies = quote.copies;
    const orientation: PrintOrientation = quote.orientation;
    const scaling: PrintScaling = quote.scaling;
    const finishing = quote.finishing;

    // Section 7: Recompute price with active pricing rules to prevent stale pricing checkout
    const activePricing = await loadShopPricingRules(db, draft.shopId);
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

    // 6. Construct Order & Items
    const orderId = 'ord_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
    const nowIso = new Date().toISOString();
    const initialStatus: OrderStatus = 'RECEIVED';
    const initialPaymentStatus: PaymentStatus = paymentMethod === 'CASH' ? 'CASH_PENDING' : 'UPI_PENDING';

    const pricingSnapshot: PriceSnapshot = {
      calculatedAt: nowIso,
      pricingVersion: quote.pricingVersion || activePricing.version,
      pageCount: file.pageCount || 1,
      totalSides: recomputed.totalSides,
      sheetCount: recomputed.sheetCount,
      orientation,
      scaling,
      printCostPaise: Math.round(recomputed.printCost * 100),
      paperCostPaise: Math.round(recomputed.paperCost * 100),
      finishingCostPaise: Math.round(recomputed.finishingCost * 100),
      discountPaise: Math.round(recomputed.discount * 100),
      taxPaise: Math.round(recomputed.tax * 100),
      totalPaise: recomputedTotalPaise,
      printCost: recomputed.printCost,
      paperCost: recomputed.paperCost,
      finishingCost: recomputed.finishingCost,
      discount: recomputed.discount,
      tax: recomputed.tax,
      total: recomputed.total,
      currency: 'INR'
    };

    const orderItemId = 'item_' + Date.now().toString(36) + '_1';
    const orderItem: OrderItem = {
      id: orderItemId,
      orderId,
      fileId,
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
      pricingSnapshot
    };

    const timelineEvent = {
      id: 'evt_' + Date.now().toString(36) + '_1',
      status: initialStatus,
      timestamp: nowIso,
      actorId: identity.uid || (identity.guestSessionId ? 'guest_' + identity.guestSessionId.slice(-6) : 'customer'),
      actorRole: 'CUSTOMER',
      note: paymentMethod === 'CASH'
        ? 'Order created. Cash payment pending at counter.'
        : 'Order created. Manual UPI payment pending verification.'
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
      amountPaise: recomputedTotalPaise,
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
      details: { orderNumber, paymentMethod, totalPaise: recomputedTotalPaise }
    };

    const orderRecord: Order = {
      id: orderId,
      orderNumber,
      organizationId: draft.organizationId,
      shopId: draft.shopId,
      customerId: identity.uid || null,
      customerName,
      customerMobile,
      customerEmail,
      draftId,
      guestSessionId: identity.guestSessionId || draft.guestSessionId || null,
      ownerUid: identity.uid || draft.ownerUid || null,
      isGuest: !identity.isAuthenticated,
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
      paymentMethod,
      currency: 'INR',
      subtotalPaise: Math.round(recomputed.subtotal * 100),
      discountPaise: Math.round(recomputed.discount * 100),
      taxPaise: Math.round(recomputed.tax * 100),
      totalPaise: recomputedTotalPaise,
      totalAmount: recomputed.total,
      items: [orderItem],
      pricingSnapshot,
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

    transaction.set(db.collection('orderItems').doc(orderItemId), orderItem);

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

  return await db.runTransaction(async (transaction) => {
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
        if (order.paymentStatus !== 'UPI_PENDING') {
          throw new Error('Cannot confirm UPI payment for order with payment status: ' + order.paymentStatus);
        }
        newPaymentStatus = 'PAID';
        isPaymentChanged = true;
        eventNote = eventNote || 'Manual UPI payment verified and confirmed by staff.';
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
    upiConfig: shop.upiConfig ? {
      upiId: shop.upiConfig.upiId,
      merchantName: shop.upiConfig.merchantName,
      isEnabled: shop.upiConfig.isEnabled,
      isVerified: shop.upiConfig.isVerified
    } : null
  };
}
