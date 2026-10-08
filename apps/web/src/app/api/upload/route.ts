import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  validateUploadFile,
  computeSha256,
  extractPdfPageCount,
  OrderFile,
  OrderDraft,
  OfficeConverter
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
        { success: false, error: 'Shop organization configuration is invalid.' },
        { status: 500 }
      );
    }

    // 2. Draft Session Validation
    const draftDoc = await adminDb.collection('orderDrafts').doc(draftId).get();
    if (!draftDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Order draft not found. Session may have expired.' },
        { status: 404 }
      );
    }
    const draftData = draftDoc.data() as OrderDraft;
    if (draftData.shopId !== shopId) {
      return NextResponse.json(
        { success: false, error: 'Order draft does not belong to target shop.' },
        { status: 403 }
      );
    }
    if (draftData.organizationId !== organizationId) {
      return NextResponse.json(
        { success: false, error: 'Order draft organization mismatch.' },
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
    const rawBuffer = Buffer.from(arrayBuffer);

    const validation = validateUploadFile({
      filename: file.name,
      mimeType: file.type,
      sizeBytes: rawBuffer.length,
      bytes: rawBuffer
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid file format or security rejection.' },
        { status: 400 }
      );
    }

    let effectiveBuffer = rawBuffer;
    let detectedMime = validation.detectedMimeType || file.type;
    let pageCount = 1;
    let convertedFrom: 'DOCX' | 'PPTX' | null = null;
    let safeDisplayName = validation.safeDisplayName;

    const lowerName = file.name.toLowerCase();
    const isOffice = lowerName.endsWith('.docx') || lowerName.endsWith('.pptx');

    // 4. Automated Office Conversion Pipeline
    if (isOffice) {
      const conv = await OfficeConverter.convertToPdf(rawBuffer);
      if (!conv.success || !conv.pdfBytes) {
        return NextResponse.json(
          { success: false, error: conv.error || 'Office document conversion to PDF failed.' },
          { status: 400 }
        );
      }
      effectiveBuffer = Buffer.from(conv.pdfBytes);
      detectedMime = 'application/pdf';
      pageCount = conv.pageCount || 1;
      convertedFrom = conv.detectedFormat || null;
      safeDisplayName = safeDisplayName.replace(/\.(docx|pptx)$/i, '.pdf');
    } else if (detectedMime === 'application/pdf') {
      try {
        pageCount = await extractPdfPageCount(effectiveBuffer);
      } catch (pdfErr: unknown) {
        const msg = pdfErr instanceof Error ? pdfErr.message : 'Invalid PDF';
        return NextResponse.json(
          { success: false, error: 'PDF Inspection Failed: ' + msg },
          { status: 422 }
        );
      }
    }

    const sha256 = computeSha256(effectiveBuffer);

    // 5. Generate Target Storage Path
    fileId = 'f_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const storageOriginalPath = 'shops/' + shopId + '/orders/' + draftId + '/files/' + fileId + '/original/' + safeDisplayName;

    const bucket = getFileStorageBucket();
    const storageFile = bucket.file(storageOriginalPath);

    await storageFile.save(effectiveBuffer, {
      contentType: detectedMime,
      metadata: {
        shopId,
        orderId: draftId,
        fileId,
        sha256,
        pageCount: String(pageCount),
        convertedFrom: convertedFrom || '',
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
      sizeBytes: effectiveBuffer.length,
      sha256,
      pageCount,
      convertedFrom,
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
        sizeBytes: effectiveBuffer.length,
        sha256,
        pageCount,
        convertedFrom,
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
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: 'Upload pipeline failed: ' + errorMsg },
      { status: 500 }
    );
  }
}
