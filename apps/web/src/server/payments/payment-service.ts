import { Firestore, FieldValue } from 'firebase-admin/firestore';
import { IPaymentProvider } from './payment-provider.interface';
import { RazorpayAdapter } from './razorpay-adapter';
import { CashfreeAdapter } from './cashfree-adapter';
import { Order, Shop } from '@s2p/shared';
import { autoDispatchOrderForPrint } from '../print-job-service';

export class PaymentService {
  public static getProvider(gateway: 'RAZORPAY' | 'CASHFREE'): IPaymentProvider {
    if (gateway === 'CASHFREE') {
      return new CashfreeAdapter(process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);
    }
    return new RazorpayAdapter(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET);
  }

  public static async processWebhook(
    db: Firestore,
    gateway: 'RAZORPAY' | 'CASHFREE',
    rawPayload: string | Buffer,
    signature: string,
    webhookSecret: string
  ) {
    const provider = this.getProvider(gateway);

    // Verify signature
    const isMock = process.env.S2P_TEST_MODE === 'true' && (!signature || signature.startsWith('mock_'));
    if (!isMock) {
      const isValid = provider.verifyWebhookSignature(rawPayload, signature, webhookSecret);
      if (!isValid) {
        throw new Error('INVALID_WEBHOOK_SIGNATURE: Webhook signature verification failed.');
      }
    }

    const payloadObj = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : JSON.parse(rawPayload.toString('utf8'));
    const parsed = provider.parseWebhookEvent(payloadObj);

    if (!parsed.orderId) {
      throw new Error('MISSING_ORDER_ID: Unable to determine orderId from webhook payload.');
    }

    // Atomic transaction for payment recording and order transition
    const result = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc(parsed.orderId);
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new Error('ORDER_NOT_FOUND: Order does not exist: ' + parsed.orderId);
      }

      const order = orderDoc.data() as Order;
      const nowIso = new Date().toISOString();

      // Idempotency: if already PAID, return current state without re-dispatching
      if (order.paymentStatus === 'PAID') {
        return {
          success: true,
          orderId: order.id,
          alreadyPaid: true,
          shopId: order.shopId,
          orderNumber: order.orderNumber
        };
      }

      // Check if this provider event was already recorded (idempotency by event / paymentId)
      const eventQuery = db.collection('paymentEvents')
        .where('orderId', '==', order.id)
        .where('transactionId', '==', parsed.paymentId)
        .limit(1);
      const existingEvents = await transaction.get(eventQuery);
      if (!existingEvents.empty) {
        return {
          success: true,
          orderId: order.id,
          alreadyPaid: true,
          shopId: order.shopId,
          orderNumber: order.orderNumber
        };
      }

      // Record immutable Payment Event with provider details
      const eventRef = db.collection('paymentEvents').doc();
      transaction.set(eventRef, {
        id: eventRef.id,
        orderId: order.id,
        shopId: order.shopId,
        paymentMethod: 'ONLINE_GATEWAY',
        paymentProvider: gateway,
        status: parsed.status === 'SUCCESS' ? 'PAID' : 'FAILED',
        amountPaise: parsed.amountPaise || order.pricingSnapshot?.totalPaise || 0,
        transactionId: parsed.paymentId,
        providerOrderId: parsed.providerOrderId || null,
        signature: signature || 'verified',
        verifiedAt: nowIso,
        createdAt: nowIso,
        createdAtServer: FieldValue.serverTimestamp()
      });

      if (parsed.status === 'SUCCESS') {
        const newStatus = order.status === 'RECEIVED' ? 'ACCEPTED' : order.status;
        transaction.update(orderRef, {
          paymentStatus: 'PAID',
          paymentMethod: 'ONLINE_GATEWAY',
          paymentReference: parsed.paymentId,
          status: newStatus,
          updatedAt: nowIso,
          updatedAtServer: FieldValue.serverTimestamp()
        });
      }

      return {
        success: true,
        orderId: order.id,
        alreadyPaid: false,
        shopId: order.shopId,
        orderNumber: order.orderNumber,
        status: parsed.status
      };
    });

    // Auto-dispatch print jobs if shop is in auto mode and payment was successful
    let dispatchResult = null;
    if (result.status === 'SUCCESS' && !result.alreadyPaid) {
      const shopDoc = await db.collection('shops').doc(result.shopId).get();
      const shop = shopDoc.exists ? (shopDoc.data() as Shop) : null;
      const isAutoMode = shop?.settings?.autoQueuePaidOrders === true && shop?.settings?.printDispatchMode === 'AUTO_AFTER_PAYMENT';

      if (isAutoMode) {
        try {
          dispatchResult = await autoDispatchOrderForPrint(db, result.orderId, result.shopId);
        } catch (err: any) {
          console.error('Auto dispatch error after webhook:', err?.message);
        }
      }
    }

    return {
      success: true,
      orderId: result.orderId,
      paymentStatus: result.status === 'SUCCESS' ? 'PAID' : 'FAILED',
      alreadyPaid: result.alreadyPaid,
      autoDispatched: Boolean(dispatchResult?.success),
      jobIds: dispatchResult?.jobIds || (dispatchResult?.jobId ? [dispatchResult.jobId] : [])
    };
  }
}
