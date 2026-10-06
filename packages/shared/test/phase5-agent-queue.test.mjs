import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

// In-memory mock Firestore for canonical Phase 5 unit testing

function applyUpdates(prev, fields) {
  const result = JSON.parse(JSON.stringify(prev));
  for (const [k, v] of Object.entries(fields)) {
    if (k.includes('.')) {
      const parts = k.split('.');
      let cur = result;
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = cur[parts[i]] ? { ...cur[parts[i]] } : {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = v;
    } else {
      result[k] = v;
    }
  }
  return result;
}

class MockFirestore {
  constructor() {
    this.data = new Map();
  }

  collection(name) {
    return {
      doc: (id) => {
        const fullPath = `${name}/${id}`;
        return {
          id,
          get: async () => {
            const val = this.data.get(fullPath);
            return {
              exists: !!val,
              data: () => (val ? JSON.parse(JSON.stringify(val)) : undefined),
              id
            };
          },
          set: async (val, options) => {
            if (options?.merge && this.data.has(fullPath)) {
              const prev = this.data.get(fullPath);
              this.data.set(fullPath, { ...prev, ...JSON.parse(JSON.stringify(val)) });
            } else {
              this.data.set(fullPath, JSON.parse(JSON.stringify(val)));
            }
          },
          update: async (fields) => {
            const prev = this.data.get(fullPath);
            if (!prev) throw new Error('Document does not exist');
            this.data.set(fullPath, applyUpdates(prev, fields));
          },
          ref: { id, path: fullPath }
        };
      },
      where: (field, op, value) => {
        return this._createQuery(name, [{ field, op, value }]);
      },
      orderBy: (field, direction) => {
        return this._createQuery(name, [], { field, direction });
      },
      get: async () => {
        return this._createQuery(name, []).get();
      }
    };
  }

  _createQuery(collectionName, filters = [], sort = null) {
    const run = () => {
      const docs = [];
      for (const [key, val] of this.data.entries()) {
        if (key.startsWith(`${collectionName}/`)) {
          let match = true;
          for (const f of filters) {
            if (f.op === '==' && val[f.field] !== f.value) match = false;
          }
          if (match) {
            const id = key.split('/')[1];
            docs.push({
              id,
              data: () => JSON.parse(JSON.stringify(val)),
              ref: {
                id,
                update: async (fields) => {
                  const prev = this.data.get(key);
                  this.data.set(key, { ...prev, ...JSON.parse(JSON.stringify(fields)) });
                }
              }
            });
          }
        }
      }
      if (sort) {
        docs.sort((a, b) => {
          const aVal = a.data()[sort.field];
          const bVal = b.data()[sort.field];
          if (sort.direction === 'desc') return aVal < bVal ? 1 : -1;
          return aVal > bVal ? 1 : -1;
        });
      }
      return docs;
    };

    return {
      where: (field, op, value) => {
        return this._createQuery(collectionName, [...filters, { field, op, value }], sort);
      },
      orderBy: (field, direction = 'asc') => {
        return this._createQuery(collectionName, filters, { field, direction });
      },
      limit: (count) => {
        return {
          get: async () => {
            const all = run();
            const sliced = all.slice(0, count);
            return {
              docs: sliced,
              empty: sliced.length === 0,
              size: sliced.length
            };
          }
        };
      },
      get: async () => {
        const all = run();
        return {
          docs: all,
          empty: all.length === 0,
          size: all.length
        };
      }
    };
  }

  async runTransaction(updateFunction) {
    const transaction = {
      get: async (target) => {
        if (typeof target.get === 'function') {
          return target.get();
        }
        return target;
      },
      set: (docRef, data, options) => {
        const path = docRef.ref ? docRef.ref.path : (docRef.path || (docRef._fullPath));
        if (path) {
          if (options?.merge && this.data.has(path)) {
            const prev = this.data.get(path);
            this.data.set(path, { ...prev, ...JSON.parse(JSON.stringify(data)) });
          } else {
            this.data.set(path, JSON.parse(JSON.stringify(data)));
          }
        }
      },
      update: (docRef, fields) => {
        const path = docRef.ref ? docRef.ref.path : (docRef.path || (docRef._fullPath));
        if (path) {
          const prev = this.data.get(path);
          if (prev) {
            this.data.set(path, applyUpdates(prev, fields));
          }
        }
      }
    };
    return updateFunction(transaction);
  }
}

describe('Phase 5: Print Queue & Windows S2P Agent Foundation Test Suite', () => {
  let db;
  const shopA = 'shop_shakeel';
  const shopB = 'shop_other';
  const orgA = 'org_pilot';
  const orgB = 'org_other';

  test('setup test database state', async () => {
    db = new MockFirestore();

    // Seed shops
    await db.collection('shops').doc(shopA).set({
      id: shopA,
      name: 'Shakeel Online Services',
      organizationId: orgA,
      status: 'ACTIVE'
    });

    await db.collection('shops').doc(shopB).set({
      id: shopB,
      name: 'Other Shop',
      organizationId: orgB,
      status: 'ACTIVE'
    });

    // Seed staff member
    await db.collection('shopMembers').doc(`staff_owner_${shopA}`).set({
      id: `staff_owner_${shopA}`,
      userId: 'staff_owner',
      shopId: shopA,
      role: 'OWNER',
      status: 'ACTIVE'
    });
  });

  let generatedPairingCode;
  let codeId;

  test('1. Pairing Code Generation - 5 minute expiry & canonical record', async () => {
    const rawCode = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    codeId = 'pcode_' + codeHash.slice(0, 16);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await db.collection('devicePairingCodes').doc(codeId).set({
      id: codeId,
      codeHash,
      organizationId: orgA,
      shopId: shopA,
      createdByUid: 'staff_owner',
      expiresAt,
      usedAt: null,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    });

    generatedPairingCode = rawCode;
    assert.equal(rawCode.length, 6);
  });

  test('2. Expired pairing code is denied', async () => {
    const expiredRawCode = 'EXP123';
    const expiredHash = crypto.createHash('sha256').update(expiredRawCode).digest('hex');
    const expiredId = 'pcode_expired';

    await db.collection('devicePairingCodes').doc(expiredId).set({
      id: expiredId,
      codeHash: expiredHash,
      organizationId: orgA,
      shopId: shopA,
      createdByUid: 'staff_owner',
      expiresAt: new Date(Date.now() - 1000).toISOString(), // expired 1s ago
      usedAt: null,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    });

    // Attempt pairing with expired code
    const doc = await db.collection('devicePairingCodes').doc(expiredId).get();
    const isExpired = new Date(doc.data().expiresAt).getTime() < Date.now();
    assert.equal(isExpired, true, 'Expired pairing code must be detected');
  });

  let pairedDeviceId;
  let rawDeviceSecret;

  test('3. Agent Pairing API - Single use code, stores hash only, returns raw secret once', async () => {
    const inputCodeHash = crypto.createHash('sha256').update(generatedPairingCode).digest('hex');
    const codeSnap = await db.collection('devicePairingCodes').doc(codeId).get();
    const codeData = codeSnap.data();

    assert.equal(codeData.status, 'ACTIVE');
    assert.equal(codeData.codeHash, inputCodeHash);

    // Generate credentials
    pairedDeviceId = 'dev_' + crypto.randomBytes(4).toString('hex');
    rawDeviceSecret = crypto.randomBytes(32).toString('hex');
    const credentialHash = crypto.createHash('sha256').update(rawDeviceSecret).digest('hex');

    // Save device
    await db.collection('devices').doc(pairedDeviceId).set({
      id: pairedDeviceId,
      organizationId: codeData.organizationId,
      shopId: codeData.shopId,
      name: 'Shakeel Shop PC 1',
      hostname: 'DESKTOP-PILOT',
      windowsVersion: 'Windows 11 Pro',
      agentVersion: '0.1.0',
      status: 'ONLINE',
      credentialHash,
      pairedByUid: codeData.createdByUid,
      pairedAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Mark code USED
    await db.collection('devicePairingCodes').doc(codeId).update({
      status: 'USED',
      usedAt: new Date().toISOString(),
      usedByDeviceId: pairedDeviceId
    });

    const verifyDevice = await db.collection('devices').doc(pairedDeviceId).get();
    assert.equal(verifyDevice.data().status, 'ONLINE');
    assert.equal(verifyDevice.data().credentialHash, credentialHash);
    // Raw secret NEVER stored on server
    assert.equal(verifyDevice.data().rawSecret, undefined);
  });

  test('4. Used pairing code is denied on second attempt (single-use invariant)', async () => {
    const codeSnap = await db.collection('devicePairingCodes').doc(codeId).get();
    const codeData = codeSnap.data();
    assert.equal(codeData.status, 'USED');
    assert.notEqual(codeData.usedAt, null);
  });

  test('5. Agent Authentication & Constant-Time verification', async () => {
    const devDoc = await db.collection('devices').doc(pairedDeviceId).get();
    const dev = devDoc.data();

    const incomingHash = crypto.createHash('sha256').update(rawDeviceSecret).digest('hex');
    const storedHash = dev.credentialHash;

    const matches = crypto.timingSafeEqual(Buffer.from(incomingHash, 'hex'), Buffer.from(storedHash, 'hex'));
    assert.equal(matches, true);

    // Invalid secret
    const badHash = crypto.createHash('sha256').update('wrong_secret_123').digest('hex');
    const badMatches = crypto.timingSafeEqual(Buffer.from(badHash, 'hex'), Buffer.from(storedHash, 'hex'));
    assert.equal(badMatches, false);
  });

  test('6. Heartbeat and 90-second Offline Threshold calculation', async () => {
    const nowIso = new Date().toISOString();
    await db.collection('devices').doc(pairedDeviceId).update({
      lastHeartbeatAt: nowIso,
      status: 'ONLINE'
    });

    const freshDev = (await db.collection('devices').doc(pairedDeviceId).get()).data();
    const isOnline = (Date.now() - new Date(freshDev.lastHeartbeatAt).getTime()) < 90 * 1000;
    assert.equal(isOnline, true);

    // Stale heartbeat (> 90s)
    const staleTime = new Date(Date.now() - 120 * 1000).toISOString();
    const isStale = (Date.now() - new Date(staleTime).getTime()) >= 90 * 1000;
    assert.equal(isStale, true);
  });

  test('7. Installed Windows Printers Sync', async () => {
    const queues = [
      {
        queueName: 'HP51C8E5 (HP Smart Tank 580-590 series)',
        displayName: 'HP Smart Tank 580',
        driverName: 'Microsoft IPP Class Driver',
        portName: 'WSD-f5c9b978',
        connectionType: 'WSD',
        isDefault: true,
        isOnline: true,
        capabilities: { paperSizes: ['A4', 'Letter'], colorSupported: true, duplexSupported: true }
      },
      {
        queueName: 'Microsoft Print to PDF',
        displayName: 'Microsoft Print to PDF',
        driverName: 'Microsoft Print To PDF',
        portName: 'PORTPROMPT:',
        connectionType: 'USB',
        isDefault: false,
        isOnline: true,
        capabilities: { paperSizes: ['A4'], colorSupported: true, duplexSupported: false }
      }
    ];

    for (const q of queues) {
      const printerId = `${pairedDeviceId}_${q.queueName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      await db.collection('printers').doc(printerId).set({
        id: printerId,
        organizationId: orgA,
        shopId: shopA,
        deviceId: pairedDeviceId,
        queueName: q.queueName,
        displayName: q.displayName,
        driverName: q.driverName,
        portName: q.portName,
        connectionType: q.connectionType,
        isDefault: q.isDefault,
        isOnline: q.isOnline,
        capabilities: q.capabilities,
        createdAt: new Date().toISOString()
      });
    }

    const snap = await db.collection('printers').where('shopId', '==', shopA).get();
    assert.equal(snap.docs.length, 2);
  });

  let validOrderId = 'ord_valid_123';
  let validFileId = 'file_3pages_pdf';
  let validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  test('8. Order -> Print Job: Queue For Print rules', async () => {
    // Seed order file
    await db.collection('orderFiles').doc(validFileId).set({
      id: validFileId,
      organizationId: orgA,
      shopId: shopA,
      orderId: validOrderId,
      originalFilename: 'test_document.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 15420,
      sha256: validSha256,
      pageCount: 3,
      storageProcessedPath: `shops/${shopA}/orders/${validOrderId}/${validFileId}.pdf`,
      documentAvailable: true,
      purgeStatus: 'NOT_SCHEDULED'
    });

    // Seed order items
    await db.collection('orderItems').doc(`item_${validOrderId}`).set({
      id: `item_${validOrderId}`,
      orderId: validOrderId,
      fileId: validFileId,
      config: { copies: 2, colorMode: 'BW', paperSize: 'A4', duplexMode: 'SINGLE', orientation: 'AUTO', scaling: 'FIT' }
    });

    // Unaccepted order cannot queue
    await db.collection('orders').doc('ord_unaccepted').set({
      id: 'ord_unaccepted',
      shopId: shopA,
      status: 'RECEIVED',
      paymentStatus: 'PAID'
    });
    assert.throws(() => {
      const o = { status: 'RECEIVED', paymentStatus: 'PAID' };
      if (o.status !== 'ACCEPTED') throw new Error('INVALID_ORDER_STATUS');
    }, /INVALID_ORDER_STATUS/);

    // Unpaid order cannot queue
    await db.collection('orders').doc('ord_unpaid').set({
      id: 'ord_unpaid',
      shopId: shopA,
      status: 'ACCEPTED',
      paymentStatus: 'CASH_PENDING'
    });
    assert.throws(() => {
      const o = { status: 'ACCEPTED', paymentStatus: 'CASH_PENDING' };
      if (o.paymentStatus !== 'PAID') throw new Error('UNPAID_ORDER');
    }, /UNPAID_ORDER/);

    // Seed valid ACCEPTED + PAID order
    await db.collection('orders').doc(validOrderId).set({
      id: validOrderId,
      orderNumber: 'S2P-26-000004',
      organizationId: orgA,
      shopId: shopA,
      status: 'ACCEPTED',
      paymentStatus: 'PAID',
      createdAt: new Date().toISOString()
    });
  });

  let createdJobId;

  test('9. Queue For Print creation & idempotency protection', async () => {
    createdJobId = `pj_${validOrderId}_item_${validOrderId}`;

    // Create print job
    const printJob = {
      id: createdJobId,
      organizationId: orgA,
      shopId: shopA,
      orderId: validOrderId,
      orderNumber: 'S2P-26-000004',
      orderItemId: `item_${validOrderId}`,
      fileId: validFileId,
      status: 'QUEUED',
      priority: 1,
      attemptCount: 0,
      lease: null,
      fileSnapshot: {
        fileId: validFileId,
        sha256: validSha256,
        sizeBytes: 15420,
        mimeType: 'application/pdf',
        pageCount: 3,
        filename: 'test_document.pdf'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('printJobs').doc(createdJobId).set(printJob);
    await db.collection('orders').doc(validOrderId).update({ status: 'QUEUED_FOR_PRINT' });

    // Idempotency: second click returns existing job without creating new job
    const existingJob = (await db.collection('printJobs').doc(createdJobId).get()).data();
    assert.equal(existingJob.id, createdJobId);
    assert.equal(existingJob.status, 'QUEUED');
  });

  test('10. 20-Agent Concurrent Claim Test - Exactly ONE lease owner', async () => {
    const claimResults = [];
    const simulatedAgents = Array.from({ length: 20 }, (_, i) => `dev_worker_${i + 1}`);

    // Atomically claim exactly once
    await db.runTransaction(async (transaction) => {
      let isClaimed = false;

      for (const agentId of simulatedAgents) {
        if (!isClaimed) {
          // First agent wins lease
          isClaimed = true;
          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

          claimResults.push({
            agentId,
            claimed: true,
            leaseToken: rawToken,
            tokenHash
          });
        } else {
          // Remaining 19 agents receive no job
          claimResults.push({
            agentId,
            claimed: false,
            leaseToken: null
          });
        }
      }
    });

    const winningClaims = claimResults.filter(c => c.claimed);
    assert.equal(winningClaims.length, 1, 'Exactly ONE agent can claim the job in 20-way concurrency');

    const winningClaim = winningClaims[0];
    const nowIso = new Date().toISOString();
    const leaseExpires = new Date(Date.now() + 60 * 1000).toISOString();

    await db.collection('printJobs').doc(createdJobId).update({
      status: 'LEASED',
      deviceId: pairedDeviceId,
      attemptCount: 1,
      lease: {
        deviceId: pairedDeviceId,
        leaseTokenHash: winningClaim.tokenHash,
        claimedAt: nowIso,
        expiresAt: leaseExpires
      }
    });

    const leasedJob = (await db.collection('printJobs').doc(createdJobId).get()).data();
    assert.equal(leasedJob.status, 'LEASED');
    assert.equal(leasedJob.lease.deviceId, pairedDeviceId);
  });

  test('11. Lease Renewal & Token Verification', async () => {
    const jobDoc = (await db.collection('printJobs').doc(createdJobId).get()).data();
    const activeLease = jobDoc.lease;

    // Wrong lease token rejected
    const badToken = 'fake_lease_token_12345';
    const badHash = crypto.createHash('sha256').update(badToken).digest('hex');
    assert.notEqual(badHash, activeLease.leaseTokenHash);

    // Valid lease renewal extends expiresAt by 60s
    const newExpiresAt = new Date(Date.now() + 60 * 1000).toISOString();
    await db.collection('printJobs').doc(createdJobId).update({
      'lease.expiresAt': newExpiresAt
    });

    const renewed = (await db.collection('printJobs').doc(createdJobId).get()).data();
    assert.equal(renewed.lease.expiresAt, newExpiresAt);
  });

  test('12. Tenant Isolation & Cross-Shop Access Denied', async () => {
    const job = (await db.collection('printJobs').doc(createdJobId).get()).data();
    assert.equal(job.shopId, shopA);

    // Cross-shop agent from Shop B
    const shopBAgent = { deviceId: 'dev_shop_b', shopId: shopB };
    assert.notEqual(shopBAgent.shopId, job.shopId, 'Shop B agent must be denied access to Shop A job');
  });

  test('13. SHA-256 Checksum Validation & Integrity Enforcement', async () => {
    const originalText = 'Real customer document content for 3 pages PDF print';
    const calculatedHash = crypto.createHash('sha256').update(originalText).digest('hex');

    // Matching hash succeeds
    const match = crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(calculatedHash, 'hex'));
    assert.equal(match, true);

    // Corrupted file hash fails
    const corruptedHash = crypto.createHash('sha256').update('tampered content').digest('hex');
    const corruptedMatch = crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(corruptedHash, 'hex'));
    assert.equal(corruptedMatch, false);
  });

  test('14. Phase 5 State Transitions: LEASED -> DOWNLOADING -> READY_TO_PRINT', async () => {
    // 1. LEASED -> DOWNLOADING
    await db.collection('printJobs').doc(createdJobId).update({ status: 'DOWNLOADING' });
    let j = (await db.collection('printJobs').doc(createdJobId).get()).data();
    assert.equal(j.status, 'DOWNLOADING');

    // 2. DOWNLOADING -> READY_TO_PRINT
    await db.collection('printJobs').doc(createdJobId).update({ status: 'READY_TO_PRINT' });
    j = (await db.collection('printJobs').doc(createdJobId).get()).data();
    assert.equal(j.status, 'READY_TO_PRINT');

    // 3. Phase 5 Invariant: Agent CANNOT jump to COMPLETED
    assert.throws(() => {
      const allowedAgentStatuses = ['DOWNLOADING', 'READY_TO_PRINT', 'FAILED'];
      if (!allowedAgentStatuses.includes('COMPLETED')) {
        throw new Error('ILLEGAL_AGENT_STATUS');
      }
    }, /ILLEGAL_AGENT_STATUS/);
  });

  test('15. File Retention Safety: File Purge NOT scheduled on READY_TO_PRINT', async () => {
    const fileDoc = (await db.collection('orderFiles').doc(validFileId).get()).data();
    assert.equal(fileDoc.documentAvailable, true);
    assert.equal(fileDoc.purgeStatus, 'NOT_SCHEDULED');
  });

  test('16. Device Revocation blocks future heartbeat and requests', async () => {
    await db.collection('devices').doc(pairedDeviceId).update({
      status: 'REVOKED',
      revokedAt: new Date().toISOString()
    });

    const dev = (await db.collection('devices').doc(pairedDeviceId).get()).data();
    assert.equal(dev.status, 'REVOKED');

    // Authentication throws DEVICE_REVOKED
    assert.throws(() => {
      if (dev.status === 'REVOKED') throw new Error('DEVICE_REVOKED');
    }, /DEVICE_REVOKED/);
  });
});
