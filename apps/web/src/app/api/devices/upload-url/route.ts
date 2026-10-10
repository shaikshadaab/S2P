import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { getActiveShopMember } from '@/server/order-service';
import { updateDeviceUploadUrl } from '@/server/device-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const { deviceId, shopId, agentUploadUrl, testPing } = body;
    if (!deviceId || !shopId) {
      return NextResponse.json({ success: false, error: 'deviceId and shopId are required.' }, { status: 400 });
    }

    // Role check: OWNER or MANAGER
    const member = await getActiveShopMember(adminDb, identity.uid, shopId);
    if (!['OWNER', 'MANAGER'].includes(member.role)) {
      return NextResponse.json({ success: false, error: 'Only OWNER or MANAGER can configure upload endpoints.' }, { status: 403 });
    }

    const result = await updateDeviceUploadUrl(
      adminDb,
      deviceId,
      shopId,
      agentUploadUrl || '',
      Boolean(testPing)
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update device upload URL';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
