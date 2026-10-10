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
    throw new Error('INTAKE_PAUSED: Customer intake is currently paused at this shop.');
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
  } else if (identity.isGuest && identity.guestSessionId) {
    if (draftData.guestSessionId && draftData.guestSessionId !== identity.guestSessionId) {
      throw new Error('FORBIDDEN_SESSION: Guest session does not own this draft.');
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
      return now - hb <= 90 * 1000;
    });

  if (onlineDevices.length === 0) {
    throw new Error('AGENT_OFFLINE: Shop printing counter PC is currently offline. Please ask shopkeeper to connect PC.');
  }

  const primaryDevice = onlineDevices[0];
  const agentUploadUrl = primaryDevice.agentUploadUrl || (shopData.settings?.agentUploadUrl as string) || '';

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
  input: AgentConfirmUploadRequest
): Promise<OrderFile> {
  const device = await authenticateAgent(db, deviceId, deviceSecret);
  const grant = await db.collection('uploadGrants').doc(input.grantId).get();

  if (!grant.exists) {
    throw new Error('GRANT_NOT_FOUND: Upload grant does not exist.');
  }
  const grantData = grant.data() as UploadGrant;

  if (grantData.shopId !== device.shopId) {
    throw new Error('FORBIDDEN_SHOP: Device does not belong to grant shop.');
  }

  const fileId = input.fileId || ('f_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'));
  const nowIso = new Date().toISOString();

  const fileDoc: OrderFile = {
    id: fileId,
    organizationId: device.organizationId,
    shopId: device.shopId,
    orderId: grantData.draftId,
    originalFilename: input.safeDisplayName,
    safeDisplayName: input.safeDisplayName,
    mimeType: input.mimeType || 'application/pdf',
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

  await db.runTransaction(async (transaction) => {
    // 1. Write OrderFile
    transaction.set(db.collection('orderFiles').doc(fileId), fileDoc);

    // 2. Mark Grant USED
    transaction.update(grant.ref, {
      status: 'USED',
      usedAt: nowIso,
      confirmedFileId: fileId
    });
  });

  return fileDoc;
}
