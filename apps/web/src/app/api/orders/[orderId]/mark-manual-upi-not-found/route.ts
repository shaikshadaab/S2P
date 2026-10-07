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

    if (!identity.isAuthenticated || !identity.uid) {
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
      const memberRef = adminDb.collection('shopMembers').doc(`${identity.uid}_${order.shopId}`);
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



      if (!isAuthorizedStaff) {
        throw new Error('FORBIDDEN: Insufficient permissions to update payment status for this shop.');
      }

      if (order.paymentStatus === 'PAID') {
        throw new Error('ALREADY_PAID: Cannot mark an already paid order as not found.');
      }

      const nowIso = new Date().toISOString();
      const timelineEvent = {
        id: 'evt_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex'),
        status: order.status,
        timestamp: nowIso,
        actorId: identity.uid,
        actorRole: staffRole,
        note: 'Staff checked UPI account / PhonePe and payment was NOT found.'
      };

      const updatedTimeline = [...(order.timeline || []), timelineEvent];

      transaction.update(orderRef, {
        paymentStatus: 'MANUAL_UPI_NOT_FOUND',
        timeline: updatedTimeline,
        updatedAt: nowIso,
        updatedAtServer: FieldValue.serverTimestamp()
      });

      // Audit Log
      const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      transaction.set(adminDb.collection('auditLogs').doc(auditId), {
        id: auditId,
        organizationId: order.organizationId,
        shopId: order.shopId,
        action: 'MANUAL_UPI_MARKED_NOT_FOUND',
        targetType: 'ORDER',
        targetId: orderId,
        actorId: identity.uid,
        actorRole: staffRole,
        timestamp: nowIso,
        details: { previousStatus: order.paymentStatus }
      });

      return {
        success: true,
        orderId,
        paymentStatus: 'MANUAL_UPI_NOT_FOUND'
      };
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to mark payment not found';
    const status = msg.includes('ORDER_NOT_FOUND') ? 404 : msg.includes('FORBIDDEN') ? 403 : 400;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}