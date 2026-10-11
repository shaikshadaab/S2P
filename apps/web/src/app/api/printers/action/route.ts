import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { executeRemotePrinterAction } from '@/server/device-service';
import { PRIMARY_PILOT_SHOP } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { action, printerId, queueName, shopId, force, replacementPrinterId } = body;

    const targetShopId = shopId || PRIMARY_PILOT_SHOP.id;

    if (!action) {
      return NextResponse.json({ success: false, error: 'action is required.' }, { status: 400 });
    }

    const result = await executeRemotePrinterAction(adminDb, targetShopId, identity.uid, {
      action,
      printerId,
      queueName,
      force,
      replacementPrinterId
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Printer action failed';
    const isOffline = msg.includes('AGENT_OFFLINE') || msg.includes('AGENT_ENDPOINT_UNAVAILABLE');
    const isAuth = msg.includes('UNAUTHORIZED');
    const status = isAuth ? 403 : isOffline ? 503 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
