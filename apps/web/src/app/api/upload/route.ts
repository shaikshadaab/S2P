import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  validateUploadFile,
  computeSha256,
  extractPdfPageCount,
  OrderFile,
  OrderDraft
} from '@s2p/shared';
import { adminDb, getFileStorageBucket } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Server-Side Upload Pipeline (Development & Testing Proxy)
 * Production deployments use Firebase Functions v2 'apiUpload' endpoint.
 */
export async function POST(req: NextRequest) {
  let fileId: string | null = null;

  try {
    const identity = await authenticateOrGuest(req);
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const shopId = formData.get('shopId') as string;
    const draftId = (formData.get('draftId') || formData.get('orderDraftId')) as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided in upload request.' },
        { status: 400 }
      );
    }

    if (!shopId || !draftId) {
      return NextResponse.json(
        { success: false, error: 'Both shopId and draftId are required.' },
        { status: 400 }
      );
    }

    // 1. Authoritative Shop Validation (Fail Closed)
    const shopDoc = await adminDb.collection('shops').doc(shopId).get();
    if (!shopDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Target shop does not exist.' },
        { status: 404 }
      );
    }
    const shopData = shopDoc.data();
    if (!shopData || shopData.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Target shop is currently inactive.' },
        { status: 403 }
      );
    }
    const organizationId = shopData.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Shop missing organization configuration.' },
        { status: 500 }
      );
    }

    // 2. Authoritative Draft Ownership Validation
    const draftDoc = await adminDb.collection('orderDrafts').doc(draftId).get();
    if (!draftDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Order draft not found or expired.' },
        { status: 404 }
      );
    }
    const draftData = draftDoc.data() as OrderDraft;
    if (draftData.shopId !== shopId) {
      return NextResponse.json(
        { success: false, error: 'Order draft does not belong to the requested shop.' },
        { status: 403 }
      );
    }

    // Verify ownership
    if (identity.isAuthenticated && identity.uid) {
      if (draftData.ownerUid && draftData.ownerUid !== identity.uid) {
        return NextResponse.json(
          { success: false, error: 'Order draft belongs to another user account.' },
          { status: 403 }
        );
      }
    } else if (identity.isGuest) {
      if (draftData.guestSessionId && draftData.guestSessionId !== identity.guestSessionId) {
        return NextResponse.json(
          { success: false, error: 'Guest session does not own this order draft.' },
          { status: 403 }
        );
      }
    }

    if (draftData.expiresAt && new Date(draftData.expiresAt).getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, error: 'Order draft has expired.' },
        { status: 410 }
      );
    }

    // 3. Load Bytes and Validate Magic Header
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = validateUploadFile({
      filename: file.name,
      mimeType: file.type,
      sizeBytes: buffer.length,
      bytes: buffer
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid file format or security rejection.' },
        { status: 400 }
      );
    }

    const sha256 = computeSha256(buffer);

    // 4. Server Page Count using pdf-lib
    let pageCount = 1;
    const detectedMime = validation.detectedMimeType || file.type;
    if (detectedMime === 'application/pdf') {
      try {
        pageCount = await extractPdfPageCount(buffer);
      } catch (pdfErr: unknown) {
        const msg = pdfErr instanceof Error ? pdfErr.message : 'Invalid PDF';
        return NextResponse.json(
          { success: false, error: 'PDF Inspection Failed: ' + msg },
          { status: 422 }
        );
      }
    }

    // 5. Generate Target Storage Path
    fileId = 'f_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const safeDisplayName = validation.safeDisplayName;
    const storageOriginalPath = 'shops/' + shopId + '/orders/' + draftId + '/files/' + fileId + '/original/' + safeDisplayName;

    const bucket = getFileStorageBucket();
    const storageFile = bucket.file(storageOriginalPath);

    await storageFile.save(buffer, {
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

    // 6. Authoritative Firestore Document
    const fileDoc: OrderFile = {
      id: fileId,
      organizationId,
      shopId,
      orderId: draftId,
      ...(identity.uid ? { ownerUid: identity.uid } : {}),
      isGuest: identity.isGuest,
      ...(identity.guestSessionId ? { guestSessionId: identity.guestSessionId } : {}),
      originalFilename: file.name,
      safeDisplayName,
      mimeType: detectedMime,
      sizeBytes: buffer.length,
      sha256,
      pageCount,
      storageOriginalPath,
      processingStatus: 'READY_FOR_PRINT',
      documentAvailable: true,
      uploadedAt: new Date().toISOString(),
      validatedAt: new Date().toISOString(),
      readyAt: new Date().toISOString(),
      purgeStatus: 'NOT_SCHEDULED'
    };

    try {
      await adminDb.collection('orderFiles').doc(fileId).set(fileDoc);
    } catch (firestoreErr) {
      console.error('[Upload Pipeline] Firestore write failed. Rolling back Storage object...', firestoreErr);
      try {
        await storageFile.delete();
      } catch (delErr) {
        console.error('[Upload Pipeline] Storage rollback cleanup error:', delErr);
      }
      throw new Error('Database metadata persistence failed; file upload was safely rolled back.');
    }

    const response = NextResponse.json({
      success: true,
      file: {
        id: fileId,
        safeDisplayName,
        mimeType: detectedMime,
        sizeBytes: buffer.length,
        sha256,
        pageCount,
        processingStatus: 'READY_FOR_PRINT'
      },
      guestSessionToken: identity.newGuestSessionToken
    });

    if (identity.newGuestSessionToken) {
      response.cookies.set('s2p_guest_session', identity.newGuestSessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 7
      });
    }

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload processing failed.';
    console.error('[Upload Route Error]:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * File Removal (Development Proxy)
 */
export async function DELETE(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ success: false, error: 'fileId is required.' }, { status: 400 });
    }

    const docRef = adminDb.collection('orderFiles').doc(fileId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ success: false, error: 'File record not found.' }, { status: 404 });
    }

    const fileData = snap.data() as OrderFile;

    if (!identity.isAuthenticated && identity.isGuest) {
      if (fileData.guestSessionId !== identity.guestSessionId) {
        return NextResponse.json({ success: false, error: 'Unauthorized to remove this file.' }, { status: 403 });
      }
    } else if (identity.isAuthenticated) {
      if (fileData.ownerUid !== identity.uid) {
        return NextResponse.json({ success: false, error: 'Unauthorized to remove this file.' }, { status: 403 });
      }
    }

    if (fileData.storageOriginalPath) {
      try {
        const bucket = getFileStorageBucket();
        await bucket.file(fileData.storageOriginalPath).delete();
      } catch (storageErr) {
        console.warn('[Upload DELETE] Storage delete warning:', storageErr);
      }
    }

    await docRef.update({
      documentAvailable: false,
      purgeStatus: 'PURGED',
      purgedAt: new Date().toISOString(),
      storageOriginalPath: null,
      storageProcessedPath: null,
      previewPaths: []
    });

    return NextResponse.json({ success: true, message: 'File successfully deleted from cloud storage.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'File deletion failed.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
