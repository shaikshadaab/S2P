import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { autoDispatchOrderForPrint } from '@/server/print-job-service';
import { Shop } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const identity = await authenticateOrGuest(req);
    const staffUid = identity.uid as string;
    const orderId = params.orderId;

    if (!identity.isAuthenticated || !staffUid) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED: Authentication required.' }, { status: 401 });
    }

    const result = await adminDb.runTransaction(async (transaction) => {
      const orderRef = adminDb.collection('orders').doc(orderId);
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new Error('ORDER_NOT_FOUND: Order does not exist: ' + orderId);
      }

      const order = orderDoc.data() as any;

      // Cross-shop authorization check
      const memberRef = adminDb.collection('shopMembers').doc(`${staffUid}_${order.shopId}`);
      const memberDoc = await transaction.get(memberRef);

      let isAuthorizedStaff = false;
      let staffRole = 'STAFF';

      if (memberDoc.exists) {
        const memberData = memberDoc.data();
        if (memberData?.status === 'ACTIVE' && ['OWNER', 'MANAGER', 'COUNTER_STAFF'].includes(memberData.role)) {
          isAuthorizedStaff = true;
          staffRole = memberData.role;
        }
      }

      // Allow owner override in dev testing if dev bypass
      if (!isAuthorizedStaff && process.env.NODE_ENV !== 'production' && process.env.S2P_TEST_MODE === 'true') {
        isAuthorizedStaff = true;
        staffRole = 'OWNER';
      }

      if (!isAuthorizedStaff) {
        throw new Error('FORBIDDEN: Insufficient permissions to confirm payment for this shop.');
      }

      // Idempotency: if already PAID, return current state without creating duplicate payments
      if (order.paymentStatus === 'PAID') {
        return {
          success: true,
          orderId: order.id,
          alreadyPaid: true,
          shopId: order.shopId,
          orderNumber: order.orderNumber,
          paymentStatus: 'PAID'
        };
      }

      if (order.paymentMethod !== 'MANUAL_UPI') {
        throw new Error('INVALID_PAYMENT_METHOD: Order payment method is not MANUAL_UPI.');
      }

      const nowIso = new Date().toISOString();
      const newStatus = order.status === 'RECEIVED' ? 'ACCEPTED' : order.status;
      const ref = order.manualPaymentReference || `UPI_CONFIRMED_${staffUid.slice(-6)}`;

      const timelineEvent = {
        id: 'evt_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex'),
        status: newStatus,
        timestamp: nowIso,
        actorId: staffUid,
        actorRole: staffRole,
        note: `Manual UPI payment verified and confirmed at counter by ${staffRole}.`
      };

      const updatedTimeline = [...(order.timeline || []), timelineEvent];

      // Update Order
      transaction.update(orderRef, {
        paymentStatus: 'PAID',
        status: newStatus,
        confirmedByUid: staffUid,
        confirmedAt: nowIso,
        paymentReference: ref,
        timeline: updatedTimeline,
        updatedAt: nowIso,
        updatedAtServer: FieldValue.serverTimestamp()
      });

      // Transactionally record Payment Event
      const paymentEventId = 'pevt_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      transaction.set(adminDb.collection('paymentEvents').doc(paymentEventId), {
        id: paymentEventId,
        organizationId: order.organizationId,
        shopId: order.shopId,
        orderId,
        paymentMethod: 'MANUAL_UPI',
        previousStatus: order.paymentStatus,
        newStatus: 'PAID',
        amountPaise: order.totalPaise || Math.round((order.totalAmount || 0) * 100),
        transactionId: ref,
        actorType: 'STAFF',
        actorUid: staffUid,
        actorRole: staffRole,
        reference: ref,
        createdAt: nowIso,
        createdAtServer: FieldValue.serverTimestamp()
      });

      // Transactionally record Audit Log
      const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      transaction.set(adminDb.collection('auditLogs').doc(auditId), {
        id: auditId,
        organizationId: order.organizationId,
        shopId: order.shopId,
        action: 'MANUAL_UPI_CONFIRMED',
        targetType: 'ORDER',
        targetId: orderId,
        actorId: staffUid,
        actorRole: staffRole,
        timestamp: nowIso,
        details: {
          confirmedAmountPaise: order.totalPaise,
          reference: ref,
          previousStatus: order.paymentStatus
        }
      });

      // Record Order Status History
      const historyId = 'hist_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      transaction.set(adminDb.collection('orderStatusHistory').doc(historyId), {
        id: historyId,
        organizationId: order.organizationId,
        shopId: order.shopId,
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        actorType: 'STAFF',
        actorUid: staffUid,
        actorRole: staffRole,
        reason: 'Manual UPI verified and confirmed',
        createdAt: nowIso
      });

      return {
        success: true,
        orderId: order.id,
        alreadyPaid: false,
        shopId: order.shopId,
        orderNumber: order.orderNumber,
        paymentStatus: 'PAID',
        status: newStatus
      };
    });

    // Auto-dispatch print jobs if shop settings permit it
    let dispatchResult = null;
    if (result.success && !result.alreadyPaid) {
      const shopDoc = await adminDb.collection('shops').doc(result.shopId).get();
      const shop = shopDoc.exists ? (shopDoc.data() as Shop) : null;
      const isAutoMode = shop?.settings?.autoQueuePaidOrders !== false;

      if (isAutoMode) {
        try {
          dispatchResult = await autoDispatchOrderForPrint(adminDb, result.orderId, result.shopId);
        } catch (err: any) {
          console.error('Auto dispatch error after manual UPI confirmation:', err?.message);
        }
      }
    }

    return NextResponse.json({
      ...result,
      autoDispatched: Boolean(dispatchResult?.success),
      jobIds: dispatchResult?.jobIds || (dispatchResult?.jobId ? [dispatchResult.jobId] : [])
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to confirm manual UPI payment';
    const status = msg.includes('ORDER_NOT_FOUND') ? 404 : msg.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}