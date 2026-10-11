import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { confirmAgentUpload } from '@/server/upload-grant-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const deviceId = req.headers.get('x-device-id');
    const deviceSecret = req.headers.get('x-device-secret');

    if (!deviceId || !deviceSecret) {
      return NextResponse.json(
        { success: false, error: 'Device credentials required (x-device-id and x-device-secret).' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const fileDoc = await confirmAgentUpload(adminDb, deviceId, deviceSecret, body);

    return NextResponse.json({
      success: true,
      file: {
        id: fileDoc.id,
        safeDisplayName: fileDoc.safeDisplayName,
        mimeType: fileDoc.mimeType,
        sizeBytes: fileDoc.sizeBytes,
        sha256: fileDoc.sha256,
        pageCount: fileDoc.pageCount,
        convertedFrom: fileDoc.convertedFrom,
        processingStatus: fileDoc.processingStatus,
        storageMode: fileDoc.storageMode
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Agent upload confirmation failed';
    const status = msg.includes('INVALID_DEVICE_CREDENTIALS') ? 401 : msg.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
