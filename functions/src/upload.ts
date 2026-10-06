import { onRequest } from 'firebase-functions/v2/https';
import * as crypto from 'crypto';
import busboy from 'busboy';
import * as admin from 'firebase-admin';
import {
  validateUploadFile,
  computeSha256,
  extractPdfPageCount,
  OrderFile,
  OrderDraft,
  verifyGuestSessionToken,
  createGuestSessionToken
} from '@s2p/shared';
import { getFirebaseAdminServices } from './purge';

interface CallerIdentity {
  isAuthenticated: boolean;
  uid?: string;
  isGuest: boolean;
  guestSessionId?: string;
  newGuestSessionToken?: string;
}

async function resolveCallerIdentity(req: any): Promise<CallerIdentity> {
  const { auth } = getFirebaseAdminServices();
  const authHeader = (req.headers.authorization || '') as string;
  if (authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7).trim();
    try {
      const decoded = await auth.verifyIdToken(idToken);
      return {
        isAuthenticated: true,
        uid: decoded.uid,
        isGuest: false
      };
    } catch {
      // Fall through to guest
    }
  }

  const guestHeader = (req.headers['x-guest-session-token'] || '') as string;
  if (guestHeader) {
    const verifiedId = verifyGuestSessionToken(guestHeader);
    if (verifiedId) {
      return {
        isAuthenticated: false,
        isGuest: true,
        guestSessionId: verifiedId
      };
    }
  }

  const cookieHeader = (req.headers.cookie || '') as string;
  const match = cookieHeader.match(/s2p_guest_session=([^;]+)/);
  if (match) {
    const verifiedId = verifyGuestSessionToken(match[1]);
    if (verifiedId) {
      return {
        isAuthenticated: false,
        isGuest: true,
        guestSessionId: verifiedId
      };
    }
  }

  const newSession = createGuestSessionToken();
  return {
    isAuthenticated: false,
    isGuest: true,
    guestSessionId: newSession.guestSessionId,
    newGuestSessionToken: newSession.token
  };
}

/**
 * 1. Create Server-Authoritative Order Draft
 * POST /api/draft
 */
export const apiCreateDraft = onRequest(
  { cors: true, memory: '256MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      const { db } = getFirebaseAdminServices();
      const identity = await resolveCallerIdentity(req);
      const { shopId } = req.body || {};

      if (!shopId || typeof shopId !== 'string') {
        res.status(400).json({ success: false, error: 'shopId is required.' });
        return;
      }

      // Authoritative Shop Validation (Fail Closed)
      const shopDoc = await db.collection('shops').doc(shopId).get();
      if (!shopDoc.exists) {
        res.status(404).json({ success: false, error: 'Shop not found.' });
        return;
      }
      const shopData = shopDoc.data();
      if (!shopData || shopData.status !== 'ACTIVE') {
        res.status(403).json({ success: false, error: 'Shop is currently inactive.' });
        return;
      }
      const organizationId = shopData.organizationId;
      if (!organizationId) {
        res.status(500).json({ success: false, error: 'Shop organization configuration is invalid.' });
        return;
      }

      const draftId = 'dft_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

      const draftRecord: OrderDraft = {
        id: draftId,
        shopId,
        organizationId,
        isGuest: identity.isGuest,
        guestSessionId: identity.guestSessionId || null,
        ownerUid: identity.uid || null,
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
        expiresAt
      };

      await db.collection('orderDrafts').doc(draftId).set({
        ...draftRecord,
        createdAtServer: admin.firestore.FieldValue.serverTimestamp()
      });

      if (identity.newGuestSessionToken) {
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('s2p_guest_session', identity.newGuestSessionToken, {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 86400 * 1000
        });
      }

      res.status(200).json({
        success: true,
        draftId,
        guestSessionToken: identity.newGuestSessionToken
      });
    } catch (err: unknown) {
      console.error('[apiCreateDraft Error]:', err);
      const msg = err instanceof Error ? err.message : 'Failed to create order draft.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * 2. Authoritative File Upload API
 * POST /api/upload
 */
export const apiUpload = onRequest(
  { cors: true, memory: '512MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
      return;
    }

    try {
      const { db, storage } = getFirebaseAdminServices();
      const identity = await resolveCallerIdentity(req);

      // Parse Multipart Payload using busboy
      const fields: Record<string, string> = {};
      let fileBuffer: Buffer = Buffer.alloc(0);
      let filename = '';
      let mimeType = '';

      await new Promise<void>((resolve, reject) => {
        const bb = busboy({ headers: req.headers, limits: { fileSize: 50 * 1024 * 1024 } });

        bb.on('field', (name: string, val: string) => {
          fields[name] = val;
        });

        bb.on('file', (name: string, fileStream: any, info: any) => {
          filename = info.filename || 'upload.bin';
          mimeType = info.mimeType || 'application/octet-stream';
          const chunks: Buffer[] = [];
          fileStream.on('data', (chunk: Buffer) => chunks.push(chunk));
          fileStream.on('end', () => {
            fileBuffer = Buffer.concat(chunks);
          });
        });

        bb.on('finish', () => resolve());
        bb.on('error', (err: any) => reject(err));

        if ((req as any).rawBody) {
          bb.end((req as any).rawBody);
        } else {
          req.pipe(bb);
        }
      });

      if (fileBuffer.length === 0) {
        res.status(400).json({ success: false, error: 'No file received in upload payload.' });
        return;
      }

      const shopId = fields.shopId;
      const draftId = fields.draftId || fields.orderDraftId;

      if (!shopId || !draftId) {
        res.status(400).json({ success: false, error: 'Both shopId and draftId are required.' });
        return;
      }

      // Authoritative Shop Validation (Fail Closed)
      const shopDoc = await db.collection('shops').doc(shopId).get();
      if (!shopDoc.exists) {
        res.status(404).json({ success: false, error: 'Shop does not exist.' });
        return;
      }
      const shopData = shopDoc.data();
      if (!shopData || shopData.status !== 'ACTIVE') {
        res.status(403).json({ success: false, error: 'Target shop is inactive.' });
        return;
      }
      const organizationId = shopData.organizationId;
      if (!organizationId) {
        res.status(500).json({ success: false, error: 'Shop is missing organization configuration.' });
        return;
      }

      // Authoritative Draft Verification
      const draftDoc = await db.collection('orderDrafts').doc(draftId).get();
      if (!draftDoc.exists) {
        res.status(404).json({ success: false, error: 'Order draft not found or expired.' });
        return;
      }
      const draftData = draftDoc.data() as OrderDraft;
      if (draftData.shopId !== shopId) {
        res.status(403).json({ success: false, error: 'Order draft does not belong to the requested shop.' });
        return;
      }

      // Verify Caller Ownership of Draft
      if (identity.isAuthenticated && identity.uid) {
        if (draftData.ownerUid && draftData.ownerUid !== identity.uid) {
          res.status(403).json({ success: false, error: 'Draft belongs to another user account.' });
          return;
        }
      } else if (identity.isGuest) {
        if (draftData.guestSessionId && draftData.guestSessionId !== identity.guestSessionId) {
          res.status(403).json({ success: false, error: 'Guest session does not own this order draft.' });
          return;
        }
      }

      // Check Expiration
      if (draftData.expiresAt && new Date(draftData.expiresAt).getTime() < Date.now()) {
        res.status(410).json({ success: false, error: 'Order draft has expired.' });
        return;
      }

      // Binary Magic Header & Format Validation
      const validation = validateUploadFile({
        filename,
        mimeType,
        sizeBytes: fileBuffer.length,
        bytes: fileBuffer
      });

      if (!validation.isValid) {
        res.status(400).json({ success: false, error: validation.error || 'Invalid file format.' });
        return;
      }

      const sha256 = computeSha256(fileBuffer);

      // Server-Side Page Count using pdf-lib
      let pageCount = 1;
      const detectedMime = validation.detectedMimeType || mimeType;
      if (detectedMime === 'application/pdf') {
        try {
          pageCount = await extractPdfPageCount(fileBuffer);
        } catch (pdfErr: unknown) {
          const msg = pdfErr instanceof Error ? pdfErr.message : 'Invalid PDF';
          res.status(422).json({ success: false, error: 'PDF Inspection Failed: ' + msg });
          return;
        }
      }

      const fileId = 'f_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
      const safeDisplayName = validation.safeDisplayName;
      const storageOriginalPath = 'shops/' + shopId + '/orders/' + draftId + '/files/' + fileId + '/original/' + safeDisplayName;

      const bucket = storage.bucket();
      const storageFile = bucket.file(storageOriginalPath);

      // 1. Upload bytes to Cloud Storage
      await storageFile.save(fileBuffer, {
        contentType: detectedMime,
        metadata: {
          shopId,
          orderId: draftId,
          fileId,
          sha256,
          pageCount: String(pageCount),
          ownerUid: identity.uid || '',
          guestSessionId: identity.guestSessionId || '',
          isGuest: String(identity.isGuest)
        }
      });

      // 2. Persist authoritative record in Firestore
      const fileDoc: OrderFile = {
        id: fileId,
        organizationId,
        shopId,
        orderId: draftId,
        ...(identity.uid ? { ownerUid: identity.uid } : {}),
        isGuest: identity.isGuest,
        ...(identity.guestSessionId ? { guestSessionId: identity.guestSessionId } : {}),
        originalFilename: filename,
        safeDisplayName,
        mimeType: detectedMime,
        sizeBytes: fileBuffer.length,
        sha256,
        pageCount,
        storageOriginalPath,
        processingStatus: 'READY_FOR_PRINT',
        documentAvailable: true,
        uploadedAt: new Date().toISOString(),
        purgeStatus: 'NOT_SCHEDULED'
      };

      try {
        await db.collection('orderFiles').doc(fileId).set({
          ...fileDoc,
          createdAtServer: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (firestoreErr) {
        console.error('[apiUpload] Firestore write failed. Rolling back Storage object...', firestoreErr);
        try {
          await storageFile.delete();
        } catch (delErr) {
          console.error('[apiUpload] Storage rollback error:', delErr);
        }
        res.status(500).json({
          success: false,
          error: 'Database metadata persistence failed; file upload was safely rolled back.'
        });
        return;
      }

      if (identity.newGuestSessionToken) {
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('s2p_guest_session', identity.newGuestSessionToken, {
          httpOnly: true,
          secure: isProd,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 86400 * 1000
        });
      }

      res.status(200).json({
        success: true,
        file: {
          id: fileId,
          safeDisplayName,
          mimeType: detectedMime,
          sizeBytes: fileBuffer.length,
          sha256,
          pageCount,
          processingStatus: 'READY_FOR_PRINT'
        },
        guestSessionToken: identity.newGuestSessionToken
      });
    } catch (err: unknown) {
      console.error('[apiUpload Error]:', err);
      const msg = err instanceof Error ? err.message : 'Upload processing failed.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);

/**
 * 3. Authoritative File Deletion API
 * DELETE or POST /api/upload-delete
 */
export const apiUploadDelete = onRequest(
  { cors: true, memory: '256MiB' },
  async (req, res) => {
    if (req.method !== 'DELETE' && req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed. Use DELETE or POST.' });
      return;
    }

    try {
      const { db, storage } = getFirebaseAdminServices();
      const identity = await resolveCallerIdentity(req);
      const fileId = (req.query.fileId as string) || (req.body && req.body.fileId);

      if (!fileId || typeof fileId !== 'string') {
        res.status(400).json({ success: false, error: 'fileId is required.' });
        return;
      }

      const docRef = db.collection('orderFiles').doc(fileId);
      const snap = await docRef.get();

      if (!snap.exists) {
        res.status(404).json({ success: false, error: 'File record not found.' });
        return;
      }

      const fileData = snap.data() as OrderFile;

      // Verify Caller Ownership
      if (identity.isAuthenticated && identity.uid) {
        if (fileData.ownerUid && fileData.ownerUid !== identity.uid) {
          res.status(403).json({ success: false, error: 'Unauthorized: this file belongs to another user.' });
          return;
        }
      } else if (identity.isGuest) {
        if (fileData.guestSessionId !== identity.guestSessionId) {
          res.status(403).json({ success: false, error: 'Unauthorized: guest session does not own this file.' });
          return;
        }
      }

      // Delete Storage Object
      if (fileData.storageOriginalPath) {
        try {
          const bucket = storage.bucket();
          await bucket.file(fileData.storageOriginalPath).delete();
        } catch (storageErr: unknown) {
          const code = (storageErr as { code?: number })?.code;
          if (code !== 404) {
            console.warn('[apiUploadDelete] Storage deletion warning:', storageErr);
          }
        }
      }

      // Update Firestore Record
      await docRef.update({
        documentAvailable: false,
        purgeStatus: 'PURGED',
        purgedAt: admin.firestore.FieldValue.serverTimestamp(),
        storageOriginalPath: null,
        storageProcessedPath: null,
        previewPaths: []
      });

      res.status(200).json({
        success: true,
        message: 'File successfully deleted from cloud storage.'
      });
    } catch (err: unknown) {
      console.error('[apiUploadDelete Error]:', err);
      const msg = err instanceof Error ? err.message : 'File deletion failed.';
      res.status(500).json({ success: false, error: msg });
    }
  }
);
