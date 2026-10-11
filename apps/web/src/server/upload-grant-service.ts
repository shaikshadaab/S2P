import crypto from 'crypto';
import { Firestore } from 'firebase-admin/firestore';
import {
  UploadGrant,
  IssueUploadGrantRequest,
  IssueUploadGrantResponse,
  AgentConfirmUploadRequest,
  OrderFile,
  OrderDraft,
  Device
} from '@s2p/shared';
import { authenticateAgent } from './device-service';

export const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const GRANT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
];

/**
 * Issues a scoped high-entropy upload grant for a specific shop PC device.
 * Enforces:
 * - Target shop exists and active
 * - Target shop PC is ONLINE (heartbeat within 90s)
 * - Draft exists, belongs to shop, and not expired
 * - Raw token is returned ONCE; DB only stores SHA-256 hash
 */
export async function issueUploadGrant(
  db: Firestore,
  input: IssueUploadGrantRequest,
  identity: { uid?: string; isGuest?: boolean; guestSessionId?: string }
): Promise<IssueUploadGrantResponse> {
  const { shopId, draftId, filename, mimeType, sizeBytes } = input;

  if (!shopId || !draftId) {
    throw new Error('MISSING_FIELDS: shopId and draftId are required.');
  }

  // 1. Shop Check
  const shopDoc = await db.collection('shops').doc(shopId).get();
  if (!shopDoc.exists) {
    throw new Error('SHOP_NOT_FOUND: Target shop does not exist.');
  }
  const shopData = shopDoc.data();
  if (shopData?.status !== 'ACTIVE') {
    throw new Error('SHOP_INACTIVE: Target shop is currently inactive.');
  }
  if (shopData?.settings?.manualPause === true) {
    // Owner commissioning flow: Allow authorized OWNER or MANAGER to test uploads while public intake is paused
    let isAuthorizedStaff = false;
    if (identity.uid) {
      try {
        const memberSnap = await db.collection('members')
          .where('shopId', '==', shopId)
          .where('userId', '==', identity.uid)
          .where('status', '==', 'ACTIVE')
          .limit(1)
          .get();
        if (!memberSnap.empty) {
          const role = memberSnap.docs[0].data().role;
          if (role === 'OWNER' || role === 'MANAGER') {
            isAuthorizedStaff = true;
          }
        }
      } catch { }
    }
    if (!isAuthorizedStaff) {
      throw new Error('INTAKE_PAUSED: Customer intake is currently paused at this shop.');
    }
  }

  // 2. Draft Check
  const draftDoc = await db.collection('orderDrafts').doc(draftId).get();
  if (!draftDoc.exists) {
    throw new Error('DRAFT_NOT_FOUND: Order draft not found or session expired.');
  }
  const draftData = draftDoc.data() as OrderDraft;
  if (draftData.shopId !== shopId) {
    throw new Error('FORBIDDEN_SHOP: Draft does not belong to this shop.');
  }
  if (draftData.expiresAt && new Date(draftData.expiresAt).getTime() < Date.now()) {
    throw new Error('DRAFT_EXPIRED: Order draft session has expired.');
  }

  // Session ownership check
  if (identity.uid) {
    if (draftData.ownerUid && draftData.ownerUid !== identity.uid) {
      throw new Error('FORBIDDEN_SESSION: Order draft belongs to another user.');
    }
  } else {
    if (draftData.ownerUid) {
      throw new Error("FORBIDDEN_SESSION: This draft belongs to an authenticated user account.");
    }
    if (draftData.guestSessionId && draftData.guestSessionId !== identity.guestSessionId) {
      throw new Error('FORBIDDEN_SESSION: Order draft belongs to another session.');
    }
    if (!draftData.guestSessionId && identity.guestSessionId) {
      await draftDoc.ref.update({
        guestSessionId: identity.guestSessionId,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // 3. Find Online Shop PC Device
  const now = Date.now();
  const devicesSnap = await db.collection('devices')
    .where('shopId', '==', shopId)
    .get();

  const onlineDevices = devicesSnap.docs
    .map(d => d.data() as Device)
    .filter(d => {
      if (d.status !== 'ONLINE') return false;
      const hb = new Date(d.lastHeartbeatAt || 0).getTime();
      return now - hb <= 600 * 1000;
    })
    .sort((a, b) => new Date(b.lastHeartbeatAt || 0).getTime() - new Date(a.lastHeartbeatAt || 0).getTime());

  if (onlineDevices.length === 0) {
    throw new Error('AGENT_OFFLINE: Shop printing counter PC is currently offline. Please ask shopkeeper to connect PC.');
  }

  const primaryDevice = onlineDevices[0];
  let agentUploadUrl = (
    primaryDevice.agentUploadUrl ||
    (shopData.agentUploadUrl as string) ||
    (shopData.settings?.agentUploadUrl as string) ||
    ''
  ).trim();

  if (!agentUploadUrl) {
    throw new Error('UPLOAD_ENDPOINT_NOT_CONFIGURED: Direct HTTPS upload tunnel is not configured on the shop PC.');
  }

  // Live endpoint reachability verification: check reachability, not merely a stored HTTPS URL
  const isLocalOrTest = process.env.S2P_TEST_MODE === 'true' || agentUploadUrl.includes('localhost') || agentUploadUrl.includes('127.0.0.1');
  if (!isLocalOrTest) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const pingRes = await fetch(`${agentUploadUrl}/api/agent/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!pingRes.ok) {
        throw new Error(`Endpoint returned HTTP ${pingRes.status}`);
      }
    } catch (pingErr: any) {
      console.warn(`[issueUploadGrant] Direct tunnel (${agentUploadUrl}) unreachable: ${pingErr?.message}`);
      if (sizeBytes && sizeBytes > 4 * 1024 * 1024) {
        throw new Error(`TUNNEL_UNREACHABLE: Direct shop PC upload endpoint (${agentUploadUrl}) is unreachable (${pingErr?.message || 'timeout'}). Large files (>4MB) require active tunnel. Please restart start-free-tunnel.bat on the shop PC.`);
      }
      // Graceful fallback for normal documents (<= 4MB) to serverless relay
      agentUploadUrl = '';
    }
  }

  // 4. File Size & MIME Checks
  if (sizeBytes && sizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error(`FILE_TOO_LARGE: File exceeds maximum allowed size of 50 MB.`);
  }

  // 5. Generate High-Entropy Grant Token
  const grantId = 'ug_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
  const rawToken = crypto.randomBytes(32).toString('hex'); // 64 hex chars (256-bit entropy)
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(now + GRANT_TTL_MS).toISOString();

  const grantRecord: UploadGrant = {
    id: grantId,
    tokenHash,
    shopId,
    draftId,
    targetDeviceId: primaryDevice.id,
    agentUploadUrl,
    maxSizeBytes: MAX_UPLOAD_SIZE_BYTES,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    filename: filename || '',
    mimeType: mimeType || '',
    sizeBytes: sizeBytes || 0,
    createdAt: new Date().toISOString(),
    expiresAt,
    status: 'ISSUED'
  };

  await db.collection('uploadGrants').doc(grantId).set(grantRecord);

  return {
    success: true,
    grantId,
    token: rawToken,
    agentUploadUrl,
    expiresAt,
    maxSizeBytes: MAX_UPLOAD_SIZE_BYTES,
    allowedMimeTypes: ALLOWED_MIME_TYPES
  };
}

/**
 * Constant-time grant verification called by agent before saving file.
 */
export async function verifyUploadGrant(
  db: Firestore,
  grantId: string,
  rawToken: string
): Promise<UploadGrant> {
  const grantDoc = await db.collection('uploadGrants').doc(grantId).get();
  if (!grantDoc.exists) {
    throw new Error('GRANT_NOT_FOUND: Upload grant does not exist.');
  }

  const grant = grantDoc.data() as UploadGrant;
  if (grant.status !== 'ISSUED') {
    throw new Error(`GRANT_INVALID: Upload grant is ${grant.status}.`);
  }

  if (new Date(grant.expiresAt).getTime() < Date.now()) {
    await grantDoc.ref.update({ status: 'EXPIRED' });
    throw new Error('GRANT_EXPIRED: Upload grant has expired (5-minute TTL).');
  }

  const incomingHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const storedHash = grant.tokenHash;

  const inBuf = Buffer.from(incomingHash, 'hex');
  const storeBuf = Buffer.from(storedHash, 'hex');

  if (inBuf.length !== storeBuf.length || !crypto.timingSafeEqual(inBuf, storeBuf)) {
    throw new Error('GRANT_TOKEN_INVALID: Upload grant token verification failed.');
  }

  return grant;
}

/**
 * Agent confirms successful local file receipt.
 * Authenticates with deviceId + deviceSecret.
 * Creates authoritative OrderFile with storageMode = 'LOCAL_AGENT'.
 */
export async function confirmAgentUpload(
  db: Firestore,
  deviceId: string,
  deviceSecret: string,
  input: AgentConfirmUploadRequest & { draftId?: string; orderId?: string }
): Promise<OrderFile> {
  if (!input.grantId || typeof input.grantId !== 'string' || !input.grantId.trim()) {
    throw new Error('GRANT_REQUIRED: Upload confirmation strictly requires an issued upload grant ID.');
  }

  const device = await authenticateAgent(db, deviceId, deviceSecret);

  return await db.runTransaction(async (transaction) => {
    const grantRef = db.collection('uploadGrants').doc(input.grantId);
    const grantDoc = await transaction.get(grantRef);

    if (!grantDoc.exists) {
      throw new Error('GRANT_NOT_FOUND: Upload grant does not exist.');
    }

    const grantData = grantDoc.data() as UploadGrant;

    // 1. Idempotency check: if already USED, return existing OrderFile without duplicates
    if (grantData.status === 'USED') {
      if (grantData.confirmedFileId) {
        const existingFileDoc = await transaction.get(db.collection('orderFiles').doc(grantData.confirmedFileId));
        if (existingFileDoc.exists) {
          return existingFileDoc.data() as OrderFile;
        }
      }
      throw new Error('GRANT_ALREADY_USED: This upload grant has already been consumed.');
    }

    // 2. Status check
    if (grantData.status !== 'ISSUED') {
      throw new Error(`GRANT_INVALID: Upload grant is in invalid status: ${grantData.status}.`);
    }

    // 3. Expiration check
    const now = Date.now();
    const expiresAtMs = new Date(grantData.expiresAt).getTime();
    if (expiresAtMs < now) {
      transaction.update(grantRef, { status: 'EXPIRED' });
      throw new Error('GRANT_EXPIRED: Upload grant has expired.');
    }

    // 4. Shop binding
    if (grantData.shopId !== device.shopId) {
      throw new Error('FORBIDDEN_SHOP: Upload grant belongs to a different shop than this device.');
    }

    // 5. Target device binding
    if (grantData.targetDeviceId && grantData.targetDeviceId !== device.id) {
      throw new Error(`FORBIDDEN_DEVICE: Upload grant is bound to device ${grantData.targetDeviceId}, but confirmed by ${device.id}.`);
    }

    // 6. File constraints check
    if (input.sizeBytes > grantData.maxSizeBytes) {
      throw new Error(`FILE_TOO_LARGE: Uploaded file size (${input.sizeBytes} bytes) exceeds granted maximum (${grantData.maxSizeBytes} bytes).`);
    }

    const normMime = (input.mimeType || 'application/pdf').toLowerCase().trim();
    if (grantData.allowedMimeTypes && grantData.allowedMimeTypes.length > 0) {
      const allowed = grantData.allowedMimeTypes.map(m => m.toLowerCase().trim());
      if (!allowed.includes(normMime)) {
        throw new Error(`INVALID_MIME_TYPE: File type '${normMime}' is not permitted by grant. Allowed: ${grantData.allowedMimeTypes.join(', ')}`);
      }
    }

    // 7. Authoritative draft binding (never trust caller-supplied draftId as substitute)
    const authoritativeDraftId = grantData.draftId;
    if (!authoritativeDraftId) {
      throw new Error('GRANT_INVALID: Upload grant is not bound to a valid order draft.');
    }
    if (input.draftId && input.draftId !== authoritativeDraftId) {
      throw new Error('DRAFT_MISMATCH: Caller supplied draftId does not match the draft bound to this grant.');
    }

    // Verify draft exists
    const draftRef = db.collection('orderDrafts').doc(authoritativeDraftId);
    const draftDoc = await transaction.get(draftRef);
    if (!draftDoc.exists) {
      throw new Error('DRAFT_NOT_FOUND: The order draft bound to this grant no longer exists.');
    }

    // 8. Generate file and write atomically
    const fileId = input.fileId || ('f_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex'));
    const nowIso = new Date().toISOString();

    const fileDoc: OrderFile = {
      id: fileId,
      organizationId: device.organizationId,
      shopId: device.shopId,
      orderId: authoritativeDraftId,
      originalFilename: input.safeDisplayName,
      safeDisplayName: input.safeDisplayName,
      mimeType: normMime,
      sizeBytes: input.sizeBytes,
      sha256: input.sha256,
      pageCount: input.pageCount || 1,
      convertedFrom: input.convertedFrom || null,
      storageMode: 'LOCAL_AGENT',
      agentDeviceId: device.id,
      agentLocalPath: input.localPath,
      storageOriginalPath: 'local://' + fileId,
      processingStatus: 'READY_FOR_PRINT',
      documentAvailable: true,
      uploadedAt: nowIso,
      validatedAt: nowIso,
      readyAt: nowIso,
      purgeStatus: 'NOT_SCHEDULED'
    };

    // Atomic write 1: Set OrderFile
    transaction.set(db.collection('orderFiles').doc(fileId), fileDoc);

    // Atomic write 2: Mark Grant USED with confirmedFileId
    transaction.update(grantRef, {
      status: 'USED',
      usedAt: nowIso,
      confirmedFileId: fileId
    });

    return fileDoc;
  });
}
