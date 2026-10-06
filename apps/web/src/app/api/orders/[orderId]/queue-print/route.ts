import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { queueOrderForPrint } from '@/server/print-job-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
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

    const result = await queueOrderForPrint(adminDb, params.orderId, identity.uid, shopId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to queue order for print';
    const status = msg.includes('UNAUTHORIZED') || msg.includes('FORBIDDEN') ? 403 : msg.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
