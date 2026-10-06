import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { pairAgent } from '@/server/device-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await pairAgent(adminDb, body);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Agent pairing failed';
    const status = msg.includes('expired') || msg.includes('used') || msg.includes('Invalid') ? 400 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
