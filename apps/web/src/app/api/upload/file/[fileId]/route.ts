import fs from 'fs';
import path from 'path';
import { BUNDLED_TEST_VISIBLE_A4_PDF_BASE64 } from '@/server/print-job-service';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getFileStorageBucket } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { OrderFile } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const identity = await authenticateOrGuest(req);
    const { fileId } = params;

    if (!fileId) {
      return NextResponse.json({ success: false, error: 'fileId is required' }, { status: 400 });
    }

    const fileDoc = await adminDb.collection('orderFiles').doc(fileId).get();
    if (!fileDoc.exists) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const fileRecord = fileDoc.data() as OrderFile;

    // Fail-Closed Access Control:
    // 1. If active staff/owner of this shop, permit access
    let isStaff = false;
    if (identity.isAuthenticated && identity.uid) {
      const memberDoc = await adminDb.collection('shopMembers').doc(`${identity.uid}_${fileRecord.shopId}`).get();
      if (memberDoc.exists && memberDoc.data()?.status === 'ACTIVE') {
        isStaff = true;
      }
    }

    // 2. If customer/guest, verify they own the draft or order
    const isCustomerOwner = (
      (identity.isAuthenticated && fileRecord.ownerUid && fileRecord.ownerUid === identity.uid) ||
      (identity.isGuest && fileRecord.guestSessionId && fileRecord.guestSessionId === identity.guestSessionId)
    );

    if (!isStaff && !isCustomerOwner) {
      return NextResponse.json({ success: false, error: 'Access denied to private document.' }, { status: 403 });
    }

    const storagePath = fileRecord.storageOriginalPath;
    if (!storagePath) {
      return NextResponse.json({ success: false, error: 'Physical storage path missing.' }, { status: 404 });
    }

    // Direct support for test documents
    if ((fileRecord as any).isTestFile || storagePath === 'system/test_visible_a4.pdf' || fileRecord.safeDisplayName === 'test_visible_a4.pdf') {
      const candidates = [
        path.join(process.cwd(), 'public', 'test_visible_a4.pdf'),
        path.join(process.cwd(), 'apps', 'web', 'public', 'test_visible_a4.pdf'),
        path.join(process.cwd(), 'test_visible_a4.pdf')
      ];
      let buffer: Buffer;
      const found = candidates.find(p => fs.existsSync(p));
      if (found) {
        buffer = fs.readFileSync(found);
      } else {
        buffer = Buffer.from(BUNDLED_TEST_VISIBLE_A4_PDF_BASE64, 'base64');
      }
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="test_visible_a4.pdf"',
          'Cache-Control': 'private, no-cache'
        }
      });
    }

    const bucket = getFileStorageBucket();
    const storageFile = bucket.file(storagePath);

    const [exists] = await storageFile.exists();
    if (!exists) {
      return NextResponse.json({ success: false, error: 'Physical storage file not found.' }, { status: 404 });
    }

    const [buffer] = await storageFile.download();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': fileRecord.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileRecord.safeDisplayName)}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Storage stream error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
