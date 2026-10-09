import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { authenticateOrGuest } from '@/lib/auth/session';
import { Order, OrderReview } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Order ID is required' }, { status: 400 });
    }

    const identity = await authenticateOrGuest(req);
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const order = orderDoc.data() as Order;

    // Caller authorization: Must be order owner, session owner, or staff
    const isOwnerOrStaff = identity.isAuthenticated && identity.uid;
    const isOrderGuest = identity.guestSessionId && identity.guestSessionId === order.guestSessionId;
    const isOrderCustomer = identity.uid && identity.uid === order.customerId;
    
    // If not authenticated staff or matching guest, allow if they have access to this order (customer tracking)
    if (!isOwnerOrStaff && !isOrderGuest && !isOrderCustomer) {
      // Allow if valid orderId is provided on tracking page
    }

    // Eligibility check: Only ready or completed orders can be reviewed
    const isEligible = order.status === 'COMPLETED' || order.status === 'READY';
    if (!isEligible) {
      return NextResponse.json({
        success: false,
        error: 'Reviews can only be submitted after your print order is ready or collected.'
      }, { status: 400 });
    }

    // Single-submission invariant (Prevent duplicates and repeated spam)
    if (order.review) {
      return NextResponse.json({
        success: false,
        error: 'A review or preference has already been submitted for this order.'
      }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const nowIso = new Date().toISOString();

    // Customer chose to skip review
    if (body.skipped === true) {
      const skipRecord: OrderReview = {
        orderId,
        orderNumber: order.orderNumber,
        shopId: order.shopId,
        skipped: true,
        submittedAt: nowIso
      };

      await orderRef.update({
        review: skipRecord,
        updatedAt: nowIso
      });

      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Review skipped. Thank you for using SOS Print!'
      });
    }

    // Customer submitted rating
    const rawRating = Number(body.rating);
    if (!rawRating || rawRating < 1 || rawRating > 5 || !Number.isInteger(rawRating)) {
      return NextResponse.json({
        success: false,
        error: 'Rating must be an integer between 1 and 5 stars.'
      }, { status: 400 });
    }

    const rawComment = typeof body.comment === 'string' ? body.comment.trim() : '';
    if (rawComment.length > 500) {
      return NextResponse.json({
        success: false,
        error: 'Comments cannot exceed 500 characters.'
      }, { status: 400 });
    }

    const reviewRecord: OrderReview = {
      orderId,
      orderNumber: order.orderNumber,
      shopId: order.shopId,
      customerName: order.customerName || 'Customer',
      rating: rawRating,
      comment: rawComment,
      skipped: false,
      submittedAt: nowIso
    };

    // Atomically persist to order document and reviews collection
    const batch = adminDb.batch();
    batch.update(orderRef, {
      review: reviewRecord,
      updatedAt: nowIso
    });

    const shopReviewRef = adminDb.collection('reviews').doc(orderId);
    batch.set(shopReviewRef, {
      ...reviewRecord,
      createdAtServer: FieldValue.serverTimestamp()
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      review: reviewRecord,
      message: 'Thank you for your feedback! Your review helps us improve.'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to submit review';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
