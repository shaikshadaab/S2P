import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getAuthorizedJobFile } from '@/server/print-job-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const url = new URL(req.url);
    const deviceId = req.headers.get('x-device-id') || url.searchParams.get('deviceId') || '';
    const deviceSecret = req.headers.get('x-device-secret') || url.searchParams.get('deviceSecret') || '';
    const leaseToken = req.headers.get('x-lease-token') || url.searchParams.get('leaseToken') || '';

    if (!deviceId || !deviceSecret || !leaseToken) {
      return NextResponse.json({ success: false, error: 'Device credentials and leaseToken required.' }, { status: 401 });
    }

    const { buffer, fileSnapshot, mimeType, filename, sha256 } = await getAuthorizedJobFile(
      adminDb,
      deviceId,
      deviceSecret,
      params.jobId,
      leaseToken
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'X-File-Sha256': sha256,
        'X-File-Page-Count': (fileSnapshot.pageCount || 1).toString(),
        'Cache-Control': 'no-store, private'
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'File download failed';
    const status = msg.includes('DEVICE_REVOKED') || msg.includes('FORBIDDEN_SHOP') || msg.includes('NOT_LEASE_OWNER') ? 403 : msg.includes('INVALID') ? 401 : msg.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
