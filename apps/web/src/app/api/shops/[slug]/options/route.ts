import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getShopOptionsService } from '@/server/order-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    let shopId = slug;

    // Resolve slug if not direct shopId
    const slugDoc = await adminDb.collection('shops').where('slug', '==', slug).limit(1).get();
    if (!slugDoc.empty) {
      shopId = slugDoc.docs[0].id;
    }

    const result = await getShopOptionsService(adminDb, shopId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load shop options';
    return NextResponse.json({ success: false, error: msg }, { status: 404 });
  }
}
