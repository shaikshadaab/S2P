import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { createDraftService } from '@/server/order-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    const body = await req.json().catch(() => ({}));
    const shopId = body.shopId;
    const result = await createDraftService(adminDb, shopId, identity);

    const response = NextResponse.json(result);
    if (result.guestSessionToken) {
      response.cookies.set('s2p_guest_session', result.guestSessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 7
      });
    }
    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Draft creation failed.';
    const status = msg.includes('not found') ? 404 : msg.includes('inactive') ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
