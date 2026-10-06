import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { getActiveShopMember } from '@/server/order-service';
import { getShopDevices } from '@/server/device-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    const url = new URL(req.url);
    const shopId = url.searchParams.get('shopId');
    if (!shopId) {
      return NextResponse.json({ success: false, error: 'shopId is required.' }, { status: 400 });
    }

    await getActiveShopMember(adminDb, identity.uid, shopId);
    const devices = await getShopDevices(adminDb, shopId);
    return NextResponse.json({ success: true, devices });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch devices';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
