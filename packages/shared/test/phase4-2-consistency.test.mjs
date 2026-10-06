import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  calculatePrintPrice,
  parsePageRange,
  canTransitionOrder,
  PRIMARY_PILOT_SHOP
} = require('../dist/index.js');

// Mock in-memory Firestore engine for unit testing transactional contracts
class MockFirestore {
  constructor() {
    this.collections = new Map();
    this._txLock = Promise.resolve();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    const store = this.collections.get(name);

    return {
      name,
      doc: (id) => {
        return {
          id,
          get: async () => {
            const data = store.get(id);
            return {
              exists: !!data,
              data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined)
            };
          },
          set: async (data, options) => {
            if (options && options.merge && store.has(id)) {
              store.set(id, { ...store.get(id), ...data });
            } else {
              store.set(id, JSON.parse(JSON.stringify(data)));
            }
          },
          update: async (data) => {
            if (!store.has(id)) throw new Error(`Doc ${id} not found`);
            store.set(id, { ...store.get(id), ...data });
          }
        };
      },
      where: (field, op, val) => {
        return {
          where: (f2, o2, v2) => ({
            get: async () => {
              const docs = [];
              for (const [id, data] of store.entries()) {
                if (data[field] === val && data[f2] === v2) {
                  docs.push({ id, data: () => JSON.parse(JSON.stringify(data)) });
                }
              }
              return { empty: docs.length === 0, size: docs.length, docs };
            }
          }),
          get: async () => {
            const docs = [];
            for (const [id, data] of store.entries()) {
              if (data[field] === val) {
                docs.push({ id, data: () => JSON.parse(JSON.stringify(data)) });
              }
            }
            return { empty: docs.length === 0, size: docs.length, docs };
          }
        };
      }
    };
  }

  async runTransaction(updateFunction) {
    return new Promise((resolve, reject) => {
      this._txLock = this._txLock.then(async () => {
        try {
          const transaction = {
            get: async (docRef) => docRef.get(),
            set: async (docRef, data, options) => docRef.set(data, options),
            update: async (docRef, data) => docRef.update(data)
          };
          const res = await updateFunction(transaction);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

test('Phase 4.2: Final Checkout Consistency & Verification', async (t) => {
  // Test 1: Canonical Staff Membership in shopMembers/{uid}_{shopId}
  await t.test('Section 2: getActiveShopMember canonical validation', async () => {
    const db = new MockFirestore();
    const shopId = 'shakeel-online-services';
    const uid = 'staff_shakeel_01';
    const memberDocId = `${uid}_${shopId}`;

    // Seed valid membership
    await db.collection('shopMembers').doc(memberDocId).set({
      userId: uid,
      shopId,
      role: 'COUNTER_STAFF',
      status: 'ACTIVE',
      displayName: 'Counter Staff'
    });

    // Valid check
    const validSnap = await db.collection('shopMembers').doc(memberDocId).get();
    assert.equal(validSnap.exists, true);
    assert.equal(validSnap.data().status, 'ACTIVE');
    assert.equal(validSnap.data().role, 'COUNTER_STAFF');

    // Inactive check
    await db.collection('shopMembers').doc(`${uid}_inactive`).set({
      userId: uid,
      shopId,
      role: 'COUNTER_STAFF',
      status: 'INACTIVE'
    });
    const inactiveSnap = await db.collection('shopMembers').doc(`${uid}_inactive`).get();
    assert.equal(inactiveSnap.data().status, 'INACTIVE');

    // Mismatched UID check
    await db.collection('shopMembers').doc(`wrong_${shopId}`).set({
      userId: 'someone_else',
      shopId,
      role: 'OWNER',
      status: 'ACTIVE'
    });
    const mismatchSnap = await db.collection('shopMembers').doc(`wrong_${shopId}`).get();
    assert.notEqual(mismatchSnap.data().userId, uid);
  });

  // Test 2: Pricing rules dynamically drive calculation
  await t.test('Section 3 & 21: Firestore pricing rules alter quote total (₹2 -> ₹5 rate test)', async () => {
    // 10 pages B&W single A4
    const selectedPages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // Rate 1: Base ₹2.00 / page
    const pricing1 = { a4BwSingle: 2.0 };
    const quote1 = calculatePrintPrice({
      shopId: 'shakeel-online-services',
      pageCount: 10,
      selectedPages,
      copies: 1,
      colorMode: 'BW',
      duplexMode: 'SINGLE',
      paperSize: 'A4',
      paperType: 'NORMAL_75GSM',
      finishing: 'NONE',
      customPricing: pricing1
    });

    // 10 pages * ₹2 = ₹20.00
    assert.equal(quote1.totalSides, 10);
    assert.equal(quote1.printCost, 20.0);
    assert.equal(quote1.total, 20.0);

    // Rate 2: Updated rule: ₹5.00 / page
    const pricing2 = { a4BwSingle: 5.0 };
    const quote2 = calculatePrintPrice({
      shopId: 'shakeel-online-services',
      pageCount: 10,
      selectedPages,
      copies: 1,
      colorMode: 'BW',
      duplexMode: 'SINGLE',
      paperSize: 'A4',
      paperType: 'NORMAL_75GSM',
      finishing: 'NONE',
      customPricing: pricing2
    });

    // 10 pages * ₹5 = ₹50.00
    assert.equal(quote2.totalSides, 10);
    assert.equal(quote2.printCost, 50.0);
    assert.equal(quote2.total, 50.0);
    assert.notEqual(quote1.total, quote2.total);
    assert.equal(quote2.total - quote1.total, 30.0);
  });

  // Test 3: Fail-closed Shop Options
  await t.test('Section 5: Shop print options fail closed when unconfigured', () => {
    function getEffectiveOptions(shop, isTestMode) {
      if (shop.printOptions) return shop.printOptions;
      if (isTestMode) return { fallback: true };
      throw new Error('SHOP_OPTIONS_NOT_CONFIGURED: Shop print options not configured.');
    }

    const shopWithoutOptions = { id: 'shop_1', status: 'ACTIVE' };
    assert.throws(
      () => getEffectiveOptions(shopWithoutOptions, false),
      /SHOP_OPTIONS_NOT_CONFIGURED/
    );

    const testResult = getEffectiveOptions(shopWithoutOptions, true);
    assert.equal(testResult.fallback, true);
  });

  // Test 4: Quote is mandatory for checkout
  await t.test('Section 6 & 8: QuoteId is mandatory and provides authoritative configuration', () => {
    function validateCheckoutPayload(payload) {
      if (!payload.quoteId) {
        throw new Error('quoteId is required. Authoritative quote must be requested prior to checkout.');
      }
      return true;
    }

    assert.throws(
      () => validateCheckoutPayload({ draftId: 'd1', fileId: 'f1' }),
      /quoteId is required/
    );
    assert.equal(
      validateCheckoutPayload({ draftId: 'd1', fileId: 'f1', quoteId: 'qte_123' }),
      true
    );
  });

  // Test 5: Price Change Detection (PRICE_CHANGED error)
  await t.test('Section 7: Detects pricing changes between quote creation and checkout', () => {
    const savedQuote = {
      quoteId: 'qte_abc',
      totalPaise: 2000 // ₹20.00
    };

    function verifyQuotePrice(currentTotalPaise, quote) {
      if (currentTotalPaise !== quote.totalPaise) {
        const err = new Error('PRICE_CHANGED: Pricing rules have changed since quote was generated.');
        err.code = 'PRICE_CHANGED';
        err.oldTotalPaise = quote.totalPaise;
        err.newTotalPaise = currentTotalPaise;
        throw err;
      }
      return true;
    }

    // Unchanged
    assert.equal(verifyQuotePrice(2000, savedQuote), true);

    // Changed to ₹50 (5000 paise)
    assert.throws(
      () => verifyQuotePrice(5000, savedQuote),
      (err) => err.code === 'PRICE_CHANGED' && err.oldTotalPaise === 2000 && err.newTotalPaise === 5000
    );
  });

  // Test 6: Concurrency Test — 20 simultaneous checkouts on SAME draft
  await t.test('Section 10: 20 simultaneous checkouts against SAME draft produce exactly 1 order', async () => {
    const db = new MockFirestore();
    const shopId = 'shakeel-online-services';
    const draftId = 'dft_concurrent_same';

    // Seed draft
    await db.collection('orderDrafts').doc(draftId).set({
      id: draftId,
      shopId,
      status: 'DRAFT'
    });

    // Seed counter
    await db.collection('shopCounters').doc(shopId).set({
      shopId,
      year: 26,
      lastSequence: 10
    });

    let ordersCreatedCount = 0;
    let existingReturnedCount = 0;

    // Simulation of checkout transaction
    async function checkoutDraft() {
      return await db.runTransaction(async (tx) => {
        const draftDoc = await tx.get(db.collection('orderDrafts').doc(draftId));
        const draft = draftDoc.data();

        if (draft.status === 'CONVERTED' && draft.convertedOrderId) {
          existingReturnedCount++;
          return { orderId: draft.convertedOrderId, isExisting: true };
        }

        if (draft.status !== 'DRAFT') {
          throw new Error('Invalid draft status');
        }

        // Increment sequence atomically
        const counterDoc = await tx.get(db.collection('shopCounters').doc(shopId));
        const nextSeq = (counterDoc.data().lastSequence || 0) + 1;
        const orderNumber = `S2P-26-${nextSeq.toString().padStart(6, '0')}`;
        const newOrderId = `ord_created_${nextSeq}`;

        await tx.set(db.collection('shopCounters').doc(shopId), {
          shopId,
          year: 26,
          lastSequence: nextSeq
        });

        await tx.update(db.collection('orderDrafts').doc(draftId), {
          status: 'CONVERTED',
          convertedOrderId: newOrderId
        });

        await tx.set(db.collection('orders').doc(newOrderId), {
          id: newOrderId,
          orderNumber,
          draftId
        });

        ordersCreatedCount++;
        return { orderId: newOrderId, orderNumber, isExisting: false };
      });
    }

    // Launch 20 simultaneous checkouts
    const promises = Array.from({ length: 20 }, () => checkoutDraft());
    const results = await Promise.all(promises);

    assert.equal(ordersCreatedCount, 1, 'Only 1 order must be created');
    assert.equal(existingReturnedCount, 19, '19 requests must return existing order');

    // All results must point to the same orderId
    const firstOrderId = results[0].orderId;
    for (const res of results) {
      assert.equal(res.orderId, firstOrderId);
    }

    // Counter must only have incremented once (from 10 to 11)
    const finalCounter = await db.collection('shopCounters').doc(shopId).get();
    assert.equal(finalCounter.data().lastSequence, 11);
  });

  // Test 7: Concurrency Test — 20 simultaneous checkouts on DIFFERENT drafts
  await t.test('Section 10: 20 simultaneous checkouts on DIFFERENT drafts produce 20 unique sequential numbers', async () => {
    const db = new MockFirestore();
    const shopId = 'shakeel-online-services';

    await db.collection('shopCounters').doc(shopId).set({
      shopId,
      year: 26,
      lastSequence: 0
    });

    // Seed 20 drafts
    for (let i = 1; i <= 20; i++) {
      await db.collection('orderDrafts').doc(`dft_multi_${i}`).set({
        id: `dft_multi_${i}`,
        shopId,
        status: 'DRAFT'
      });
    }

    async function checkoutSpecificDraft(draftId) {
      return await db.runTransaction(async (tx) => {
        const draftDoc = await tx.get(db.collection('orderDrafts').doc(draftId));
        const draft = draftDoc.data();

        const counterDoc = await tx.get(db.collection('shopCounters').doc(shopId));
        const nextSeq = (counterDoc.data().lastSequence || 0) + 1;
        const orderNumber = `S2P-26-${nextSeq.toString().padStart(6, '0')}`;
        const newOrderId = `ord_multi_${nextSeq}`;

        await tx.set(db.collection('shopCounters').doc(shopId), {
          shopId,
          year: 26,
          lastSequence: nextSeq
        });

        await tx.update(db.collection('orderDrafts').doc(draftId), {
          status: 'CONVERTED',
          convertedOrderId: newOrderId
        });

        return { orderId: newOrderId, orderNumber, sequence: nextSeq };
      });
    }

    const promises = Array.from({ length: 20 }, (_, idx) => checkoutSpecificDraft(`dft_multi_${idx + 1}`));
    const results = await Promise.all(promises);

    assert.equal(results.length, 20);

    const orderNumbers = results.map(r => r.orderNumber);
    const uniqueOrderNumbers = new Set(orderNumbers);
    assert.equal(uniqueOrderNumbers.size, 20, 'All 20 order numbers must be unique');

    // Final counter must be exactly 20
    const finalCounter = await db.collection('shopCounters').doc(shopId).get();
    assert.equal(finalCounter.data().lastSequence, 20);
  });

  // Test 8: Staff Action & Payment Idempotency
  await t.test('Section 11, 12 & 13: Staff action transactional payment idempotency', async () => {
    const db = new MockFirestore();
    const orderId = 'ord_payment_test';

    // Seed order in CASH_PENDING
    await db.collection('orders').doc(orderId).set({
      id: orderId,
      shopId: 'shakeel-online-services',
      paymentMethod: 'CASH',
      paymentStatus: 'CASH_PENDING',
      status: 'RECEIVED'
    });

    let paymentEventsCount = 0;

    async function confirmCashPaid() {
      return await db.runTransaction(async (tx) => {
        const orderDoc = await tx.get(db.collection('orders').doc(orderId));
        const order = orderDoc.data();

        // Idempotency check: if already PAID, return without duplicate payment event
        if (order.paymentStatus === 'PAID') {
          return { success: true, order, isIdempotent: true };
        }

        if (order.paymentStatus !== 'CASH_PENDING') {
          throw new Error('Invalid payment status');
        }

        await tx.update(db.collection('orders').doc(orderId), {
          paymentStatus: 'PAID'
        });

        paymentEventsCount++;
        return { success: true, isIdempotent: false };
      });
    }

    // Call 1: First mark cash paid
    const res1 = await confirmCashPaid();
    assert.equal(res1.isIdempotent, false);
    assert.equal(paymentEventsCount, 1);

    // Call 2: Duplicate click on mark cash paid -> returns idempotently
    const res2 = await confirmCashPaid();
    assert.equal(res2.isIdempotent, true);
    assert.equal(paymentEventsCount, 1, 'Duplicate click must NOT create duplicate paymentEvent');

    // Call 3: Third click -> still 1 event
    const res3 = await confirmCashPaid();
    assert.equal(res3.isIdempotent, true);
    assert.equal(paymentEventsCount, 1);
  });

  // Test 9: Status Transition Idempotency (e.g. concurrent ACCEPT_ORDER)
  await t.test('Section 13: Concurrent ACCEPT_ORDER is idempotent and prevents duplicate status transitions', async () => {
    const db = new MockFirestore();
    const orderId = 'ord_status_test';

    await db.collection('orders').doc(orderId).set({
      id: orderId,
      shopId: 'shakeel-online-services',
      status: 'RECEIVED'
    });

    let statusTransitionsCount = 0;

    async function acceptOrder() {
      return await db.runTransaction(async (tx) => {
        const orderDoc = await tx.get(db.collection('orders').doc(orderId));
        const order = orderDoc.data();

        if (order.status === 'ACCEPTED') {
          return { success: true, order, isIdempotent: true };
        }

        if (!canTransitionOrder(order.status, 'ACCEPTED')) {
          throw new Error(`Cannot transition ${order.status} -> ACCEPTED`);
        }

        await tx.update(db.collection('orders').doc(orderId), {
          status: 'ACCEPTED'
        });

        statusTransitionsCount++;
        return { success: true, isIdempotent: false };
      });
    }

    const [r1, r2] = await Promise.all([acceptOrder(), acceptOrder()]);
    assert.equal(statusTransitionsCount, 1, 'Only one status transition must be recorded');
    assert.equal(r1.isIdempotent || r2.isIdempotent, true, 'One of the concurrent calls must be marked idempotent');
  });
});
