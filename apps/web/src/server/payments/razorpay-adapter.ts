import crypto from 'crypto';
import { IPaymentProvider, CreatePaymentOrderOptions, PaymentOrderResult, ParsedWebhookEvent } from './payment-provider.interface';

export class RazorpayAdapter implements IPaymentProvider {
  public readonly providerName = 'RAZORPAY' as const;

  constructor(
    private keyId?: string,
    private keySecret?: string
  ) {}

  public async createPaymentOrder(options: CreatePaymentOrderOptions): Promise<PaymentOrderResult> {
    const providerOrderId = 'order_rzp_' + options.orderId + '_' + Date.now().toString(36);
    return {
      provider: 'RAZORPAY',
      providerOrderId,
      amountPaise: options.amountPaise,
      currency: options.currency || 'INR',
      metadata: {
        keyId: this.keyId || 'mock_rzp_key',
        receipt: options.orderNumber
      }
    };
  }

  public verifyWebhookSignature(rawPayload: string | Buffer, signature: string, webhookSecret: string): boolean {
    if (!signature || !webhookSecret) return false;
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8'))
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSig);
    const incomingBuf = Buffer.from(signature);
    if (expectedBuf.length !== incomingBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, incomingBuf);
  }

  public parseWebhookEvent(body: any, rawPayload?: string): ParsedWebhookEvent {
    const eventType = body?.event || 'payment.captured';
    const payload = body?.payload?.payment?.entity || body;
    const notes = payload?.notes || body?.notes || {};

    const orderId = notes.orderId || payload.order_id || body.orderId || '';
    const paymentId = payload.id || body.paymentId || ('pay_' + Date.now().toString(36));
    const amountPaise = Number(payload.amount || body.amountPaise || 0);
    const status: 'SUCCESS' | 'FAILED' | 'PENDING' =
      eventType === 'payment.captured' || eventType === 'order.paid' || body.status === 'PAID'
        ? 'SUCCESS'
        : eventType === 'payment.failed'
        ? 'FAILED'
        : 'PENDING';

    return {
      provider: 'RAZORPAY',
      eventType,
      orderId,
      providerOrderId: payload.order_id,
      paymentId,
      amountPaise,
      status,
      rawEvent: body,
      signatureValid: true
    };
  }
}
