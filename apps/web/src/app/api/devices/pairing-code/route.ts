import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { getActiveShopMember } from '@/server/order-service';
import { generateDevicePairingCode } from '@/server/device-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const shopId = body.shopId;
    if (!shopId) {
      return NextResponse.json({ success: false, error: 'shopId is required.' }, { status: 400 });
    }

    // Role check: OWNER or MANAGER
    const member = await getActiveShopMember(adminDb, identity.uid, shopId);
    if (!['OWNER', 'MANAGER'].includes(member.role)) {
      return NextResponse.json({ success: false, error: 'Only OWNER or MANAGER can create pairing codes.' }, { status: 403 });
    }

    const result = await generateDevicePairingCode(adminDb, shopId, identity.uid);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate pairing code';
    const status = msg.includes('not found') ? 404 : msg.includes('inactive') ? 400 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
