import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { PRIMARY_PILOT_SHOP, OrderReview } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shopId') || PRIMARY_PILOT_SHOP.id;

    // Verify staff membership
    const memberDoc = await adminDb
      .collection('shopMembers')
      .doc(`${identity.uid}_${shopId}`)
      .get();

    if (!memberDoc.exists || memberDoc.data()?.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: 'Access denied: Active staff membership required' }, { status: 403 });
    }

    // Read reviews
    const snapshot = await adminDb
      .collection('reviews')
      .where('shopId', '==', shopId)
      .limit(200)
      .get();

    const allReviews: OrderReview[] = [];
    let sumRating = 0;
    let countRating = 0;
    let skippedCount = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    snapshot.forEach(doc => {
      const data = doc.data() as OrderReview;
      if (data.skipped) {
        skippedCount++;
      } else if (data.rating) {
        allReviews.push(data);
        sumRating += data.rating;
        countRating++;
        distribution[data.rating] = (distribution[data.rating] || 0) + 1;
      }
    });

    // Sort descending by submission date
    allReviews.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    const averageRating = countRating > 0 ? parseFloat((sumRating / countRating).toFixed(1)) : 5.0;

    return NextResponse.json({
      success: true,
      shopId,
      stats: {
        totalReviews: countRating,
        skippedCount,
        averageRating,
        distribution
      },
      reviews: allReviews
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch reviews';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
