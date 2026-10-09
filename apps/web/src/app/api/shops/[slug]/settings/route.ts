import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { PRIMARY_PILOT_SHOP } from '@s2p/shared';
import { resolveAuthoritativeShopScope } from '@/server/scope-resolver';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { shopId } = resolveAuthoritativeShopScope(params.slug);
    const shopDoc = await adminDb.collection('shops').doc(shopId).get();
    
    if (!shopDoc.exists) {
      return NextResponse.json({
        success: true,
        shopId,
        settings: {
          shopName: PRIMARY_PILOT_SHOP.name,
          phone: "+91 95815 29381",
          googleReviewUrl: ""
        }
      });
    }

    const shopData = shopDoc.data();
    return NextResponse.json({
      success: true,
      shopId,
      settings: {
        shopName: shopData?.name || PRIMARY_PILOT_SHOP.name,
        phone: shopData?.phone || "+91 95815 29381",
        googleReviewUrl: shopData?.googleReviewUrl || ""
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch settings';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const identity = await authenticateOrGuest(req);
    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { shopId } = resolveAuthoritativeShopScope(params.slug);
    const memberDoc = await adminDb
      .collection('shopMembers')
      .doc(`${identity.uid}_${shopId}`)
      .get();

    if (!memberDoc.exists || memberDoc.data()?.status !== 'ACTIVE' || !['OWNER', 'MANAGER'].includes(memberDoc.data()?.role)) {
      return NextResponse.json({ success: false, error: 'Only shop OWNER or MANAGER may modify settings' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (typeof body.googleReviewUrl === 'string') {
      updateData.googleReviewUrl = body.googleReviewUrl.trim();
    }
    if (typeof body.phone === 'string') {
      updateData.phone = body.phone.trim();
    }

    await adminDb.collection('shops').doc(shopId).set(updateData, { merge: true });

    return NextResponse.json({
      success: true,
      shopId,
      settings: updateData,
      message: 'Shop settings updated successfully.'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update settings';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
