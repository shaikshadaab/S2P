if (typeof window !== 'undefined') {
  throw new Error('FATAL: device-service is server-only and cannot be imported into a browser bundle.');
}

import crypto from 'crypto';
import { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  Device,
  DevicePairingCode,
  HeartbeatPayload,
  Printer,
  PrinterConnectionType,
  PrinterKind
} from '@s2p/shared';

/**
 * Generates a short-lived, single-use 6-digit alphanumeric pairing code.
 * Lifetime: 5 minutes.
 * Only OWNER or MANAGER can create pairing codes.
 */
export async function generateDevicePairingCode(
  db: Firestore,
  shopId: string,
  createdByUid: string
) {
  if (!shopId || !createdByUid) {
    throw new Error('shopId and createdByUid are required.');
  }

  // 1. Authoritative shop check
  const shopDoc = await db.collection('shops').doc(shopId).get();
  if (!shopDoc.exists) throw new Error('Shop not found.');
  const shopData = shopDoc.data();
  if (!shopData || shopData.status !== 'ACTIVE') throw new Error('Shop is inactive.');

  // 2. Generate random 6-character alphanumeric pairing code (readable uppercase)
  const code = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const codeId = 'pcode_' + codeHash.slice(0, 16);

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const expiresAt = new Date(now + 5 * 60 * 1000).toISOString(); // 5 minutes lifetime

  const pairingRecord: DevicePairingCode = {
    id: codeId,
    codeHash,
    organizationId: shopData.organizationId,
    shopId,
    createdByUid,
    expiresAt,
    usedAt: null,
    status: 'ACTIVE',
    createdAt: nowIso
  };

  await db.collection('devicePairingCodes').doc(codeId).set(pairingRecord);

  // Write audit log
  const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
  await db.collection('auditLogs').doc(auditId).set({
    id: auditId,
    organizationId: shopData.organizationId,
    shopId,
    action: 'PAIRING_CODE_CREATED',
    targetType: 'DEVICE_PAIRING_CODE',
    targetId: codeId,
    actorId: createdByUid,
    actorRole: 'STAFF',
    timestamp: nowIso,
    details: { expiresAt }
  });

  return {
    success: true,
    codeId,
    pairingCode: code,
    expiresAt,
    shopId,
    shopName: shopData.name
  };
}

/**
 * Agent Pairing API (Server-Side)
 * Verifies code, unused, not expired, generates random deviceId and secret.
 * Stores SHA-256 hash only. Returns raw secret ONCE.
 */
export async function pairAgent(
  db: Firestore,
  input: {
    pairingCode: string;
    deviceName?: string;
    hostname?: string;
    windowsVersion?: string;
    agentVersion?: string;
  }
) {
  const rawCode = (input.pairingCode || '').trim().toUpperCase();
  if (!rawCode || rawCode.length < 6) {
    throw new Error('Valid pairing code is required.');
  }

  const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

  return await db.runTransaction(async (transaction) => {
    // 1. Find pairing code
    const query = db.collection('devicePairingCodes')
      .where('codeHash', '==', codeHash)
      .where('status', '==', 'ACTIVE')
      .limit(1);

    const snapshot = await transaction.get(query);
    if (snapshot.empty) {
      throw new Error('Invalid or already used pairing code.');
    }

    const codeDoc = snapshot.docs[0];
    const codeData = codeDoc.data() as DevicePairingCode;

    // Check expiration
    if (new Date(codeData.expiresAt).getTime() < Date.now()) {
      transaction.update(codeDoc.ref, { status: 'EXPIRED' });
      throw new Error('Pairing code has expired. Please generate a new code.');
    }

    if (codeData.status !== 'ACTIVE' || codeData.usedAt) {
      throw new Error('Pairing code has already been used.');
    }

    // 2. Generate Device Credentials
    const deviceId = 'dev_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
    const rawSecret = crypto.randomBytes(32).toString('hex'); // 64 hex chars (256-bit entropy)
    const credentialHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    const nowIso = new Date().toISOString();

    const deviceRecord: Device = {
      id: deviceId,
      organizationId: codeData.organizationId,
      shopId: codeData.shopId,
      name: (input.deviceName || input.hostname || 'Windows S2P Agent').trim(),
      hostname: (input.hostname || 'DESKTOP').trim(),
      windowsVersion: (input.windowsVersion || 'Windows').trim(),
      agentVersion: (input.agentVersion || '0.1.0').trim(),
      status: 'ONLINE',
      credentialHash,
      pairedByUid: codeData.createdByUid,
      pairedAt: nowIso,
      lastHeartbeatAt: nowIso,
      capabilities: {},
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // 3. Atomic writes
    transaction.set(db.collection('devices').doc(deviceId), deviceRecord);

    transaction.update(codeDoc.ref, {
      status: 'USED',
      usedAt: nowIso,
      usedByDeviceId: deviceId
    });

    const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
    transaction.set(db.collection('auditLogs').doc(auditId), {
      id: auditId,
      organizationId: codeData.organizationId,
      shopId: codeData.shopId,
      action: 'DEVICE_PAIRED',
      targetType: 'DEVICE',
      targetId: deviceId,
      actorId: codeData.createdByUid,
      actorRole: 'STAFF',
      timestamp: nowIso,
      details: {
        hostname: deviceRecord.hostname,
        agentVersion: deviceRecord.agentVersion
      }
    });

    return {
      success: true,
      deviceId,
      deviceSecret: rawSecret, // RETURNED ONLY ONCE
      shopId: codeData.shopId,
      organizationId: codeData.organizationId
    };
  });
}

/**
 * Validates device credentials using constant-time hash comparison.
 * Rejects revoked or deleted devices.
 */
export async function authenticateAgent(
  db: Firestore,
  deviceId: string,
  deviceSecret: string
): Promise<Device> {
  if (!deviceId || !deviceSecret) {
    throw new Error('Device credentials missing (deviceId and deviceSecret required).');
  }

  const deviceDoc = await db.collection('devices').doc(deviceId).get();
  if (!deviceDoc.exists) {
    throw new Error('DEVICE_NOT_FOUND: Device is not registered.');
  }

  const device = deviceDoc.data() as Device;

  if (device.status === 'REVOKED') {
    throw new Error('DEVICE_REVOKED: This device has been revoked by shop management.');
  }

  // Constant-time hash verification
  const incomingHash = crypto.createHash('sha256').update(deviceSecret).digest('hex');
  const storedHash = device.credentialHash || '';

  const incomingBuffer = Buffer.from(incomingHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (
    incomingBuffer.length !== storedBuffer.length ||
    !crypto.timingSafeEqual(incomingBuffer, storedBuffer)
  ) {
    throw new Error('INVALID_DEVICE_CREDENTIALS: Device secret verification failed.');
  }

  return device;
}

/**
 * Heartbeat API (Every ~30 seconds)
 * Updates lastHeartbeatAt, hostname, agentVersion, status = ONLINE.
 */
export async function recordAgentHeartbeat(
  db: Firestore,
  deviceId: string,
  deviceSecret: string,
  payload: HeartbeatPayload
) {
  const device = await authenticateAgent(db, deviceId, deviceSecret);

  const nowIso = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    lastHeartbeatAt: nowIso,
    status: 'ONLINE',
    hostname: payload.hostname || device.hostname,
    windowsVersion: payload.windowsVersion || device.windowsVersion,
    agentVersion: payload.agentVersion || device.agentVersion,
    updatedAt: nowIso
  };
  if (payload.agentUploadUrl) {
    updateData.agentUploadUrl = payload.agentUploadUrl;
  }
  await db.collection('devices').doc(deviceId).update(updateData);

  // Sync active upload tunnel URL and active device directly to shop record
  if (device.shopId) {
    const shopUpdate: Record<string, unknown> = {
      activeDeviceId: deviceId,
      updatedAt: nowIso
    };
    if (payload.agentUploadUrl) {
      shopUpdate.agentUploadUrl = payload.agentUploadUrl;
    }
    await db.collection('shops').doc(device.shopId).update(shopUpdate).catch(err => {
      console.warn('[Heartbeat Shop Sync Warning]', err?.message);
    });
  }

  return {
    success: true,
    deviceId,
    status: 'ONLINE',
    timestamp: nowIso
  };
}

/**
 * Installed Windows Printers Discovery Sync
 * Discovered Windows queues are saved under printers/{printerId}
 * Enforces device shopId and organizationId.
 */
export async function syncDiscoveredPrinters(
  db: Firestore,
  deviceId: string,
  deviceSecret: string,
  queues: Array<{
    queueName: string;
    displayName: string;
    driverName?: string;
    portName?: string;
    printerKind?: string;
    connectionType?: string;
    isDefault?: boolean;
    isOnline?: boolean;
    capabilities?: {
      paperSizes?: string[];
      colorSupported?: boolean;
      duplexSupported?: boolean;
      supportedResolutionsDpi?: number[];
    };
  }>
) {
  const device = await authenticateAgent(db, deviceId, deviceSecret);

  const nowIso = new Date().toISOString();
  const currentDiscoveredIds: string[] = [];

  for (const q of queues) {
    const safeQueueSlug = (q.queueName || 'printer').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const printerId = `${deviceId}_${safeQueueSlug}`;
    currentDiscoveredIds.push(printerId);

    const validConnection: PrinterConnectionType = (
      ['USB', 'LAN', 'WIFI', 'SHARED', 'WSD', 'IPP'].includes(q.connectionType || '')
        ? q.connectionType
        : 'UNKNOWN'
    ) as PrinterConnectionType;

    const validKind: PrinterKind = (
      ['PHYSICAL', 'VIRTUAL'].includes(q.printerKind || '')
        ? q.printerKind
        : 'UNKNOWN'
    ) as PrinterKind;

    // Read existing printer doc to respect owner-configured exclusions and defaults
    const existingDoc = await db.collection('printers').doc(printerId).get();
    const existing = existingDoc.exists ? (existingDoc.data() as Partial<Printer>) : null;

    const lowerName = (q.queueName || '').toLowerCase();
    const lowerDriver = (q.driverName || '').toLowerCase();

    // Respect owner exclusions: OneNote and HP Ink Tank 310 series
    const isExcluded = lowerName.includes('onenote') ||
                       lowerName.includes('ink tank 310') ||
                       lowerDriver.includes('ink tank 310') ||
                       existing?.isIgnored === true ||
                       existing?.isEnabled === false;

    // Retained printer: HP SHADAAB Smart Tank 580-590 series
    const isSmartTank580 = lowerName.includes('smart tank 580') ||
                           lowerName.includes('smart tank 580-590') ||
                           lowerName.includes('shadaab smart tank') ||
                           lowerDriver.includes('smart tank 580');

    let isEnabled = isExcluded ? false : (existing?.isEnabled ?? true);
    let isIgnored = isExcluded ? true : (existing?.isIgnored ?? false);
    let isDefault = isExcluded ? false : (isSmartTank580 ? true : (existing?.isDefault ?? false));

    const printerRecord: Printer = {
      id: printerId,
      organizationId: device.organizationId,
      shopId: device.shopId,
      deviceId,
      queueName: q.queueName,
      displayName: q.displayName || q.queueName,
      driverName: q.driverName || 'Generic / Text Only',
      portName: q.portName || 'UNKNOWN',
      printerKind: validKind,
      connectionType: validConnection,
      isDefault,
      isOnline: q.isOnline !== false,
      isEnabled,
      isIgnored,
      capabilities: {
        // Enforce physical capability calibration: filter out uncalibrated A3 and disable automatic duplex
        paperSizes: (q.capabilities?.paperSizes || ['A4']).filter((s: string) => s !== 'A3'),
        colorSupported: Boolean(q.capabilities?.colorSupported),
        duplexSupported: false, // Driver duplex disabled pending physical paper-flip/duplex calibration
        supportedResolutionsDpi: q.capabilities?.supportedResolutionsDpi || [600]
      },
      lastDiscoveredAt: nowIso,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso
    };

    await db.collection('printers').doc(printerId).set(printerRecord, { merge: true });

    if (isDefault) {
      await db.collection('shops').doc(device.shopId).update({
        defaultPrinterId: printerId,
        updatedAt: nowIso
      }).catch(() => {});
    }
  }

  // Mark disappeared printers from this device as offline
  const existingPrintersSnap = await db.collection('printers')
    .where('deviceId', '==', deviceId)
    .get();

  for (const doc of existingPrintersSnap.docs) {
    if (!currentDiscoveredIds.includes(doc.id)) {
      await doc.ref.update({
        isOnline: false,
        updatedAt: nowIso
      });
    }
  }

  // Write audit log
  const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
  await db.collection('auditLogs').doc(auditId).set({
    id: auditId,
    organizationId: device.organizationId,
    shopId: device.shopId,
    action: 'PRINTER_DISCOVERED',
    targetType: 'DEVICE',
    targetId: deviceId,
    actorId: deviceId,
    actorRole: 'AGENT',
    timestamp: nowIso,
    details: {
      count: queues.length,
      printers: queues.map(p => p.queueName)
    }
  });

  return {
    success: true,
    syncedCount: queues.length,
    deviceId
  };
}

/**
 * Revokes a device. Immediate effect on heartbeat, claims, and file downloads.
 */
export async function revokeDevice(
  db: Firestore,
  deviceId: string,
  shopId: string,
  actorUid: string
) {
  const deviceDoc = await db.collection('devices').doc(deviceId).get();
  if (!deviceDoc.exists) throw new Error('Device not found.');
  const device = deviceDoc.data() as Device;

  if (device.shopId !== shopId) {
    throw new Error('Device does not belong to requested shop.');
  }

  const nowIso = new Date().toISOString();
  await db.collection('devices').doc(deviceId).update({
    status: 'REVOKED',
    revokedAt: nowIso,
    revokedByUid: actorUid,
    updatedAt: nowIso
  });

  // Write audit log
  const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
  await db.collection('auditLogs').doc(auditId).set({
    id: auditId,
    organizationId: device.organizationId,
    shopId,
    action: 'DEVICE_REVOKED',
    targetType: 'DEVICE',
    targetId: deviceId,
    actorId: actorUid,
    actorRole: 'STAFF',
    timestamp: nowIso,
    details: { deviceName: device.name }
  });

  return {
    success: true,
    deviceId,
    status: 'REVOKED'
  };
}

/**
 * Lists devices for a shop with 90-second offline threshold calculation.
 */
export async function getShopDevices(
  db: Firestore,
  shopId: string
) {
  const [snapshot, printersSnap] = await Promise.all([
    db.collection('devices')
      .where('shopId', '==', shopId)
      .orderBy('createdAt', 'desc')
      .get(),
    db.collection('printers')
      .where('shopId', '==', shopId)
      .get()
  ]);

  const devicePrinterCounts = new Map<string, number>();
  for (const pDoc of printersSnap.docs) {
    const pData = pDoc.data();
    const devId = pData.deviceId;
    if (devId) {
      devicePrinterCounts.set(devId, (devicePrinterCounts.get(devId) || 0) + 1);
    }
  }

  const now = Date.now();
  return snapshot.docs.map(doc => {
    const data = doc.data() as Device;
    let computedStatus = data.status;

    if (data.status === 'ONLINE') {
      const lastHeartbeatTime = new Date(data.lastHeartbeatAt).getTime();
      if (now - lastHeartbeatTime > 90 * 1000) {
        computedStatus = 'OFFLINE';
      }
    }

    const pCount = devicePrinterCounts.get(data.id) || 0;

    // NEVER return credentialHash to UI
    return {
      id: data.id,
      name: data.name,
      hostname: data.hostname,
      windowsVersion: data.windowsVersion,
      os: data.windowsVersion,
      agentVersion: data.agentVersion,
      version: data.agentVersion,
      status: computedStatus,
      agentUploadUrl: data.agentUploadUrl || null,
      pairedAt: data.pairedAt,
      lastHeartbeatAt: data.lastHeartbeatAt,
      lastSeen: data.lastHeartbeatAt,
      lastSeenAt: data.lastHeartbeatAt,
      printerCount: pCount,
      createdAt: data.createdAt
    };
  });
}


/**
 * Update and optionally verify a device's direct HTTPS upload URL.
 */
export async function updateDeviceUploadUrl(
  db: Firestore,
  deviceId: string,
  shopId: string,
  agentUploadUrl: string,
  testPing: boolean = false
) {
  const deviceDoc = await db.collection('devices').doc(deviceId).get();
  if (!deviceDoc.exists) {
    throw new Error('DEVICE_NOT_FOUND: Device does not exist.');
  }

  const device = deviceDoc.data() as Device;
  if (device.shopId !== shopId) {
    throw new Error('FORBIDDEN: Device does not belong to specified shop.');
  }

  let normalizedUrl = agentUploadUrl.trim();
  if (normalizedUrl.endsWith('/')) {
    normalizedUrl = normalizedUrl.slice(0, -1);
  }

  if (normalizedUrl) {
    if (!normalizedUrl.startsWith('https://') && !normalizedUrl.startsWith('http://localhost') && !normalizedUrl.startsWith('http://127.0.0.1')) {
      throw new Error('INVALID_URL: Upload URL must use HTTPS for secure mobile customer file transfers (or localhost for testing).');
    }
  }

  let healthVerified = false;
  if (testPing && normalizedUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${normalizedUrl}/api/agent/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.status === 'ONLINE' || body.uploadReady) {
          healthVerified = true;
        }
      }
    } catch (pingErr: any) {
      console.warn('[Device Upload URL Ping Warning]', pingErr?.message);
    }
  }

  const nowIso = new Date().toISOString();
  await db.collection('devices').doc(deviceId).update({
    agentUploadUrl: normalizedUrl,
    uploadUrlVerifiedAt: healthVerified ? nowIso : null,
    updatedAt: nowIso
  });

  if (shopId) {
    await db.collection('shops').doc(shopId).update({
      agentUploadUrl: normalizedUrl,
      activeDeviceId: deviceId,
      updatedAt: nowIso
    }).catch(() => {});
  }

  return {
    success: true,
    deviceId,
    agentUploadUrl: normalizedUrl,
    healthVerified
  };
}
