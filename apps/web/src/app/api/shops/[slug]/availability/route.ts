import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { checkShopPrintingAvailability } from '@/server/order-service';
import { Shop } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Lookup shop by slug or ID
    let shopDoc = await adminDb.collection('shops').doc(slug).get();
    if (!shopDoc.exists) {
      const snap = await adminDb.collection('shops').where('slug', '==', slug).limit(1).get();
      if (!snap.empty) {
        shopDoc = snap.docs[0];
      }
    }

    if (!shopDoc.exists) {
      return NextResponse.json(
        { success: false, available: false, error: 'Shop not found', message: 'Shop not found' },
        { status: 404 }
      );
    }

    const shop = shopDoc.data() as Shop;
    const availability = await checkShopPrintingAvailability(adminDb, shop.id);

    return NextResponse.json({
      success: true,
      available: availability.available,
      reason: availability.reason || null,
      message: availability.message,
      onlineDeviceCount: availability.onlineDeviceCount,
      onlinePhysicalPrinters: availability.onlinePhysicalPrinters,
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Availability check failed';
    return NextResponse.json(
      { success: false, available: false, error: msg, message: 'Printing is temporarily unavailable at this shop. Please try again shortly.' },
      { status: 500 }
    );
  }
}
