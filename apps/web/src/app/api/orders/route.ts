import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import {
  createAuthoritativeOrder,
  getOrderAuthoritative,
  getShopOrdersAuthoritative
} from '@/server/order-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    const body = await req.json().catch(() => ({}));
    const result = await createAuthoritativeOrder(adminDb, body, identity);

    const response = NextResponse.json(result);
    if (identity.newGuestSessionToken) {
      response.cookies.set('s2p_guest_session', identity.newGuestSessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 7
      });
    }
    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Order creation error';
    if ((err as any)?.code === 'PRICE_CHANGED') {
      return NextResponse.json({
        success: false,
        error: 'PRICE_CHANGED',
        message: msg,
        oldTotalPaise: (err as any).oldTotalPaise,
        newTotalPaise: (err as any).newTotalPaise,
        newTotalRupees: (err as any).newTotalRupees
      }, { status: 409 });
    }
    const status = msg.includes('not found') ? 404 : (msg.includes('belongs to') || msg.includes('does not own') || msg.includes('Unauthorized') || msg.includes('FORBIDDEN')) ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    const shopId = searchParams.get('shopId');
    const identity = await authenticateOrGuest(req);

    if (orderId) {
      const order = await getOrderAuthoritative(adminDb, orderId, identity);
      return NextResponse.json({ success: true, order });
    }

    if (shopId) {
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
            message: 'Authentication required for shop orders.'
          },
          { status: 401 }
        );
      }
      const orders = await getShopOrdersAuthoritative(adminDb, shopId, identity);
      return NextResponse.json({ success: true, orders });
    }

    return NextResponse.json({ success: false, error: 'orderId or shopId required' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fetch orders error';
    const isAuth = msg.includes('UNAUTHORIZED') || msg.includes('Authentication required'); const isForbidden = msg.includes('FORBIDDEN') || msg.includes('Staff membership') || msg.includes('Access denied'); const status = msg.includes('not found') ? 404 : isAuth ? 401 : isForbidden ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
