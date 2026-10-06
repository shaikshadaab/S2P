import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { renewPrintJobLease } from '@/server/print-job-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const deviceId = req.headers.get('x-device-id') || body.deviceId;
    const deviceSecret = req.headers.get('x-device-secret') || body.deviceSecret;
    const leaseToken = req.headers.get('x-lease-token') || body.leaseToken;
    if (!deviceId || !deviceSecret || !leaseToken) {
      return NextResponse.json({ success: false, error: 'Device credentials and leaseToken required.' }, { status: 401 });
    }
    const result = await renewPrintJobLease(adminDb, deviceId, deviceSecret, params.jobId, leaseToken);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lease renewal failed';
    const status = msg.includes('DEVICE_REVOKED') || msg.includes('FORBIDDEN_SHOP') || msg.includes('NOT_LEASE_OWNER') ? 403 : msg.includes('INVALID') ? 401 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
