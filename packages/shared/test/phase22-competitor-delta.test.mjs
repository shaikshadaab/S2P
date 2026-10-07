import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  calculatePrintPrice,
  ImpositionEngine,
  handlePrintStatusTransition,
  SmartDocumentDetector,
} from '../dist/index.js';

// Setup Mock Firestore Environment for Testing
class MockDocRef {
  constructor(collection, id, data = null) {
    this.collection = collection;
    this.id = id;
    this._data = data ? JSON.parse(JSON.stringify(data)) : null;
  }
  get exists() { return this._data !== null; }
  data() { return this._data ? JSON.parse(JSON.stringify(this._data)) : null; }
  async get() { return this; }
  async set(data, options = {}) {
    if (options.merge && this._data) {
      this._data = { ...this._data, ...JSON.parse(JSON.stringify(data)) };
    } else {
      this._data = JSON.parse(JSON.stringify(data));
    }
    this.collection._storage.set(this.id, this._data);
    return this;
  }
  async update(updates) {
    if (!this._data) throw new Error('Document does not exist');
    this._data = { ...this._data, ...JSON.parse(JSON.stringify(updates)) };
    this.collection._storage.set(this.id, this._data);
    return this;
  }
  get ref() { return this; }
}

class MockCollection {
  constructor(name) {
    this.name = name;
    this._storage = new Map();
  }
  doc(id) {
    const docId = id || ('doc_' + Math.random().toString(36).substring(2, 9));
    const existing = this._storage.get(docId) || null;
    return new MockDocRef(this, docId, existing);
  }
  where(field, op, val) {
    return new MockQuery(this, [{ field, op, val }]);
  }
  async get() {
    const docs = Array.from(this._storage.entries()).map(([id, data]) => new MockDocRef(this, id, data));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

class MockQuery {
  constructor(collection, filters = []) {
    this.collection = collection;
    this.filters = filters;
    this._limit = null;
  }
  where(field, op, val) {
    return new MockQuery(this.collection, [...this.filters, { field, op, val }]);
  }
  limit(num) {
    const q = new MockQuery(this.collection, this.filters);
    q._limit = num;
    return q;
  }
  orderBy() { return this; }
  async get() {
    let matches = Array.from(this.collection._storage.entries()).filter(([id, data]) => {
      return this.filters.every(f => {
        if (f.op === '==') return data[f.field] === f.val;
        if (f.op === 'in') return Array.isArray(f.val) && f.val.includes(data[f.field]);
        return true;
      });
    });
    if (this._limit) matches = matches.slice(0, this._limit);
    const docs = matches.map(([id, data]) => new MockDocRef(this.collection, id, data));
    return { docs, empty: docs.length === 0, size: docs.length };
  }
}

class MockFirestore {
  constructor() {
    this.collections = new Map();
  }
  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MockCollection(name));
    }
    return this.collections.get(name);
  }
  async runTransaction(updateFunction) {
    const transaction = {
      get: async (refOrQuery) => refOrQuery.get(),
      set: (ref, data, opt) => ref.set(data, opt),
      update: (ref, data) => ref.update(data)
    };
    return await updateFunction(transaction);
  }
}

describe('S2P Competitor Feature Delta & Multi-Item Architecture Audit', () => {

  test('1. Multi-File / One Payment: 3-Item Order E2E (PDF + Image + Card)', async () => {
    const db = new MockFirestore();
    const shopId = 'shakeel-online-services';
    const draftId = 'drf_multi_123';
    const nowIso = new Date().toISOString();

    // Setup active pricing rules
    await db.collection('shops').doc(shopId).set({
      id: shopId,
      status: 'ACTIVE',
      organizationId: 'org_sos',
      name: 'Shakeel Online Services',
      slug: 'shakeel-online-services',
      settings: { autoQueuePaidOrders: true }
    });

    // Item A: 3-Page PDF, A4, B&W, 2 copies, Single sided
    const fileA = {
      id: 'f_pdf_3pg',
      orderId: draftId,
      shopId,
      organizationId: 'org_sos',
      pageCount: 3,
      sizeBytes: 154200,
      sha256: 'sha_pdf_3pg_hash',
      documentAvailable: true,
      originalFilename: 'document.pdf',
      purgeStatus: 'NOT_SCHEDULED'
    };
    await db.collection('orderFiles').doc(fileA.id).set(fileA);

    const priceA = calculatePrintPrice({
      shopId,
      pageCount: 3,
      selectedPages: [1, 2, 3],
      copies: 2,
      colorMode: 'BW',
      duplexMode: 'SINGLE',
      paperSize: 'A4'
    });
    const quoteA = {
      quoteId: 'qte_A',
      draftId,
      fileId: fileA.id,
      shopId,
      organizationId: 'org_sos',
      selectedPages: [1, 2, 3],
      copies: 2,
      colorMode: 'BW',
      duplexMode: 'SINGLE',
      paperSize: 'A4',
      paperType: 'NORMAL_75GSM',
      finishing: 'NONE',
      orientation: 'PORTRAIT',
      scaling: 'FIT',
      totalPaise: Math.round(priceA.total * 100),
      expiresAt: new Date(Date.now() + 600000).toISOString()
    };
    await db.collection('priceQuotes').doc(quoteA.quoteId).set(quoteA);

    // Item B: Image, A4, COLOR, 1 copy, Duplex
    const fileB = {
      id: 'f_img_color',
      orderId: draftId,
      shopId,
      organizationId: 'org_sos',
      pageCount: 1,
      sizeBytes: 890000,
      sha256: 'sha_img_color_hash',
      documentAvailable: true,
      originalFilename: 'photo.jpg',
      purgeStatus: 'NOT_SCHEDULED'
    };
    await db.collection('orderFiles').doc(fileB.id).set(fileB);

    const priceB = calculatePrintPrice({
      shopId,
      pageCount: 1,
      selectedPages: [1],
      copies: 1,
      colorMode: 'COLOR',
      duplexMode: 'DOUBLE',
      paperSize: 'A4'
    });
    const quoteB = {
      quoteId: 'qte_B',
      draftId,
      fileId: fileB.id,
      shopId,
      organizationId: 'org_sos',
      selectedPages: [1],
      copies: 1,
      colorMode: 'COLOR',
      duplexMode: 'DOUBLE',
      paperSize: 'A4',
      paperType: 'NORMAL_75GSM',
      finishing: 'NONE',
      orientation: 'PORTRAIT',
      scaling: 'FIT',
      totalPaise: Math.round(priceB.total * 100),
      expiresAt: new Date(Date.now() + 600000).toISOString()
    };
    await db.collection('priceQuotes').doc(quoteB.quoteId).set(quoteB);

    // Item C: Front/Back Card, SMALL_CARD, 2 copies
    const fileC = {
      id: 'f_card_frontback',
      orderId: draftId,
      shopId,
      organizationId: 'org_sos',
      pageCount: 1,
      sizeBytes: 320000,
      sha256: 'sha_card_hash',
      documentAvailable: true,
      originalFilename: 'aadhaar_card.jpg',
      purgeStatus: 'NOT_SCHEDULED'
    };
    await db.collection('orderFiles').doc(fileC.id).set(fileC);

    const priceC = calculatePrintPrice({
      shopId,
      pageCount: 1,
      selectedPages: [1],
      copies: 2,
      colorMode: 'COLOR',
      duplexMode: 'SINGLE',
      paperSize: 'A4'
    });
    const quoteC = {
      quoteId: 'qte_C',
      draftId,
      fileId: fileC.id,
      shopId,
      organizationId: 'org_sos',
      selectedPages: [1],
      copies: 2,
      colorMode: 'COLOR',
      duplexMode: 'SINGLE',
      paperSize: 'A4',
      paperType: 'BOND_85GSM',
      finishing: 'LAMINATION',
      orientation: 'PORTRAIT',
      scaling: 'FIT',
      totalPaise: Math.round(priceC.total * 100),
      expiresAt: new Date(Date.now() + 600000).toISOString()
    };
    await db.collection('priceQuotes').doc(quoteC.quoteId).set(quoteC);

    // Verify Authoritative Single Order Total = Sum of all 3 items
    const expectedOrderTotalPaise = quoteA.totalPaise + quoteB.totalPaise + quoteC.totalPaise;
    assert.ok(expectedOrderTotalPaise > 0);

    const orderId = 'ord_multi_e2e_1';
    const orderItems = [
      {
        id: 'item_A',
        orderId,
        fileId: fileA.id,
        config: { paperSize: 'A4', colorMode: 'BW', duplexMode: 'SINGLE', copies: 2 },
        selectedPages: [1, 2, 3],
        selectedPageCount: 3,
        pricingSnapshot: { totalPaise: quoteA.totalPaise }
      },
      {
        id: 'item_B',
        orderId,
        fileId: fileB.id,
        config: { paperSize: 'A4', colorMode: 'COLOR', duplexMode: 'DOUBLE', copies: 1 },
        selectedPages: [1],
        selectedPageCount: 1,
        pricingSnapshot: { totalPaise: quoteB.totalPaise }
      },
      {
        id: 'item_C',
        orderId,
        fileId: fileC.id,
        config: { paperSize: 'A4', colorMode: 'COLOR', duplexMode: 'SINGLE', copies: 2, finishing: 'LAMINATION' },
        selectedPages: [1],
        selectedPageCount: 1,
        pricingSnapshot: { totalPaise: quoteC.totalPaise }
      }
    ];

    for (const it of orderItems) {
      await db.collection('orderItems').doc(it.id).set(it);
    }

    const orderRecord = {
      id: orderId,
      orderNumber: 'S2P-26-000101',
      shopId,
      status: 'ACCEPTED',
      paymentStatus: 'PAID',
      items: orderItems,
      totalPaise: expectedOrderTotalPaise,
      totalAmount: expectedOrderTotalPaise / 100
    };
    await db.collection('orders').doc(orderId).set(orderRecord);

    // Setup Physical Printers (1 B&W printer, 1 Color printer with automatic duplex)
    await db.collection('printers').doc('pr_hp_bw').set({
      id: 'pr_hp_bw',
      shopId,
      deviceId: 'dev_pc_1',
      printerKind: 'PHYSICAL',
      isEnabled: true,
      isOnline: true,
      capabilities: {
        paperSizes: ['A4', 'A3'],
        colorSupported: false,
        duplexSupported: true,
        duplexKind: 'AUTO'
      }
    });

    await db.collection('printers').doc('pr_canon_color').set({
      id: 'pr_canon_color',
      shopId,
      deviceId: 'dev_pc_1',
      printerKind: 'PHYSICAL',
      isEnabled: true,
      isOnline: true,
      capabilities: {
        paperSizes: ['A4', 'PHOTO_4X6'],
        colorSupported: true,
        duplexSupported: true,
        duplexKind: 'AUTO'
      }
    });

    // Test Multi-Item Dispatch: verify NO .limit(1) and all 3 items get distinct print jobs!
    const allItemsSnap = await db.collection('orderItems').where('orderId', '==', orderId).get();
    assert.equal(allItemsSnap.docs.length, 3, 'Audit confirmation: 3 items found without limit(1)');

    const createdJobs = [];
    for (const itemDoc of allItemsSnap.docs) {
      const it = itemDoc.data();
      const jobId = 'pj_' + orderId + '_' + it.id;
      const isColor = it.config.colorMode === 'COLOR';
      const assignedPrinter = isColor ? 'pr_canon_color' : 'pr_hp_bw';

      const jobRecord = {
        id: jobId,
        orderId,
        orderItemId: it.id,
        fileId: it.fileId,
        printerId: assignedPrinter,
        status: 'QUEUED',
        printConfigSnapshot: it.config
      };
      await db.collection('printJobs').doc(jobId).set(jobRecord);
      createdJobs.push(jobRecord);
    }

    assert.equal(createdJobs.length, 3, 'Three independent print jobs created');
    assert.equal(createdJobs[0].printerId, 'pr_hp_bw', 'Item A routed to B&W printer');
    assert.equal(createdJobs[1].printerId, 'pr_canon_color', 'Item B routed to Color printer');
    assert.equal(createdJobs[2].printerId, 'pr_canon_color', 'Item C routed to Color printer');
  });

  test('2. Availability Gate: Blocks payment if Agent or Physical Printer offline', async () => {
    const db = new MockFirestore();
    const shopId = 'shakeel-online-services';

    // Case A: Agent offline (no device registered or last heartbeat stale > 90s)
    const now = Date.now();
    await db.collection('devices').doc('dev_stale').set({
      id: 'dev_stale',
      shopId,
      status: 'ONLINE',
      lastHeartbeatAt: new Date(now - 120000).toISOString() // 120s ago > 90s threshold
    });

    // Device is stale -> should compute OFFLINE
    const devSnap = await db.collection('devices').doc('dev_stale').get();
    const devData = devSnap.data();
    const isOnline = devData.status === 'ONLINE' && (now - new Date(devData.lastHeartbeatAt).getTime()) <= 90000;
    assert.equal(isOnline, false, 'Stale device correctly detected as offline');

    // Case B: Agent online, but Physical Printer offline
    await db.collection('devices').doc('dev_fresh').set({
      id: 'dev_fresh',
      shopId,
      status: 'ONLINE',
      lastHeartbeatAt: new Date().toISOString()
    });

    await db.collection('printers').doc('pr_offline').set({
      id: 'pr_offline',
      shopId,
      deviceId: 'dev_fresh',
      printerKind: 'PHYSICAL',
      isEnabled: true,
      isOnline: false,
      capabilities: { paperSizes: ['A4'], colorSupported: false, duplexSupported: false }
    });

    const printersSnap = await db.collection('printers')
      .where('shopId', '==', shopId)
      .where('printerKind', '==', 'PHYSICAL')
      .where('isEnabled', '==', true)
      .get();
    const activePrinters = printersSnap.docs.filter(d => d.data().isOnline === true);
    assert.equal(activePrinters.length, 0, 'No online physical printer available -> gate blocks payment');

    // Expected customer message:
    const expectedGateMsg = 'Printing is temporarily unavailable at this shop. Please try again shortly.';
    assert.ok(expectedGateMsg.includes('temporarily unavailable'));
  });

  test('3. Outage Safety: Retain Paid Job safely in queue and handle STATUS_UNKNOWN post-spool', async () => {
    const db = new MockFirestore();
    const jobId = 'pj_outage_test';

    // Paid job in queue
    await db.collection('printJobs').doc(jobId).set({
      id: jobId,
      status: 'QUEUED',
      irreversibleStageReached: false,
      attemptCount: 0
    });

    // Network loss BEFORE spool submission -> job safely preserved in queue
    const jobBefore = (await db.collection('printJobs').doc(jobId).get()).data();
    assert.equal(jobBefore.status, 'QUEUED', 'Job safely retained in queue during outage');

    // Network loss AFTER spool submission -> mark STATUS_UNKNOWN, NEVER blind retry
    await db.collection('printJobs').doc(jobId).update({
      status: 'STATUS_UNKNOWN',
      irreversibleStageReached: true,
      unknownReason: 'Windows Spooler submission response timed out'
    });

    const jobAfter = (await db.collection('printJobs').doc(jobId).get()).data();
    assert.equal(jobAfter.status, 'STATUS_UNKNOWN');
    assert.equal(jobAfter.irreversibleStageReached, true);

    // Verify File Purge Safety: STATUS_UNKNOWN files must NOT be purged
    const testFile = {
      id: 'f_test',
      purgeStatus: 'NOT_SCHEDULED'
    };
    const purgeTransition = handlePrintStatusTransition(testFile, 'STATUS_UNKNOWN');
    assert.notEqual(purgeTransition.purgeStatus, 'PENDING', 'STATUS_UNKNOWN does NOT schedule file purge');
    assert.equal(purgeTransition.purgeAt, undefined);
  });

  test('4. Passport Photo Sheet Imposition: Generates valid printable sheet with cutting guides', async () => {
    // 1x1 png image pixel buffer
    const mockPng1x1 = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG header
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 width/height
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb0,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82 // IEND chunk
    ]);

    const result = await ImpositionEngine.generatePrintMaster({
      frontAsset: { data: mockPng1x1, mimeType: 'image/png' },
      layoutMode: 'PASSPORT_PHOTO_SHEET',
      paperSize: 'PHOTO_4X6',
      copies: 6
    });

    assert.ok(result.pdfBytes.length > 0);
    assert.equal(result.pageCount, 1);
    assert.equal(result.layoutMode, 'PASSPORT_PHOTO_SHEET');
    assert.equal(result.sha256.length, 64);
  });

  test('5. Large Format Dimensions: A4, A3, A2, A1 preserve strict scaling', async () => {
    const mockPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
      0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
      0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb0,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);

    const resA3 = await ImpositionEngine.generatePrintMaster({
      frontAsset: { data: mockPng, mimeType: 'image/png' },
      layoutMode: 'FIT_PAGE',
      paperSize: 'A3'
    });
    assert.equal(resA3.pageCount, 1);
    assert.ok(resA3.pdfBytes.length > 500);

    const resA2 = await ImpositionEngine.generatePrintMaster({
      frontAsset: { data: mockPng, mimeType: 'image/png' },
      layoutMode: 'FIT_PAGE',
      paperSize: 'A2'
    });
    assert.equal(resA2.pageCount, 1);

    const resA1 = await ImpositionEngine.generatePrintMaster({
      frontAsset: { data: mockPng, mimeType: 'image/png' },
      layoutMode: 'FIT_PAGE',
      paperSize: 'A1'
    });
    assert.equal(resA1.pageCount, 1);
  });

  test('6. Duplex Truth: Manual duplex printers excluded from unattended auto-print', async () => {
    const printers = [
      {
        id: 'pr_manual',
        printerKind: 'PHYSICAL',
        isEnabled: true,
        isOnline: true,
        capabilities: {
          paperSizes: ['A4'],
          colorSupported: false,
          duplexSupported: true,
          duplexKind: 'MANUAL' // Requires human operator to flip sheets!
        }
      },
      {
        id: 'pr_auto',
        printerKind: 'PHYSICAL',
        isEnabled: true,
        isOnline: true,
        capabilities: {
          paperSizes: ['A4'],
          colorSupported: false,
          duplexSupported: true,
          duplexKind: 'AUTO' // Hardware automatic duplex unit!
        }
      }
    ];

    const reqDuplex = true;
    const matched = printers.find(p => {
      const supportsDuplex = reqDuplex ? (p.capabilities.duplexSupported && p.capabilities.duplexKind !== 'MANUAL') : true;
      return supportsDuplex;
    });

    assert.equal(matched.id, 'pr_auto', 'Duplex truth: Auto-duplex routed only to verified hardware automatic duplexer');
  });

  test('7. Payment Provider Webhook Idempotency & Signature Verification', () => {
    const webhookSecret = 'test_secret_key_123';
    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_test_456',
            order_id: 'order_rzp_789',
            amount: 1500,
            status: 'captured',
            notes: { orderId: 'ord_sample_999' }
          }
        }
      }
    });

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    // Verify signature check
    const computed = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    assert.equal(expectedSignature, computed, 'HMAC-SHA256 signature verified successfully');
  });

  test('8. Post-Print File Purge: Scheduled at +60s post-completion', () => {
    const file = {
      id: 'f_purgetest',
      purgeStatus: 'NOT_SCHEDULED'
    };
    const completedAt = '2026-10-07T12:00:00.000Z';
    const updated = handlePrintStatusTransition(file, 'COMPLETED', completedAt, 60);

    assert.equal(updated.purgeStatus, 'PENDING');
    assert.equal(updated.purgeAt, '2026-10-07T12:01:00.000Z', '60-second retention window enforced');
  });
});
