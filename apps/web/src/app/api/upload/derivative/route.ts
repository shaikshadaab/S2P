import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getFileStorageBucket } from '@/lib/firebase/admin';
import { OrderFile } from '@s2p/shared';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileId = formData.get('fileId') as string;
    const derivativeFile = formData.get('file') as File | null;
    const metadataStr = formData.get('metadata') as string | null;

    if (!fileId || !derivativeFile) {
      return NextResponse.json({ success: false, error: 'fileId and file are required' }, { status: 400 });
    }

    const fileDoc = await adminDb.collection('orderFiles').doc(fileId).get();
    if (!fileDoc.exists) {
      return NextResponse.json({ success: false, error: 'Original file record not found' }, { status: 404 });
    }

    const origFile = fileDoc.data() as OrderFile;
    const buffer = Buffer.from(await derivativeFile.arrayBuffer());
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const bucket = getFileStorageBucket();
    const processedStoragePath = `shops/${origFile.shopId}/orders/${origFile.orderId}/processed/${sha256}.jpg`;
    const targetFile = bucket.file(processedStoragePath);

    await targetFile.save(buffer, {
      contentType: derivativeFile.type || 'image/jpeg',
      metadata: {
        originalFileId: origFile.id,
        orderId: origFile.orderId,
        sha256
      }
    });

    const nowIso = new Date().toISOString();
    let parsedMetadata = null;
    try {
      if (metadataStr) parsedMetadata = JSON.parse(metadataStr);
    } catch {}

    // Update orderFile record with derivative path while PRESERVING storageOriginalPath UNTOUCHED
    await fileDoc.ref.update({
      storageProcessedPath: processedStoragePath,
      hasDerivative: true,
      derivativeSha256: sha256,
      derivativeUpdatedAt: nowIso,
      cropMetadata: parsedMetadata || null
    });

    return NextResponse.json({
      success: true,
      fileId: origFile.id,
      storageOriginalPath: origFile.storageOriginalPath, // unchanged
      storageProcessedPath: processedStoragePath,
      derivativeSha256: sha256
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error processing derivative upload';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
