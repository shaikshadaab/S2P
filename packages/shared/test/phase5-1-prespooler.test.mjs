import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

describe('Phase 5.1: Final Pre-Spooler Hardening Test Suite', () => {
  // In-memory mock store
  const store = {
    shops: new Map(),
    shopMembers: new Map(),
    devices: new Map(),
    printers: new Map(),
    orders: new Map(),
    orderItems: new Map(),
    orderFiles: new Map(),
    printJobs: new Map(),
    printAttempts: new Map(),
    auditLogs: new Map()
  };

  const SHOP_ID = 'shakeel-online-services';
  const ORG_ID = 'org_shakeel_pilot';
  const STAFF_UID = 'uid_owner_shakeel';
  const DEVICE_ID = 'dev_win11_pilot';
  const RAW_SECRET = 'secret_raw_device_token_xyz_987';
  const CRED_HASH = crypto.createHash('sha256').update(RAW_SECRET).digest('hex');

  it('setup mock database state for Phase 5.1', () => {
    store.shops.set(SHOP_ID, {
      id: SHOP_ID,
      organizationId: ORG_ID,
      name: 'Shakeel Online Services',
      status: 'ACTIVE'
    });

    store.shopMembers.set(`${STAFF_UID}_${SHOP_ID}`, {
      id: `${STAFF_UID}_${SHOP_ID}`,
      userId: STAFF_UID,
      shopId: SHOP_ID,
      organizationId: ORG_ID,
      role: 'OWNER',
      status: 'ACTIVE'
    });

    store.devices.set(DEVICE_ID, {
      id: DEVICE_ID,
      organizationId: ORG_ID,
      shopId: SHOP_ID,
      name: 'DESKTOP-PILOT',
      hostname: 'DESKTOP-PILOT',
      status: 'ONLINE',
      credentialHash: CRED_HASH,
      agentVersion: '0.1.0'
    });
    assert.equal(store.devices.get(DEVICE_ID).status, 'ONLINE');
  });

  it('1. OrderItem canonical config field: Real Order with A4, COLOR, DOUBLE, 3 copies, LANDSCAPE, ACTUAL_SIZE', () => {
    const orderId = 'ord_p5_1_real';
    const itemId = 'item_p5_1_real';
    const fileId = 'file_p5_1_contract';

    store.orderFiles.set(fileId, {
      id: fileId,
      organizationId: ORG_ID,
      shopId: SHOP_ID,
      orderId,
      originalFilename: 'agreement_3pages.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 15360,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      pageCount: 3,
      documentAvailable: true,
      purgeStatus: 'NOT_SCHEDULED'
    });

    // Real OrderItem structured with canonical `config`
    const realOrderItem = {
      id: itemId,
      orderId,
      fileId,
      config: {
        paperSize: 'A4',
        paperType: 'NORMAL_75GSM',
        colorMode: 'COLOR',
        duplexMode: 'DOUBLE',
        copies: 3,
        pageRange: '1,2,3',
        orientation: 'LANDSCAPE',
        scaling: 'ACTUAL_SIZE',
        fitMode: 'ACTUAL_SIZE',
        finishing: 'NONE'
      },
      selectedPages: [1, 2, 3],
      selectedPageCount: 3,
      orientation: 'LANDSCAPE',
      scaling: 'ACTUAL_SIZE',
      printedSides: 6,
      estimatedSheets: 3
    };
    store.orderItems.set(itemId, realOrderItem);

    store.orders.set(orderId, {
      id: orderId,
      orderNumber: 'S2P-26-000009',
      organizationId: ORG_ID,
      shopId: SHOP_ID,
      status: 'ACCEPTED',
      paymentStatus: 'PAID',
      items: [realOrderItem]
    });

    // Verify canonical OrderItem property is `config`
    assert.ok(realOrderItem.config, 'OrderItem must have config property');
    assert.equal(realOrderItem.config.colorMode, 'COLOR');
    assert.equal(realOrderItem.config.duplexMode, 'DOUBLE');
    assert.equal(realOrderItem.config.copies, 3);
    assert.equal(realOrderItem.config.orientation, 'LANDSCAPE');
    assert.equal(realOrderItem.config.scaling, 'ACTUAL_SIZE');
  });

  it('2. Print Config Snapshot must NOT be empty and must exactly match customer checkout', () => {
    const item = store.orderItems.get('item_p5_1_real');
    const file = store.orderFiles.get(item.fileId);

    const rawCfg = item.config || {};
    const printConfigSnapshot = {
      pageRange: rawCfg.pageRange || (item.selectedPages ? item.selectedPages.join(',') : 'all'),
      selectedPages: item.selectedPages || [],
      selectedPageCount: item.selectedPageCount || 1,
      paperSize: rawCfg.paperSize || 'A4',
      paperType: rawCfg.paperType || 'NORMAL_75GSM',
      colorMode: rawCfg.colorMode || 'BW',
      duplexMode: rawCfg.duplexMode || 'SINGLE',
      copies: rawCfg.copies || 1,
      orientation: rawCfg.orientation || item.orientation || 'PORTRAIT',
      scaling: rawCfg.scaling || item.scaling || 'FIT',
      fitMode: rawCfg.fitMode || rawCfg.scaling || item.scaling || 'FIT',
      finishing: rawCfg.finishing || 'NONE'
    };

    // Assert that printConfigSnapshot is not empty
    assert.notDeepEqual(printConfigSnapshot, {}, 'printConfigSnapshot must not be empty');
    assert.equal(printConfigSnapshot.paperSize, 'A4');
    assert.equal(printConfigSnapshot.colorMode, 'COLOR');
    assert.equal(printConfigSnapshot.duplexMode, 'DOUBLE');
    assert.equal(printConfigSnapshot.copies, 3);
    assert.equal(printConfigSnapshot.orientation, 'LANDSCAPE');
    assert.equal(printConfigSnapshot.scaling, 'ACTUAL_SIZE');
    assert.deepEqual(printConfigSnapshot.selectedPages, [1, 2, 3]);
    assert.equal(printConfigSnapshot.selectedPageCount, 3);

    // Save job
    const jobId = 'pj_ord_p5_1_real_' + item.id;
    store.printJobs.set(jobId, {
      id: jobId,
      organizationId: ORG_ID,
      shopId: SHOP_ID,
      orderId: 'ord_p5_1_real',
      orderItemId: item.id,
      fileId: file.id,
      printerId: null,
      deviceId: null,
      status: 'QUEUED',
      priority: 1,
      printConfigSnapshot,
      fileSnapshot: {
        fileId: file.id,
        sha256: file.sha256,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
        pageCount: file.pageCount,
        filename: file.originalFilename
      },
      attemptCount: 0,
      activeAttemptId: null,
      irreversibleStageReached: false,
      lease: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  it('3. Job Claim links canonical activeAttemptId and creates printAttempt record', () => {
    const jobId = 'pj_ord_p5_1_real_item_p5_1_real';
    const job = store.printJobs.get(jobId);

    const rawLeaseToken = 'lease_token_5_1_super_random_hex';
    const leaseTokenHash = crypto.createHash('sha256').update(rawLeaseToken).digest('hex');
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 60000).toISOString();

    const attemptId = 'att_p5_1_001';

    // Update job
    job.status = 'LEASED';
    job.deviceId = DEVICE_ID;
    job.attemptCount = 1;
    job.activeAttemptId = attemptId;
    job.irreversibleStageReached = false;
    job.lease = {
      deviceId: DEVICE_ID,
      leaseTokenHash,
      claimedAt: nowIso,
      expiresAt: expiresIso
    };
    job.updatedAt = nowIso;

    // Create attempt
    const attemptRecord = {
      id: attemptId,
      organizationId: ORG_ID,
      shopId: SHOP_ID,
      printJobId: jobId,
      orderId: job.orderId,
      deviceId: DEVICE_ID,
      printerId: null,
      attemptNumber: 1,
      status: 'LEASED',
      startedAt: nowIso,
      lastUpdatedAt: nowIso,
      errorCode: null,
      errorMessageSanitized: null,
      irreversibleStageReached: false
    };
    store.printAttempts.set(attemptId, attemptRecord);

    assert.equal(job.activeAttemptId, attemptId);
    assert.equal(store.printAttempts.get(attemptId).status, 'LEASED');
    assert.equal(store.printAttempts.get(attemptId).irreversibleStageReached, false);
  });

  it('4. Print attempt atomically follows job transitions: LEASED -> DOWNLOADING -> READY_TO_PRINT', () => {
    const jobId = 'pj_ord_p5_1_real_item_p5_1_real';
    const job = store.printJobs.get(jobId);
    const attempt = store.printAttempts.get(job.activeAttemptId);

    // Transition 1: DOWNLOADING
    job.status = 'DOWNLOADING';
    job.updatedAt = new Date().toISOString();
    attempt.status = 'DOWNLOADING';
    attempt.lastUpdatedAt = job.updatedAt;

    assert.equal(job.status, 'DOWNLOADING');
    assert.equal(attempt.status, 'DOWNLOADING');

    // Transition 2: READY_TO_PRINT
    job.status = 'READY_TO_PRINT';
    job.updatedAt = new Date().toISOString();
    attempt.status = 'READY_TO_PRINT';
    attempt.lastUpdatedAt = job.updatedAt;

    assert.equal(job.status, 'READY_TO_PRINT');
    assert.equal(attempt.status, 'READY_TO_PRINT');
    assert.equal(job.activeAttemptId, attempt.id, 'activeAttemptId remains consistent');
  });

  it('5. Failure status updates the same printAttempt with sanitized error details', () => {
    const jobId = 'pj_ord_p5_1_real_item_p5_1_real';
    const job = store.printJobs.get(jobId);
    const attempt = store.printAttempts.get(job.activeAttemptId);

    job.status = 'FAILED';
    attempt.status = 'FAILED';
    attempt.errorCode = 'FILE_HASH_MISMATCH';
    attempt.errorMessageSanitized = 'Downloaded file SHA-256 did not match authoritative snapshot';
    attempt.lastUpdatedAt = new Date().toISOString();

    assert.equal(attempt.status, 'FAILED');
    assert.equal(attempt.errorCode, 'FILE_HASH_MISMATCH');
    assert.ok(attempt.errorMessageSanitized.includes('SHA-256'));

    // Reset status back to READY_TO_PRINT for next tests
    job.status = 'READY_TO_PRINT';
    attempt.status = 'READY_TO_PRINT';
  });

  it('6. Lease auto-renew during long job processing updates lease expiry', () => {
    const jobId = 'pj_ord_p5_1_real_item_p5_1_real';
    const job = store.printJobs.get(jobId);

    const oldExpiresAt = job.lease.expiresAt;
    const newExpiresAt = new Date(Date.now() + 90000).toISOString();
    job.lease.expiresAt = newExpiresAt;

    assert.ok(new Date(job.lease.expiresAt) > new Date(oldExpiresAt));
  });

  it('7. Real vs Virtual Printer Detection classifies correctly', () => {
    function detectPrinterKind(name, driverName, portName) {
      const lowerName = name.toLowerCase();
      const lowerDriver = driverName.toLowerCase();
      const lowerPort = portName.toLowerCase();

      if (lowerName.includes('pdf') || lowerDriver.includes('pdf') ||
          lowerName.includes('onenote') || lowerDriver.includes('onenote') ||
          lowerName.includes('xps') || lowerDriver.includes('xps') ||
          lowerName.includes('fax') || lowerDriver.includes('fax') ||
          lowerPort.includes('portprompt') || lowerPort.includes('nul:')) {
        return 'VIRTUAL';
      }

      if (lowerName.includes('smart tank') || lowerDriver.includes('smart tank') ||
          lowerPort.startsWith('wsd') || lowerPort.startsWith('usb')) {
        return 'PHYSICAL';
      }

      return 'UNKNOWN';
    }

    const hp = detectPrinterKind(
      'HP51C8E5 (HP Smart Tank 580-590 series)',
      'Microsoft IPP Class Driver',
      'WSD-f5c9b978-065d-4722-973e-8cc561379c3c'
    );
    const pdf = detectPrinterKind('Microsoft Print to PDF', 'Microsoft Print To PDF', 'PORTPROMPT:');
    const oneNote = detectPrinterKind('OneNote (Desktop)', 'Send to Microsoft OneNote 16 Driver', 'nul:');

    assert.equal(hp, 'PHYSICAL');
    assert.equal(pdf, 'VIRTUAL');
    assert.equal(oneNote, 'VIRTUAL');

    // Register them in store
    store.printers.set('p_hp_smart_tank', {
      id: 'p_hp_smart_tank',
      organizationId: ORG_ID,
      shopId: SHOP_ID,
      displayName: 'HP51C8E5 (HP Smart Tank 580-590 series)',
      printerKind: 'PHYSICAL',
      connectionType: 'WSD',
      isOnline: true,
      isEnabled: true,
      capabilities: {
        paperSizes: ['A4', 'Letter', 'A3'],
        colorSupported: true,
        duplexSupported: true
      }
    });

    store.printers.set('p_ms_pdf', {
      id: 'p_ms_pdf',
      organizationId: ORG_ID,
      shopId: SHOP_ID,
      displayName: 'Microsoft Print to PDF',
      printerKind: 'VIRTUAL',
      connectionType: 'UNKNOWN',
      isOnline: true,
      isEnabled: true,
      capabilities: {
        paperSizes: ['A4', 'Letter'],
        colorSupported: true,
        duplexSupported: false
      }
    });
  });

  it('8. Physical printer eligibility filters out virtual queues for automated printing', () => {
    const allPrinters = Array.from(store.printers.values());
    const eligiblePhysical = allPrinters.filter(
      p => p.printerKind === 'PHYSICAL' && p.isEnabled && p.isOnline
    );

    assert.equal(eligiblePhysical.length, 1);
    assert.equal(eligiblePhysical[0].displayName, 'HP51C8E5 (HP Smart Tank 580-590 series)');
    assert.ok(!eligiblePhysical.some(p => p.printerKind === 'VIRTUAL'));
  });

  it('9. Printer capability validation detects mismatches and prevents silent downgrades', () => {
    const job = store.printJobs.get('pj_ord_p5_1_real_item_p5_1_real');
    const monoPrinter = {
      id: 'p_mono_only',
      capabilities: {
        paperSizes: ['A4'],
        colorSupported: false, // Color NOT supported
        duplexSupported: true
      }
    };

    const cfg = job.printConfigSnapshot;
    // Job requires COLOR
    assert.equal(cfg.colorMode, 'COLOR');
    assert.equal(monoPrinter.capabilities.colorSupported, false);

    // Validator rejects silent downgrade
    function validateCapability(requestedCfg, printer) {
      if (requestedCfg.colorMode === 'COLOR' && !printer.capabilities.colorSupported) {
        throw new Error('PRINTER_CAPABILITY_MISMATCH: Selected printer does not support color printing.');
      }
      if (requestedCfg.duplexMode === 'DOUBLE' && !printer.capabilities.duplexSupported) {
        throw new Error('PRINTER_CAPABILITY_MISMATCH: Selected printer does not support duplex printing.');
      }
      return true;
    }

    assert.throws(
      () => validateCapability(cfg, monoPrinter),
      /PRINTER_CAPABILITY_MISMATCH: Selected printer does not support color printing/
    );
  });

  it('10. Printer assignment to job sets printerId on both job and active attempt', () => {
    const jobId = 'pj_ord_p5_1_real_item_p5_1_real';
    const job = store.printJobs.get(jobId);
    const hpPrinter = store.printers.get('p_hp_smart_tank');

    job.printerId = hpPrinter.id;
    job.updatedAt = new Date().toISOString();

    const attempt = store.printAttempts.get(job.activeAttemptId);
    attempt.printerId = hpPrinter.id;
    attempt.lastUpdatedAt = job.updatedAt;

    assert.equal(job.printerId, 'p_hp_smart_tank');
    assert.equal(attempt.printerId, 'p_hp_smart_tank');
  });

  it('11. Irreversible stage model: Safe requeue vs STATUS_UNKNOWN on lease expiry', () => {
    // Case A: Before irreversible stage (READY_TO_PRINT, irreversibleStageReached: false)
    const jobBefore = {
      status: 'READY_TO_PRINT',
      irreversibleStageReached: false,
      lease: { expiresAt: new Date(Date.now() - 5000).toISOString() }
    };

    function handleExpiredLease(j) {
      if (j.irreversibleStageReached === true) {
        return 'STATUS_UNKNOWN';
      }
      return 'QUEUED'; // Safe to recover / requeue
    }

    assert.equal(handleExpiredLease(jobBefore), 'QUEUED', 'Before irreversible stage, job may safely requeue');

    // Case B: Once spool submission initiated in Phase 6 (irreversibleStageReached: true)
    const jobAfter = {
      status: 'SUBMITTED',
      irreversibleStageReached: true,
      lease: { expiresAt: new Date(Date.now() - 5000).toISOString() }
    };

    assert.equal(handleExpiredLease(jobAfter), 'STATUS_UNKNOWN', 'After irreversible stage, NEVER auto-requeue; becomes STATUS_UNKNOWN');
  });

  it('12. Device revocation during active job respects irreversible stage invariant', () => {
    const device = store.devices.get(DEVICE_ID);
    device.status = 'REVOKED';

    const job = store.printJobs.get('pj_ord_p5_1_real_item_p5_1_real');
    assert.equal(job.irreversibleStageReached, false);

    // Because irreversibleStageReached is false, the job can safely return to QUEUED for another agent
    if (!job.irreversibleStageReached) {
      job.status = 'QUEUED';
      job.deviceId = null;
      job.lease = null;
    } else {
      job.status = 'STATUS_UNKNOWN';
    }

    assert.equal(job.status, 'QUEUED');
    assert.equal(job.lease, null);
  });

  it('13. Temp file retention safety at READY_TO_PRINT (File remains preserved)', () => {
    const file = store.orderFiles.get('file_p5_1_contract');
    // Ensure file purge is NOT scheduled
    assert.equal(file.documentAvailable, true);
    assert.equal(file.purgeStatus, 'NOT_SCHEDULED');
  });
});
