import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const identity = await authenticateOrGuest(req);
    const orderId = params.orderId;
    const body = await req.json().catch(() => ({}));
    const utr = body.utr ? String(body.utr).trim().slice(0, 50) : null;

    const result = await adminDb.runTransaction(async (transaction) => {
      const orderRef = adminDb.collection('orders').doc(orderId);
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new Error('ORDER_NOT_FOUND: Order does not exist: ' + orderId);
      }

      const order = orderDoc.data() as any;

      // Authorization check: Customer or Staff
      let isAllowed = false;
      if (identity.isAuthenticated && identity.uid) {
        if (order.customerId === identity.uid || order.ownerUid === identity.uid) {
          isAllowed = true;
        }
      } else if (identity.isGuest && identity.guestSessionId) {
        if (order.guestSessionId === identity.guestSessionId) {
          isAllowed = true;
        }
      }

      // Allow staff access if not customer
      if (!isAllowed && identity.isAuthenticated && identity.uid) {
        const memberRef = adminDb.collection('shopMembers').doc(`${identity.uid}_${order.shopId}`);
        const memberDoc = await transaction.get(memberRef);
        if (memberDoc.exists && memberDoc.data()?.status === 'ACTIVE') {
          isAllowed = true;
        }
      }

      // In development mode, allow guest if session matches or dev testing
      if (!isAllowed && process.env.NODE_ENV !== 'production') {
        isAllowed = true;
      }

      if (!isAllowed) {
        throw new Error('UNAUTHORIZED: You are not authorized to update this order.');
      }

      // Idempotency: if already PAID, do not alter
      if (order.paymentStatus === 'PAID') {
        return {
          success: true,
          orderId: order.id,
          alreadyPaid: true,
          paymentStatus: 'PAID'
        };
      }

      if (order.paymentMethod !== 'MANUAL_UPI') {
        throw new Error('INVALID_PAYMENT_METHOD: Order payment method is not MANUAL_UPI.');
      }

      const nowIso = new Date().toISOString();
      const timelineEvent = {
        id: 'evt_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex'),
        status: order.status,
        timestamp: nowIso,
        actorId: identity.uid || (identity.guestSessionId ? 'guest_' + identity.guestSessionId.slice(-6) : 'customer'),
        actorRole: 'CUSTOMER',
        note: utr
          ? `Customer marked payment as completed via UPI (UTR / Ref: ${utr}). Awaiting shop counter confirmation.`
          : 'Customer marked payment as completed via UPI. Awaiting shop counter confirmation.'
      };

      const updatedTimeline = [...(order.timeline || []), timelineEvent];

      transaction.update(orderRef, {
        paymentStatus: 'MANUAL_UPI_REVIEW_PENDING',
        customerClaimedPaidAt: nowIso,
        customerClaimedUtr: utr,
        timeline: updatedTimeline,
        updatedAt: nowIso,
        updatedAtServer: FieldValue.serverTimestamp()
      });

      // Record payment event
      const paymentEventId = 'pevt_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      transaction.set(adminDb.collection('paymentEvents').doc(paymentEventId), {
        id: paymentEventId,
        organizationId: order.organizationId,
        shopId: order.shopId,
        orderId,
        paymentMethod: 'MANUAL_UPI',
        previousStatus: order.paymentStatus,
        newStatus: 'MANUAL_UPI_REVIEW_PENDING',
        amountPaise: order.totalPaise || Math.round((order.totalAmount || 0) * 100),
        actorType: 'CUSTOMER',
        actorUid: identity.uid || identity.guestSessionId || 'customer',
        actorRole: 'CUSTOMER',
        reference: order.manualPaymentReference || null,
        utr: utr,
        createdAt: nowIso,
        createdAtServer: FieldValue.serverTimestamp()
      });

      // Record audit log
      const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      transaction.set(adminDb.collection('auditLogs').doc(auditId), {
        id: auditId,
        organizationId: order.organizationId,
        shopId: order.shopId,
        action: 'MANUAL_UPI_CLAIMED_PAID',
        targetType: 'ORDER',
        targetId: orderId,
        actorId: identity.uid || identity.guestSessionId || 'customer',
        actorRole: 'CUSTOMER',
        timestamp: nowIso,
        details: { utr, previousStatus: order.paymentStatus }
      });

      return {
        success: true,
        orderId,
        paymentStatus: 'MANUAL_UPI_REVIEW_PENDING',
        alreadyPaid: false
      };
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record manual payment claim';
    const status = msg.includes('ORDER_NOT_FOUND') ? 404 : msg.includes('UNAUTHORIZED') ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}