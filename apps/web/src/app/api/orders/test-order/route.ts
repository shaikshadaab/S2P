import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { createOwnerCommissioningTestOrder } from '@/server/print-job-service';
import { PRIMARY_PILOT_SHOP } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);

    if (identity.authError) {
      return NextResponse.json(
        {
          success: false,
          error: 'AUTHENTICATION_REQUIRED',
          message: `Authentication failed: ${identity.authError}`
        },
        { status: 401 }
      );
    }

    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json(
        {
          success: false,
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required. Only authenticated shop OWNER can create commissioning test orders.'
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const shopId = body.shopId || PRIMARY_PILOT_SHOP.id;

    const result = await createOwnerCommissioningTestOrder(adminDb, identity.uid, shopId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create commissioning test order';
    const isAuth = msg.includes('UNAUTHORIZED') || msg.includes('Authentication required');
    const isForbidden = msg.includes('FORBIDDEN') || msg.includes('UNAUTHORIZED_ROLE') || msg.includes('Access denied');
    const status = isAuth ? 401 : isForbidden ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
