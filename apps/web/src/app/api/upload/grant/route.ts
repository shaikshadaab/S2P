import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { issueUploadGrant } from '@/server/upload-grant-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    const body = await req.json().catch(() => ({}));

    const result = await issueUploadGrant(adminDb, body, {
      uid: identity.uid,
      isGuest: identity.isGuest,
      guestSessionId: identity.guestSessionId
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to issue upload grant';
    const status = msg.includes('AGENT_OFFLINE') ? 503 : msg.includes('FORBIDDEN') ? 403 : msg.includes('NOT_FOUND') ? 404 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
