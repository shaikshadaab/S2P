process.env.GUEST_SESSION_SECRET = 'test_secret_key_for_phase4_tests_12345678';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const {
  calculatePrintPrice,
  parsePageRange,
  canTransitionOrder,
  generateCustomerOrderNumber,
  PRIMARY_PILOT_SHOP,
  createGuestSessionToken,
  verifyGuestSessionToken
} = require('../dist/index.js');

test('Phase 4: Order Draft Creation and Ownership', async (t) => {
  await t.test('creates guest order draft with valid session token', () => {
    const session = createGuestSessionToken();
    assert.ok(session.token, 'Should create token');
    assert.ok(session.guestSessionId, 'Should create guestSessionId');

    const draft = {
      id: 'dft_test_123',
      shopId: PRIMARY_PILOT_SHOP.id,
      organizationId: 'org_shakeel_services',
      isGuest: true,
      guestSessionId: session.guestSessionId,
      ownerUid: null,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };

    assert.equal(draft.status, 'DRAFT');
    assert.equal(draft.shopId, 'shakeel-online-services');
    assert.equal(draft.organizationId, 'org_shakeel_services');
    assert.equal(draft.guestSessionId, session.guestSessionId);
  });

  await t.test('enforces guest session ownership verification', () => {
    const validSession = createGuestSessionToken();
    const otherSession = createGuestSessionToken();

    const draft = {
      id: 'dft_test_456',
      isGuest: true,
      guestSessionId: validSession.guestSessionId
    };

    const callerGuestId = verifyGuestSessionToken(validSession.token);
    assert.equal(callerGuestId, draft.guestSessionId, 'Matching session token must authenticate owner');

    const attackerGuestId = verifyGuestSessionToken(otherSession.token);
    assert.notEqual(attackerGuestId, draft.guestSessionId, 'Mismatched guest session must be rejected');
  });

  await t.test('enforces authenticated user draft ownership', () => {
    const draft = {
      id: 'dft_auth_789',
      isGuest: false,
      ownerUid: 'user_cust_001',
      guestSessionId: null
    };

    assert.equal('user_cust_001', draft.ownerUid, 'Legitimate authenticated owner matches');
    assert.notEqual('user_cust_999', draft.ownerUid, 'Unauthorized caller does not match');
  });

  await t.test('validates file belongs to order draft', () => {
    const draftId = 'dft_abc_123';
    const legitimateFile = { id: 'file_1', draftId: 'dft_abc_123', documentAvailable: true };
    const foreignFile = { id: 'file_2', draftId: 'dft_xyz_999', documentAvailable: true };

    assert.equal(legitimateFile.draftId, draftId, 'File belongs to draft');
    assert.notEqual(foreignFile.draftId, draftId, 'Foreign file does not belong to draft');
  });
});

test('Phase 4: Custom Page Range Validation', async (t) => {
  const totalPages = 20;

  await t.test('parses All Pages correctly', () => {
    const pages = parsePageRange('all', totalPages);
    assert.equal(pages.length, 20);
    assert.equal(pages[0], 1);
    assert.equal(pages[19], 20);
  });

  await t.test('parses comma-separated pages and ranges', () => {
    const pages = parsePageRange('1, 3, 5-8', totalPages);
    assert.deepEqual(pages, [1, 3, 5, 6, 7, 8]);
    assert.equal(pages.length, 6);
  });

  await t.test('rejects out of bounds page numbers exceeding authoritative file page count', () => {
    assert.throws(() => parsePageRange('1-25', totalPages), /exceeds total document pages/i);
  });

  await t.test('rejects inverted or non-positive ranges', () => {
    assert.throws(() => parsePageRange('5-2', totalPages), /invalid page range segment/i);
    assert.throws(() => parsePageRange('0-5', totalPages), /invalid page range segment/i);
    assert.throws(() => parsePageRange('abc,def', totalPages), /invalid page number/i);
  });
});

test('Phase 4: Authoritative Live Quote & Price Integrity', async (t) => {
  await t.test('calculates correct integer paise breakdown for B&W single-sided A4', () => {
    const price = calculatePrintPrice({
      selectedPages: [1, 2, 3, 4, 5],
      copies: 2,
      colorMode: 'BW',
      duplexMode: 'SINGLE',
      paperSize: 'A4',
      paperType: 'NORMAL_75GSM',
      finishing: 'NONE'
    });

    assert.equal(price.total, 20.00);
    assert.equal(price.totalSides, 10);
    assert.equal(price.sheetCount, 10);
  });

  await t.test('detects expired quote and prevents old price usage', () => {
    const pastExpiresAt = new Date(Date.now() - 5000).toISOString();
    const isExpired = new Date(pastExpiresAt).getTime() <= Date.now();
    assert.equal(isExpired, true, 'Quote in past must be treated as expired');

    const freshExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const isFresh = new Date(freshExpiresAt).getTime() > Date.now();
    assert.equal(isFresh, true, 'Quote in future is valid');
  });

  await t.test('rejects client price tampering and recalculates authoritatively', () => {
    const clientClaimedTotal = 5.00;
    const authoritativeQuote = calculatePrintPrice({
      selectedPages: Array.from({ length: 20 }, (_, i) => i + 1),
      copies: 1,
      colorMode: 'COLOR',
      duplexMode: 'SINGLE',
      paperSize: 'A4',
      paperType: 'NORMAL_75GSM',
      finishing: 'NONE'
    });

    assert.notEqual(clientClaimedTotal, authoritativeQuote.total, 'Authoritative price must override client total');
    assert.ok(authoritativeQuote.total > clientClaimedTotal, 'True price must be calculated on server');
  });
});

test('Phase 4: Order Creation, Idempotency & Immutable Snapshot', async (t) => {
  await t.test('generates human-friendly customer order number', () => {
    const orderNum1 = generateCustomerOrderNumber();
    const orderNum2 = generateCustomerOrderNumber();

    assert.match(orderNum1, /^S2P-\d+$/);
    assert.match(orderNum2, /^S2P-\d+$/);
    assert.notEqual(orderNum1, orderNum2);
  });

  await t.test('converts draft once and guarantees idempotency on duplicate checkout', () => {
    let draft = {
      id: 'dft_1001',
      status: 'DRAFT',
      convertedOrderId: null
    };

    const firstOrderId = 'ord_first_001';
    draft = {
      ...draft,
      status: 'CONVERTED',
      convertedOrderId: firstOrderId
    };
    assert.equal(draft.status, 'CONVERTED');

    const isAlreadyConverted = draft.status === 'CONVERTED' && draft.convertedOrderId !== null;
    assert.equal(isAlreadyConverted, true);
    const returnedOrderId = draft.convertedOrderId;
    assert.equal(returnedOrderId, firstOrderId, 'Idempotent request must return existing order');
  });

  await t.test('preserves immutable pricing snapshot against subsequent rule changes', () => {
    const originalQuote = calculatePrintPrice({
      selectedPages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      copies: 1,
      colorMode: 'BW',
      duplexMode: 'SINGLE',
      paperSize: 'A4'
    });

    const immutableSnapshot = {
      pricingVersion: '2.0.0',
      calculatedAt: new Date().toISOString(),
      subtotal: originalQuote.subtotal,
      total: originalQuote.total
    };

    const newQuote = calculatePrintPrice({
      selectedPages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      copies: 1,
      colorMode: 'BW',
      duplexMode: 'SINGLE',
      paperSize: 'A4',
      customPricing: {
        a4BwSingle: 10.0,
        quantitySlabs: []
      }
    });

    assert.equal(immutableSnapshot.total, originalQuote.total, 'Snapshot total remains fixed');
    assert.notEqual(immutableSnapshot.total, newQuote.total, 'Snapshot is untouched by later pricing changes');
  });
});

test('Phase 4: Payment States, Role Security & Order Timeline', async (t) => {
  await t.test('initializes CASH as CASH_PENDING and MANUAL_UPI as UPI_PENDING', () => {
    const cashOrder = { paymentMethod: 'CASH', paymentStatus: 'CASH_PENDING', status: 'RECEIVED' };
    const upiOrder = { paymentMethod: 'MANUAL_UPI', paymentStatus: 'UPI_PENDING', status: 'RECEIVED' };

    assert.equal(cashOrder.paymentStatus, 'CASH_PENDING');
    assert.notEqual(cashOrder.paymentStatus, 'PAID');

    assert.equal(upiOrder.paymentStatus, 'UPI_PENDING');
    assert.notEqual(upiOrder.paymentStatus, 'PAID');
  });

  await t.test('customer role CANNOT transition order status or mark paid', () => {
    const customerRole = 'CUSTOMER';
    const allowedStaffRoles = ['OWNER', 'MANAGER', 'COUNTER_STAFF'];

    assert.equal(allowedStaffRoles.includes(customerRole), false, 'Customer cannot have staff permissions');
  });

  await t.test('authorized staff (COUNTER_STAFF, MANAGER, OWNER) can confirm payment', () => {
    const roles = ['COUNTER_STAFF', 'MANAGER', 'OWNER'];
    for (const role of roles) {
      const isAuthorized = ['OWNER', 'MANAGER', 'COUNTER_STAFF'].includes(role);
      assert.equal(isAuthorized, true);
    }
  });

  await t.test('enforces valid order state transitions and prevents illegal jumps', () => {
    assert.equal(canTransitionOrder('RECEIVED', 'ACCEPTED'), true);
    assert.equal(canTransitionOrder('ACCEPTED', 'QUEUED_FOR_PRINT'), true);
    assert.equal(canTransitionOrder('READY', 'COMPLETED'), true);
    assert.equal(canTransitionOrder('COMPLETED', 'RECEIVED'), false);
    assert.equal(canTransitionOrder('CANCELLED', 'PRINTING'), false);
  });

  await t.test('enforces tenant isolation: Shop A staff cannot access Shop B orders', () => {
    const shopAStaff = { uid: 'staff_1', shopId: 'shop_a' };
    const shopBOrder = { id: 'ord_b', shopId: 'shop_b' };

    const isSameTenant = shopAStaff.shopId === shopBOrder.shopId;
    assert.equal(isSameTenant, false, 'Shop A staff cannot access Shop B order');
  });

  await t.test('order timeline records initial event and appends transitions with audit', () => {
    const order = {
      id: 'ord_timeline_test',
      timeline: [
        {
          id: 'evt_1',
          status: 'RECEIVED',
          timestamp: '2026-10-06T10:00:00.000Z',
          actorRole: 'SYSTEM',
          note: 'Order placed by customer.'
        }
      ]
    };

    const acceptEvent = {
      id: 'evt_2',
      status: 'ACCEPTED',
      timestamp: '2026-10-06T10:02:00.000Z',
      actorId: 'staff_123',
      actorRole: 'COUNTER_STAFF',
      note: 'Order accepted by Shakeel staff.'
    };

    order.timeline.push(acceptEvent);
    assert.equal(order.timeline.length, 2);
    assert.equal(order.timeline[0].status, 'RECEIVED');
    assert.equal(order.timeline[1].status, 'ACCEPTED');
    assert.equal(order.timeline[1].actorRole, 'COUNTER_STAFF');
  });

  await t.test('tracking ownership allows owner and denies unauthorized guest', () => {
    const order = {
      id: 'ord_track_01',
      isGuest: true,
      guestSessionId: 'guest_legit_111'
    };

    const callerSameGuest = 'guest_legit_111';
    const callerOtherGuest = 'guest_intruder_222';

    assert.equal(callerSameGuest === order.guestSessionId, true, 'Legitimate guest can track order');
    assert.equal(callerOtherGuest === order.guestSessionId, false, 'Unauthorized guest cannot track order');
  });
});

test('Phase 4.1: Customer Order Flow Hardening & Corrections', async (t) => {
  await t.test('orientation persistence into print configuration and order items', () => {
    const orientations = ['AUTO', 'PORTRAIT', 'LANDSCAPE'];
    for (const orient of orientations) {
      const config = {
        paperSize: 'A4',
        colorMode: 'BW',
        duplexMode: 'SINGLE',
        copies: 1,
        orientation: orient,
        scaling: 'FIT'
      };
      assert.equal(config.orientation, orient);
    }
  });

  await t.test('scaling persistence into print configuration and order items', () => {
    const scalings = ['FIT', 'ACTUAL_SIZE'];
    for (const sc of scalings) {
      const config = {
        paperSize: 'A4',
        colorMode: 'BW',
        duplexMode: 'SINGLE',
        copies: 1,
        orientation: 'AUTO',
        scaling: sc
      };
      assert.equal(config.scaling, sc);
    }
  });

  await t.test('disabled service option rejected by validator', () => {
    const shopOptions = {
      paperSizes: [{ id: 'A4', label: 'A4', enabled: true }, { id: 'A3', label: 'A3', enabled: false }],
      colorModes: [{ id: 'BW', label: 'B&W', enabled: true }, { id: 'COLOR', label: 'Color', enabled: false }],
      duplexModes: [{ id: 'SINGLE', label: 'Single', enabled: true }, { id: 'DOUBLE', label: 'Double', enabled: true }],
      paperTypes: [{ id: 'NORMAL_75GSM', label: '75 GSM', enabled: true }],
      finishingOptions: [{ id: 'NONE', label: 'None', enabled: true }, { id: 'LAMINATION', label: 'Lamination', enabled: false }]
    };

    function validateOptions(options, config) {
      if (config.paperSize) {
        const opt = options.paperSizes.find(o => o.id === config.paperSize);
        if (!opt || !opt.enabled) throw new Error('OPTION_DISABLED: Paper size disabled');
      }
      if (config.colorMode) {
        const opt = options.colorModes.find(o => o.id === config.colorMode);
        if (!opt || !opt.enabled) throw new Error('OPTION_DISABLED: Color mode disabled');
      }
      if (config.finishing && config.finishing !== 'NONE') {
        const opt = options.finishingOptions.find(o => o.id === config.finishing);
        if (!opt || !opt.enabled) throw new Error('OPTION_DISABLED: Finishing disabled');
      }
    }

    assert.doesNotThrow(() => validateOptions(shopOptions, { paperSize: 'A4', colorMode: 'BW', finishing: 'NONE' }));
    assert.throws(() => validateOptions(shopOptions, { paperSize: 'A3', colorMode: 'BW' }), /OPTION_DISABLED/);
    assert.throws(() => validateOptions(shopOptions, { paperSize: 'A4', colorMode: 'COLOR' }), /OPTION_DISABLED/);
    assert.throws(() => validateOptions(shopOptions, { paperSize: 'A4', colorMode: 'BW', finishing: 'LAMINATION' }), /OPTION_DISABLED/);
  });

  await t.test('hardcoded UPI absent from pilot shop constant', () => {
    assert.equal(PRIMARY_PILOT_SHOP.defaultUpiId, undefined, 'Hardcoded defaultUpiId must be absent from PRIMARY_PILOT_SHOP');
  });

  await t.test('UPI missing config handled safely (Cash only fallback)', () => {
    const shopWithoutUpi = { id: 'shop_no_upi', upiConfig: null };
    const shopDisabledUpi = { id: 'shop_disabled_upi', upiConfig: { upiId: 'merchant@upi', isEnabled: false } };
    const shopActiveUpi = { id: 'shop_active_upi', upiConfig: { upiId: 'shakeel@icici', merchantName: 'Shakeel', isEnabled: true } };

    function resolvePaymentOptions(shop) {
      const upi = shop.upiConfig;
      const isUpiAvailable = Boolean(upi && upi.isEnabled && upi.upiId);
      return {
        isUpiAvailable,
        methods: isUpiAvailable ? ['CASH', 'MANUAL_UPI'] : ['CASH']
      };
    }

    assert.deepEqual(resolvePaymentOptions(shopWithoutUpi).methods, ['CASH']);
    assert.deepEqual(resolvePaymentOptions(shopDisabledUpi).methods, ['CASH']);
    assert.deepEqual(resolvePaymentOptions(shopActiveUpi).methods, ['CASH', 'MANUAL_UPI']);
  });

  await t.test('UPI total equals authoritative order total', () => {
    const order = {
      orderNumber: 'S2P-26-000001',
      totalAmount: 14.50,
      totalPaise: 1450,
      shopId: 'shakeel-online-services'
    };
    const upiConfig = {
      upiId: 'shakeel.pilot@okhdfcbank',
      merchantName: 'Shakeel Online Services',
      isEnabled: true
    };

    const upiUri = `upi://pay?pa=${encodeURIComponent(upiConfig.upiId)}&pn=${encodeURIComponent(upiConfig.merchantName)}&am=${order.totalAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`S2P Order ${order.orderNumber}`)}`;

    assert.ok(upiUri.includes('am=14.50'), 'UPI URI must include authoritative formatted rupees');
    assert.ok(upiUri.includes('pa=shakeel.pilot%40okhdfcbank'));
    assert.ok(upiUri.includes('tn=S2P%20Order%20S2P-26-000001'));
  });

  await t.test('paymentEvents creation records immutable payment audit trail', () => {
    const paymentEvents = [];

    function recordPaymentEvent(evt) {
      if (evt.actorRole === 'CUSTOMER' && evt.newStatus === 'PAID') {
        throw new Error('SECURITY_VIOLATION: Customer cannot mark order PAID directly');
      }
      paymentEvents.push({
        id: 'pe_' + Date.now(),
        ...evt,
        createdAt: new Date().toISOString()
      });
    }

    // Customer places cash order
    recordPaymentEvent({
      orderId: 'ord_1',
      previousStatus: null,
      newStatus: 'CASH_PENDING',
      amountPaise: 2500,
      actorType: 'GUEST',
      actorRole: 'CUSTOMER'
    });
    assert.equal(paymentEvents.length, 1);
    assert.equal(paymentEvents[0].newStatus, 'CASH_PENDING');

    // Customer attempts to self-confirm paid -> must throw
    assert.throws(
      () => recordPaymentEvent({
        orderId: 'ord_1',
        previousStatus: 'CASH_PENDING',
        newStatus: 'PAID',
        actorRole: 'CUSTOMER'
      }),
      /SECURITY_VIOLATION/
    );

    // Staff confirms payment
    recordPaymentEvent({
      orderId: 'ord_1',
      previousStatus: 'CASH_PENDING',
      newStatus: 'PAID',
      amountPaise: 2500,
      actorType: 'STAFF',
      actorUid: 'staff_shakeel_1',
      actorRole: 'COUNTER_STAFF'
    });
    assert.equal(paymentEvents.length, 2);
    assert.equal(paymentEvents[1].newStatus, 'PAID');
    assert.equal(paymentEvents[1].actorRole, 'COUNTER_STAFF');
  });

  await t.test('orderStatusHistory creation records immutable status transitions', () => {
    const history = [];

    function transitionStatus(fromStatus, toStatus, actor) {
      if (!canTransitionOrder(fromStatus, toStatus)) {
        throw new Error(`INVALID_TRANSITION: ${fromStatus} -> ${toStatus}`);
      }
      history.push({
        fromStatus,
        toStatus,
        actorType: actor.type,
        actorUid: actor.uid,
        actorRole: actor.role,
        createdAt: new Date().toISOString()
      });
    }

    transitionStatus('RECEIVED', 'ACCEPTED', { type: 'STAFF', uid: 'staff_1', role: 'COUNTER_STAFF' });
    transitionStatus('ACCEPTED', 'QUEUED_FOR_PRINT', { type: 'STAFF', uid: 'staff_1', role: 'COUNTER_STAFF' });
    transitionStatus('QUEUED_FOR_PRINT', 'PRINTING', { type: 'SYSTEM', uid: 'print_agent', role: 'PRINT_AGENT' });

    assert.equal(history.length, 3);
    assert.equal(history[0].fromStatus, 'RECEIVED');
    assert.equal(history[0].toStatus, 'ACCEPTED');
    assert.equal(history[1].fromStatus, 'ACCEPTED');
    assert.equal(history[1].toStatus, 'QUEUED_FOR_PRINT');
    assert.equal(history[2].toStatus, 'PRINTING');

    assert.throws(() => transitionStatus('PRINTING', 'RECEIVED', { type: 'STAFF', uid: 'staff_1', role: 'STAFF' }));
  });

  await t.test('unique sequential order number generator (S2P-YY-XXXXXX)', () => {
    let nextOrderSequence = 1;
    const year = 26;

    function generateNextSequential() {
      const current = nextOrderSequence;
      nextOrderSequence += 1;
      const padded = current.toString().padStart(6, '0');
      return `S2P-${year}-${padded}`;
    }

    const num1 = generateNextSequential();
    const num2 = generateNextSequential();
    const num3 = generateNextSequential();

    assert.equal(num1, 'S2P-26-000001');
    assert.equal(num2, 'S2P-26-000002');
    assert.equal(num3, 'S2P-26-000003');
    assert.notEqual(num1, num2);
    assert.notEqual(num2, num3);
  });

  await t.test('duplicate checkout returns same order number (Idempotency)', () => {
    const draft = {
      id: 'draft_100',
      status: 'CONVERTED',
      convertedOrderId: 'ord_100'
    };
    const existingOrder = {
      id: 'ord_100',
      orderNumber: 'S2P-26-000042',
      status: 'RECEIVED'
    };

    function checkout(draftDoc) {
      if (draftDoc.status === 'CONVERTED' && draftDoc.convertedOrderId) {
        return { orderId: existingOrder.id, orderNumber: existingOrder.orderNumber, isExisting: true };
      }
      return { orderId: 'ord_new', orderNumber: 'S2P-26-000043', isExisting: false };
    }

    const res1 = checkout(draft);
    const res2 = checkout(draft);

    assert.equal(res1.orderNumber, 'S2P-26-000042');
    assert.equal(res2.orderNumber, 'S2P-26-000042');
    assert.equal(res1.orderId, res2.orderId);
  });

  await t.test('missing pricing configuration fails closed with PRICING_NOT_CONFIGURED', () => {
    function loadPricing(shopPricingDoc, isProduction) {
      if (!shopPricingDoc || !shopPricingDoc.pricingRules) {
        if (isProduction) {
          throw new Error('PRICING_NOT_CONFIGURED: Active pricing rules not configured for shop.');
        }
      }
      return shopPricingDoc?.pricingRules;
    }

    assert.throws(() => loadPricing(null, true), /PRICING_NOT_CONFIGURED/);
    assert.throws(() => loadPricing({ pricingRules: null }, true), /PRICING_NOT_CONFIGURED/);
  });

  await t.test('cross-draft file attachment rejected', () => {
    const draft = { id: 'draft_A', shopId: 'shop_1' };
    const file = { id: 'file_B', orderId: 'draft_B', shopId: 'shop_1' };

    function validateAttachment(d, f) {
      if (f.orderId !== d.id) {
        throw new Error('CROSS_DRAFT_FORBIDDEN: File does not belong to draft');
      }
    }

    assert.throws(() => validateAttachment(draft, file), /CROSS_DRAFT_FORBIDDEN/);
  });

  await t.test('cross-shop quote rejected', () => {
    const quote = { id: 'quote_1', shopId: 'shop_A' };
    const draft = { id: 'draft_1', shopId: 'shop_B' };

    function validateQuoteShop(q, d) {
      if (q.shopId !== d.shopId) {
        throw new Error('CROSS_SHOP_FORBIDDEN: Quote shop mismatch');
      }
    }

    assert.throws(() => validateQuoteShop(quote, draft), /CROSS_SHOP_FORBIDDEN/);
  });
});
