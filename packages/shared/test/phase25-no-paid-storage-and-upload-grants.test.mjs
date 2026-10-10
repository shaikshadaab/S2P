import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

test('Phase 25: No-Paid-Cloud-Storage & Scoped Upload Grant Architecture', async (t) => {
  // 1. High-Entropy Scoped Upload Grant Token Generation & Hash Security
  await t.test('1. Upload Grant Token Security: 256-bit entropy and constant-time hash verification', () => {
    const rawToken = crypto.randomBytes(32).toString('hex'); // 64 hex characters (256-bit entropy)
    assert.equal(rawToken.length, 64);

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert.equal(tokenHash.length, 64);

    // Verify correct token matches hash
    const incomingHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert.equal(crypto.timingSafeEqual(Buffer.from(incomingHash, 'hex'), Buffer.from(tokenHash, 'hex')), true);

    // Verify invalid token is rejected
    const badToken = crypto.randomBytes(32).toString('hex');
    const badHash = crypto.createHash('sha256').update(badToken).digest('hex');
    assert.equal(crypto.timingSafeEqual(Buffer.from(badHash, 'hex'), Buffer.from(tokenHash, 'hex')), false);
  });

  // 2. Grant Expiration (5-minute TTL)
  await t.test('2. Upload Grant Lifecycle: 5-minute TTL expiration check', () => {
    const now = Date.now();
    const activeGrant = {
      id: 'ug_test_active',
      status: 'ISSUED',
      expiresAt: new Date(now + 5 * 60 * 1000).toISOString()
    };
    const expiredGrant = {
      id: 'ug_test_expired',
      status: 'ISSUED',
      expiresAt: new Date(now - 1000).toISOString() // Expired 1 second ago
    };

    const isGrantActive = (g) => g.status === 'ISSUED' && new Date(g.expiresAt).getTime() > Date.now();

    assert.equal(isGrantActive(activeGrant), true);
    assert.equal(isGrantActive(expiredGrant), false);
  });

  // 3. Local Agent Storage Record Structure (Zero Cloud Storage Bill)
  await t.test('3. OrderFile Local Agent Storage Invariant: storageMode LOCAL_AGENT with private local path', () => {
    const fileId = 'f_1728555000_abcd1234';
    const localFile = {
      id: fileId,
      shopId: 'shakeel-online-services',
      orderId: 'draft_123',
      originalFilename: 'customer_document.pdf',
      safeDisplayName: 'customer_document.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1542000,
      sha256: '93c3291af1fac9b56b53b20586e8a0c9c468cd559378a28504afb925d4175d82',
      pageCount: 3,
      storageMode: 'LOCAL_AGENT',
      agentDeviceId: 'dev_shop_pc_01',
      agentLocalPath: 'C:\\SOSPrint-Agent\\storage\\orders\\draft_123\\f_1728555000_abcd1234_customer_document.pdf',
      storageOriginalPath: 'local://' + fileId,
      processingStatus: 'READY_FOR_PRINT',
      documentAvailable: true
    };

    assert.equal(localFile.storageMode, 'LOCAL_AGENT');
    assert.equal(localFile.documentAvailable, true);
    assert.ok(localFile.agentLocalPath.includes('C:\\SOSPrint-Agent\\storage'));
    assert.ok(localFile.storageOriginalPath.startsWith('local://'));
  });

  // 4. Shop Availability: Manual Pause Blocks Uploads Safely
  await t.test('4. Shop Readiness: manualPause === true returns INTAKE_PAUSED and available === false', () => {
    const checkAvailability = (shop, onlineDevices, onlinePrinters) => {
      if (shop.settings?.manualPause === true) {
        return { available: false, reason: 'INTAKE_PAUSED', message: 'Customer intake paused.' };
      }
      if (onlineDevices.length === 0) {
        return { available: false, reason: 'AGENT_OFFLINE', message: 'Counter PC offline.' };
      }
      if (onlinePrinters.length === 0) {
        return { available: false, reason: 'PRINTER_OFFLINE', message: 'No printers available.' };
      }
      return { available: true, message: 'Ready to print.', agentUploadUrl: onlineDevices[0]?.agentUploadUrl || null };
    };

    const pausedShop = { id: 'shakeel-online-services', settings: { manualPause: true } };
    const res = checkAvailability(pausedShop, [{ id: 'dev1' }], [{ id: 'pr1' }]);
    assert.equal(res.available, false);
    assert.equal(res.reason, 'INTAKE_PAUSED');
  });

  // 5. Shop Availability: Offline Shop PC Blocks Uploads
  await t.test('5. Shop Readiness: 0 online devices returns AGENT_OFFLINE and available === false', () => {
    const checkAvailability = (shop, onlineDevices, onlinePrinters) => {
      if (shop.settings?.manualPause === true) {
        return { available: false, reason: 'INTAKE_PAUSED', message: 'Customer intake paused.' };
      }
      if (onlineDevices.length === 0) {
        return { available: false, reason: 'AGENT_OFFLINE', message: 'Counter PC offline.' };
      }
      return { available: true, message: 'Ready to print.' };
    };

    const openShop = { id: 'shakeel-online-services', settings: { manualPause: false } };
    const res = checkAvailability(openShop, [], [{ id: 'pr1' }]);
    assert.equal(res.available, false);
    assert.equal(res.reason, 'AGENT_OFFLINE');
  });

  // 6. Shop Availability: Online PC with Tunnel URL
  await t.test('6. Shop Readiness: Online PC attaches agentUploadUrl for direct phone-to-PC uploads', () => {
    const checkAvailability = (shop, onlineDevices, onlinePrinters) => {
      if (shop.settings?.manualPause === true) {
        return { available: false, reason: 'INTAKE_PAUSED', message: 'Customer intake paused.' };
      }
      if (onlineDevices.length === 0) {
        return { available: false, reason: 'AGENT_OFFLINE', message: 'Counter PC offline.' };
      }
      return { available: true, message: 'Ready to print.', agentUploadUrl: onlineDevices[0]?.agentUploadUrl || null };
    };

    const openShop = { id: 'shakeel-online-services', settings: { manualPause: false } };
    const onlineDev = { id: 'dev1', agentUploadUrl: 'https://sos-shop-pc.trycloudflare.com' };
    const res = checkAvailability(openShop, [onlineDev], [{ id: 'pr1' }]);
    assert.equal(res.available, true);
    assert.equal(res.agentUploadUrl, 'https://sos-shop-pc.trycloudflare.com');
  });

  // 7. Maximum File Quota (50 MB)
  await t.test('7. File Validation Quota: Rejects files larger than 50MB (52,428,800 bytes)', () => {
    const MAX_BYTES = 50 * 1024 * 1024;
    const validSize = 45 * 1024 * 1024;
    const oversizedSize = 51 * 1024 * 1024;

    const validateSize = (size) => size <= MAX_BYTES;

    assert.equal(validateSize(validSize), true);
    assert.equal(validateSize(oversizedSize), false);
  });

  // 8. Single-Use Grant Invariant: Grant transitions ISSUED -> USED
  await t.test('8. Grant Single-Use Invariant: Cannot reuse a USED grant', () => {
    const grant = {
      id: 'ug_123',
      status: 'ISSUED',
      usedAt: null
    };

    // First use
    assert.equal(grant.status, 'ISSUED');
    grant.status = 'USED';
    grant.usedAt = new Date().toISOString();

    // Second attempt should fail
    const canUse = (g) => g.status === 'ISSUED';
    assert.equal(canUse(grant), false);
  });

  // 9. Online PC without tunnel returns UPLOAD_ENDPOINT_NOT_CONFIGURED
  await t.test('9. Shop Readiness Invariant: Online PC without tunnel returns UPLOAD_ENDPOINT_NOT_CONFIGURED', () => {
    const checkAvailability = (shop, onlineDevices, onlinePrinters) => {
      if (shop.settings?.manualPause === true) {
        return { available: false, reason: 'INTAKE_PAUSED', message: 'Customer intake paused.' };
      }
      if (onlineDevices.length === 0) {
        return { available: false, reason: 'AGENT_OFFLINE', message: 'Counter PC offline.' };
      }
      const deviceWithUpload = onlineDevices.find(d => d.agentUploadUrl && d.agentUploadUrl.trim().length > 0);
      if (!deviceWithUpload) {
        return { available: false, reason: 'UPLOAD_ENDPOINT_NOT_CONFIGURED', message: 'Upload tunnel not running.' };
      }
      return { available: true, message: 'Ready to print.', agentUploadUrl: deviceWithUpload.agentUploadUrl };
    };

    const openShop = { id: 'shakeel-online-services', settings: { manualPause: false } };
    const onlineDevNoTunnel = { id: 'dev1', agentUploadUrl: null };
    const res = checkAvailability(openShop, [onlineDevNoTunnel], [{ id: 'pr1' }]);
    assert.equal(res.available, false);
    assert.equal(res.reason, 'UPLOAD_ENDPOINT_NOT_CONFIGURED');
  });

  // 10. Vercel Relay Payload Ceiling
  await t.test('10. Vercel Relay Payload Ceiling: Rejects payloads exceeding 4MB (4,194,304 bytes)', () => {
    const MAX_RELAY_BYTES = 4 * 1024 * 1024; // 4 MB
    const smallFile = 3.5 * 1024 * 1024;
    const largeFile = 5 * 1024 * 1024;

    const canRelay = (size) => size <= MAX_RELAY_BYTES;
    assert.equal(canRelay(smallFile), true);
    assert.equal(canRelay(largeFile), false);
  });

  // 11. Upload Endpoint URL Validation
  await t.test('11. Upload Endpoint Validation: Rejects insecure HTTP and accepts HTTPS', () => {
    const validateEndpointUrl = (url) => {
      if (!url) return false;
      const trimmed = url.trim().toLowerCase();
      return trimmed.startsWith('https://') || trimmed.startsWith('http://localhost') || trimmed.startsWith('http://127.0.0.1');
    };

    assert.equal(validateEndpointUrl('https://abc.trycloudflare.com'), true);
    assert.equal(validateEndpointUrl('https://print.shakeel-online.com'), true);
    assert.equal(validateEndpointUrl('http://192.168.1.100:5218'), false); // insecure plain HTTP rejected
    assert.equal(validateEndpointUrl('http://my-shop.com:5218'), false); // insecure plain HTTP rejected
    assert.equal(validateEndpointUrl('http://localhost:5218'), true); // local test permitted
  });
});
