import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { assignPrinterToJob } from '@/server/print-job-service';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const identity = await authenticateOrGuest(req);
    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json({ success: false, error: 'Staff authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { shopId, printerId } = body;

    if (!shopId || !printerId) {
      return NextResponse.json({ success: false, error: 'shopId and printerId are required.' }, { status: 400 });
    }

    const result = await assignPrinterToJob(
      adminDb,
      identity.uid,
      shopId,
      params.jobId,
      printerId
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to assign printer';
    const status = msg.includes('UNAUTHORIZED') ? 401 : msg.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
