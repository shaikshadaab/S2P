import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { syncDiscoveredPrinters } from '@/server/device-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const deviceId = req.headers.get('x-device-id') || body.deviceId;
    const deviceSecret = req.headers.get('x-device-secret') || body.deviceSecret;
    if (!deviceId || !deviceSecret) {
      return NextResponse.json({ success: false, error: 'Device credentials required.' }, { status: 401 });
    }
    const result = await syncDiscoveredPrinters(adminDb, deviceId, deviceSecret, body.queues || []);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Printer sync failed';
    const status = msg.includes('DEVICE_REVOKED') ? 403 : msg.includes('INVALID_DEVICE_CREDENTIALS') ? 401 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
