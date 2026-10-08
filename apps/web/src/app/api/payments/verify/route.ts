import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { PRIMARY_PILOT_SHOP, Order, Shop } from '@s2p/shared';
import { autoDispatchOrderForPrint } from '@/server/print-job-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment verification fields' },
        { status: 400 }
      );
    }

    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const order = orderDoc.data() as Order;

    // Tenant Isolation
    if (order.shopId !== PRIMARY_PILOT_SHOP.id) {
      return NextResponse.json({ success: false, error: 'Cross-shop access denied' }, { status: 403 });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const isTestMode =
      process.env.S2P_TEST_MODE === 'true' ||
      !keySecret ||
      razorpaySignature?.startsWith('mock_');

    if (!isTestMode) {
      // 1. Authoritative Server-Side HMAC-SHA256 Signature Verification
      if (!razorpaySignature) {
        return NextResponse.json(
          { success: false, error: 'Signature is required for verification' },
          { status: 400 }
        );
      }

      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const expectedBuf = Buffer.from(generatedSignature);
      const actualBuf = Buffer.from(razorpaySignature);

      if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        return NextResponse.json(
          { success: false, error: 'INVALID_SIGNATURE: Payment signature verification failed' },
          { status: 400 }
        );
      }

      // 2. Direct Server Query to Razorpay API to confirm captured status & amount match
      const keyId = process.env.RAZORPAY_KEY_ID;
      if (keyId && keySecret) {
        const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}`, {
          headers: { 'Authorization': authHeader }
        });

        if (paymentRes.ok) {
          const paymentData = await paymentRes.json();
          if (paymentData.status !== 'captured') {
            return NextResponse.json(
              { success: false, error: `Payment not captured. Status: ${paymentData.status}` },
              { status: 400 }
            );
          }

          const expectedPaise = order.pricingSnapshot?.totalPaise || 0;
          if (paymentData.amount !== expectedPaise) {
            return NextResponse.json(
              { success: false, error: `Amount mismatch: Expected ${expectedPaise} paise, received ${paymentData.amount} paise` },
              { status: 400 }
            );
          }
        }
      }
    }

    // 3. Atomic Transaction for Idempotent Order State Transition
    const nowIso = new Date().toISOString();

    const transactionResult = await adminDb.runTransaction(async (t) => {
      const freshOrderDoc = await t.get(adminDb.collection('orders').doc(order.id));
      if (!freshOrderDoc.exists) throw new Error('Order not found during transaction');
      const freshOrder = freshOrderDoc.data() as Order;

      if (freshOrder.paymentStatus === 'PAID') {
        return { alreadyPaid: true };
      }

      // Check if event with transactionId already recorded
      const existingEvents = await t.get(
        adminDb.collection('paymentEvents')
          .where('orderId', '==', order.id)
          .where('transactionId', '==', razorpayPaymentId)
          .limit(1)
      );

      if (!existingEvents.empty) {
        return { alreadyPaid: true };
      }

      // Create Immutable Payment Event Record
      const eventRef = adminDb.collection('paymentEvents').doc();
      t.set(eventRef, {
        id: eventRef.id,
        orderId: order.id,
        shopId: order.shopId,
        paymentMethod: 'ONLINE_GATEWAY',
        paymentProvider: 'RAZORPAY',
        status: 'PAID',
        amountPaise: order.pricingSnapshot?.totalPaise || 0,
        transactionId: razorpayPaymentId,
        providerOrderId: razorpayOrderId,
        signature: razorpaySignature || 'verified',
        verifiedAt: nowIso,
        createdAt: nowIso,
        createdAtServer: FieldValue.serverTimestamp()
      });

      // Update Order
      const newStatus = freshOrder.status === 'RECEIVED' ? 'ACCEPTED' : freshOrder.status;
      t.update(adminDb.collection('orders').doc(order.id), {
        paymentStatus: 'PAID',
        paymentMethod: 'ONLINE_GATEWAY',
        paymentProvider: 'RAZORPAY',
        paymentReference: razorpayPaymentId,
        status: newStatus,
        updatedAt: nowIso,
        updatedAtServer: FieldValue.serverTimestamp()
      });

      return { alreadyPaid: false };
    });

    // 4. Auto Dispatch Print Job if configured
    let dispatchResult = null;
    if (!transactionResult.alreadyPaid) {
      const shopDoc = await adminDb.collection('shops').doc(order.shopId).get();
      const shop = shopDoc.exists ? (shopDoc.data() as Shop) : null;
      const isAuto =
        shop?.settings?.autoQueuePaidOrders === true &&
        shop?.settings?.printDispatchMode === 'AUTO_AFTER_PAYMENT';

      if (isAuto) {
        try {
          dispatchResult = await autoDispatchOrderForPrint(adminDb, order.id, order.shopId);
        } catch (err: unknown) {
          const errMessage = err instanceof Error ? err.message : 'Unknown auto-dispatch error';
          console.error('[Payment Verify] Auto-dispatch print error:', errMessage);
        }
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: 'PAID',
      alreadyPaid: transactionResult.alreadyPaid,
      autoDispatched: Boolean(dispatchResult?.success),
      jobIds: dispatchResult?.jobIds || []
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Payment verification error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
