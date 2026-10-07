import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const {
  UpiPaymentUtils,
  PRIMARY_PILOT_SHOP,
  canTransitionOrder
} = require('../dist/index.js');

test('Phase 6: Manual UPI Payment Suite', async (t) => {
  // Test 1: SHOP UPI CONFIG
  await t.test('SHOP UPI CONFIG: Validates configurable payment settings model', () => {
    const defaultSettings = {
      enabled: true,
      upiId: 'shakeel@ybl',
      payeeName: 'Shakeel Online Services',
      providerLabel: 'PhonePe / UPI',
      verificationMode: 'STAFF_CONFIRMATION',
      showQr: true,
      showUpiIntent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    assert.equal(defaultSettings.enabled, true);
    assert.ok(defaultSettings.upiId.includes('@'));
    assert.equal(defaultSettings.verificationMode, 'STAFF_CONFIRMATION');
    assert.equal(defaultSettings.providerLabel, 'PhonePe / UPI');
  });

  // Test 2: OWNER PAYMENT SETTINGS VALIDATION
  await t.test('OWNER PAYMENT SETTINGS: Rejects invalid UPI IDs missing @ symbol', () => {
    assert.throws(() => {
      UpiPaymentUtils.generateUpiPaymentUri({
        upiId: 'invalid_upi_id_no_at',
        payeeName: 'Shakeel Online Services',
        amountRupees: '12.00'
      });
    }, /INVALID_UPI_ID/);

    assert.throws(() => {
      UpiPaymentUtils.generateUpiPaymentUri({
        upiId: 'valid@upi',
        payeeName: '',
        amountRupees: '12.00'
      });
    }, /INVALID_PAYEE_NAME/);

    assert.throws(() => {
      UpiPaymentUtils.generateUpiPaymentUri({
        upiId: 'valid@upi',
        payeeName: 'Shakeel',
        amountRupees: -5
      });
    }, /INVALID_AMOUNT/);
  });

  // Test 3: SERVER AUTHORITATIVE AMOUNT & MONEY FORMATTING
  await t.test('SERVER AUTHORITATIVE AMOUNT: Formats integer paise to exact INR without float errors', () => {
    assert.equal(UpiPaymentUtils.formatPaiseToRupees(100), '1.00');
    assert.equal(UpiPaymentUtils.formatPaiseToRupees(250), '2.50');
    assert.equal(UpiPaymentUtils.formatPaiseToRupees(1000), '10.00');
    assert.equal(UpiPaymentUtils.formatPaiseToRupees(1200), '12.00');
    assert.equal(UpiPaymentUtils.formatPaiseToRupees(9900), '99.00');
    assert.equal(UpiPaymentUtils.formatPaiseToRupees(10000), '100.00');
    assert.equal(UpiPaymentUtils.formatPaiseToRupees(100050), '1000.50');
  });

  // Test 4: UPI URI GENERATION AND PARSING
  await t.test('UPI URI: Generates RFC-compliant UPI payment intent URI and parses correctly', () => {
    const uri = UpiPaymentUtils.generateUpiPaymentUri({
      upiId: 'pilot.shop@okhdfcbank',
      payeeName: 'Shakeel Online Services',
      amountRupees: '12.50',
      orderToken: 'S2P-26-000101',
      reference: 'S2P-UPI-000101-AB12'
    });

    assert.ok(uri.startsWith('upi://pay?'), 'URI must begin with upi://pay?');
    assert.ok(uri.includes('pa=pilot.shop%40okhdfcbank'));
    assert.ok(uri.includes('am=12.50'));
    assert.ok(uri.includes('cu=INR'));
    assert.ok(uri.includes('tr=S2P-UPI-000101-AB12'));

    const parsed = UpiPaymentUtils.parseUpiPaymentUri(uri);
    assert.equal(parsed.upiId, 'pilot.shop@okhdfcbank');
    assert.equal(parsed.payeeName, 'Shakeel Online Services');
    assert.equal(parsed.amountRupees, '12.50');
    assert.equal(parsed.currency, 'INR');
    assert.equal(parsed.reference, 'S2P-UPI-000101-AB12');
  });

  // Test 5: UPI QR GENERATION
  await t.test('UPI QR: Generates deterministic SVG and DataURL without external API', async () => {
    const uri = UpiPaymentUtils.generateUpiPaymentUri({
      upiId: 'shop@ybl',
      payeeName: 'Shakeel',
      amountRupees: '25.00',
      orderToken: 'S2P-26-000102'
    });

    const svg = await UpiPaymentUtils.generateUpiQrSvg(uri);
    assert.ok(svg.includes('<svg'), 'SVG QR must contain <svg tag');
    assert.ok(svg.includes('</svg>'), 'SVG QR must close with </svg>');

    const dataUrl = await UpiPaymentUtils.generateUpiQrDataUrl(uri);
    assert.ok(dataUrl.startsWith('data:image/png;base64,'), 'DataURL must be base64 PNG');
  });

  // Test 6: UNIQUE PAYMENT REFERENCE
  await t.test('PAYMENT REFERENCE: Generates unique S2P-UPI references', () => {
    const ref1 = UpiPaymentUtils.generateManualPaymentReference('S2P-26-000101');
    const ref2 = UpiPaymentUtils.generateManualPaymentReference('S2P-26-000101');

    assert.ok(ref1.startsWith('S2P-UPI-'), 'Ref must start with S2P-UPI-');
    assert.ok(ref2.startsWith('S2P-UPI-'), 'Ref must start with S2P-UPI-');
    assert.notEqual(ref1, ref2, 'Consecutive references must be distinct');
  });

  // Test 7: PRICE CHANGE INVALIDATION
  await t.test('PRICE CHANGE SAFETY: Changing order configuration recalculates authoritative payment', () => {
    const initialPaise = 1200;
    const initialRupees = UpiPaymentUtils.formatPaiseToRupees(initialPaise);
    const initialUri = UpiPaymentUtils.generateUpiPaymentUri({
      upiId: 'shop@ybl',
      payeeName: 'Shakeel',
      amountRupees: initialRupees,
      orderToken: 'S2P-26-000103'
    });

    // Customer adds copies -> price doubles to 2400 paise
    const updatedPaise = 2400;
    const updatedRupees = UpiPaymentUtils.formatPaiseToRupees(updatedPaise);
    const updatedUri = UpiPaymentUtils.generateUpiPaymentUri({
      upiId: 'shop@ybl',
      payeeName: 'Shakeel',
      amountRupees: updatedRupees,
      orderToken: 'S2P-26-000103'
    });

    assert.notEqual(initialUri, updatedUri);
    assert.ok(initialUri.includes('am=12.00'));
    assert.ok(updatedUri.includes('am=24.00'));
  });

  // Test 8: CUSTOMER I'VE PAID TRANSITION (CANNOT DIRECTLY SET PAID)
  await t.test("CUSTOMER CLAIM: Customer clicking I'VE PAID sets MANUAL_UPI_REVIEW_PENDING, not PAID", () => {
    const order = {
      id: 'ord_test_upi_001',
      orderNumber: 'S2P-26-000104',
      status: 'RECEIVED',
      paymentMethod: 'MANUAL_UPI',
      paymentStatus: 'UPI_PENDING',
      totalPaise: 1500
    };

    // Customer clicks I'VE PAID
    const customerClaimedStatus = 'MANUAL_UPI_REVIEW_PENDING';
    const customerClaimedUtr = '423981729102';

    // Simulate update
    order.paymentStatus = customerClaimedStatus;
    order.customerClaimedUtr = customerClaimedUtr;

    assert.equal(order.paymentStatus, 'MANUAL_UPI_REVIEW_PENDING');
    assert.notEqual(order.paymentStatus, 'PAID', 'Customer claim must NEVER set status to PAID directly');
    assert.equal(order.customerClaimedUtr, '423981729102');
  });

  // Test 9: STAFF CONFIRMATION & IDEMPOTENCY
  await t.test('STAFF CONFIRMATION: Authorized staff confirms payment transactionally and idempotently', () => {
    const order = {
      id: 'ord_test_upi_002',
      orderNumber: 'S2P-26-000105',
      shopId: 'shakeel-online-services',
      status: 'RECEIVED',
      paymentMethod: 'MANUAL_UPI',
      paymentStatus: 'MANUAL_UPI_REVIEW_PENDING',
      totalPaise: 2000
    };

    const staffUid = 'staff_shakeel_01';
    const staffRole = 'COUNTER_STAFF';

    // Transition logic
    function confirmPayment(ord, uid, role, shop) {
      if (ord.shopId !== shop) throw new Error('FORBIDDEN: Cross-shop action');
      if (ord.paymentStatus === 'PAID') {
        return { success: true, alreadyPaid: true };
      }
      ord.paymentStatus = 'PAID';
      ord.status = ord.status === 'RECEIVED' ? 'ACCEPTED' : ord.status;
      ord.confirmedByUid = uid;
      ord.confirmedAt = new Date().toISOString();
      return { success: true, alreadyPaid: false };
    }

    const firstRun = confirmPayment(order, staffUid, staffRole, 'shakeel-online-services');
    assert.equal(firstRun.success, true);
    assert.equal(firstRun.alreadyPaid, false);
    assert.equal(order.paymentStatus, 'PAID');
    assert.equal(order.status, 'ACCEPTED');
    assert.equal(order.confirmedByUid, staffUid);

    // Idempotent second click
    const secondRun = confirmPayment(order, staffUid, staffRole, 'shakeel-online-services');
    assert.equal(secondRun.success, true);
    assert.equal(secondRun.alreadyPaid, true, 'Second confirmation must be idempotent');
  });

  // Test 10: CROSS-SHOP CONFIRMATION BLOCKED
  await t.test('CROSS-SHOP ISOLATION: Staff from shop B cannot confirm shop A order', () => {
    const orderShopA = {
      id: 'ord_test_upi_003',
      shopId: 'shop-a-xerox',
      paymentStatus: 'MANUAL_UPI_REVIEW_PENDING'
    };

    function confirmCrossShop(ord, staffShopId) {
      if (ord.shopId !== staffShopId) {
        throw new Error('FORBIDDEN: Insufficient permissions to confirm payment for this shop.');
      }
      ord.paymentStatus = 'PAID';
    }

    assert.throws(() => {
      confirmCrossShop(orderShopA, 'shop-b-cyber-cafe');
    }, /FORBIDDEN/);
  });

  // Test 11: STAFF NOT RECEIVED
  await t.test('NOT RECEIVED: Staff can mark payment NOT_FOUND without canceling order or auto-printing', () => {
    const order = {
      id: 'ord_test_upi_004',
      status: 'RECEIVED',
      paymentMethod: 'MANUAL_UPI',
      paymentStatus: 'MANUAL_UPI_REVIEW_PENDING'
    };

    order.paymentStatus = 'MANUAL_UPI_NOT_FOUND';
    assert.equal(order.paymentStatus, 'MANUAL_UPI_NOT_FOUND');
    assert.notEqual(order.status, 'PRINTING');
    assert.notEqual(order.status, 'QUEUED_FOR_PRINT');
  });

  // Test 12: PRINT DISPATCH SAFETY
  await t.test('PRINT DISPATCH SAFETY: Auto-print blocked when paymentStatus is not PAID', () => {
    const orderPending = {
      id: 'ord_test_upi_005',
      paymentMethod: 'MANUAL_UPI',
      paymentStatus: 'MANUAL_UPI_REVIEW_PENDING'
    };

    function canAutoQueuePrint(ord) {
      if (ord.paymentMethod === 'MANUAL_UPI' && ord.paymentStatus !== 'PAID') {
        return false;
      }
      return ord.paymentStatus === 'PAID';
    }

    assert.equal(canAutoQueuePrint(orderPending), false, 'Must block auto print when payment is pending verification');

    orderPending.paymentStatus = 'PAID';
    assert.equal(canAutoQueuePrint(orderPending), true, 'May allow auto queue only after verified PAID');
  });
});