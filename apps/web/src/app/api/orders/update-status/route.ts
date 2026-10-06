import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { updateOrderStatusAtomic } from '@/server/order-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    const body = await req.json().catch(() => ({}));
    const result = await updateOrderStatusAtomic(adminDb, body, identity);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Status update failed';
    const status = msg.includes('not found') ? 404 : (msg.includes('permission') || msg.includes('required')) ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
