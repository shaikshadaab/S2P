import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Order, Shop } from '@s2p/shared';
import { autoDispatchOrderForPrint } from '@/server/print-job-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderId, transactionId, amountPaise, signature, status } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
    }

    // Atomic payment confirmation via transaction
    const result = await adminDb.runTransaction(async (transaction) => {
      const orderRef = adminDb.collection('orders').doc(orderId);
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new Error('ORDER_NOT_FOUND');
      }

      const order = orderDoc.data() as Order;
      const nowIso = new Date().toISOString();

      // Idempotency check: if already PAID, return current state
      if (order.paymentStatus === 'PAID') {
        return {
          success: true,
          orderId,
          alreadyPaid: true,
          shopId: order.shopId,
          orderNumber: order.orderNumber
        };
      }

      // Record payment event
      const eventRef = adminDb.collection('paymentEvents').doc();
      transaction.set(eventRef, {
        id: eventRef.id,
        orderId: order.id,
        shopId: order.shopId,
        paymentMethod: order.paymentMethod || 'ONLINE_GATEWAY',
        status: 'PAID',
        amountPaise: amountPaise || order.pricingSnapshot?.totalPaise || 0,
        transactionId: transactionId || 'tx_' + Date.now().toString(36),
        signature: signature || 'verified_sig_' + Date.now(),
        verifiedAt: nowIso,
        createdAt: nowIso
      });

      // Update Order
      const newStatus = order.status === 'RECEIVED' ? 'ACCEPTED' : order.status;
      transaction.update(orderRef, {
        paymentStatus: 'PAID',
        status: newStatus,
        updatedAt: nowIso
      });

      return {
        success: true,
        orderId,
        alreadyPaid: false,
        shopId: order.shopId,
        orderNumber: order.orderNumber
      };
    });

    // Check shop dispatch mode: AUTO_AFTER_PAYMENT
    let autoDispatchResult = null;
    const shopDoc = await adminDb.collection('shops').doc(result.shopId).get();
    const shop = shopDoc.exists ? (shopDoc.data() as Shop) : null;
    const isAutoMode = shop?.settings?.autoQueuePaidOrders !== false; // Default true for reference flow

    if (isAutoMode) {
      try {
        autoDispatchResult = await autoDispatchOrderForPrint(adminDb, orderId, result.shopId);
      } catch (err: any) {
        console.error('Auto dispatch error:', err?.message);
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      paymentStatus: 'PAID',
      autoDispatched: Boolean(autoDispatchResult?.success),
      printJobId: autoDispatchResult?.jobId || null
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Webhook failed' }, { status: 400 });
  }
}
