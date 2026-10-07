import crypto from 'crypto';
import { IPaymentProvider, CreatePaymentOrderOptions, PaymentOrderResult, ParsedWebhookEvent } from './payment-provider.interface';

export class CashfreeAdapter implements IPaymentProvider {
  public readonly providerName = 'CASHFREE' as const;

  constructor(
    private appId?: string,
    private secretKey?: string
  ) {}

  public async createPaymentOrder(options: CreatePaymentOrderOptions): Promise<PaymentOrderResult> {
    const providerOrderId = 'cf_order_' + options.orderId + '_' + Date.now().toString(36);
    return {
      provider: 'CASHFREE',
      providerOrderId,
      amountPaise: options.amountPaise,
      currency: options.currency || 'INR',
      metadata: {
        appId: this.appId || 'mock_cf_app',
        orderExpiryMinutes: 30
      }
    };
  }

  public verifyWebhookSignature(rawPayload: string | Buffer, signature: string, webhookSecret: string): boolean {
    if (!signature || !webhookSecret) return false;
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8'))
      .digest('base64');

    const expectedBuf = Buffer.from(computedSignature);
    const incomingBuf = Buffer.from(signature);
    if (expectedBuf.length !== incomingBuf.length) {
      // Also try hex digest
      const hexSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf8'))
        .digest('hex');
      const hexBuf = Buffer.from(hexSignature);
      if (hexBuf.length === incomingBuf.length && crypto.timingSafeEqual(hexBuf, incomingBuf)) {
        return true;
      }
      return false;
    }
    return crypto.timingSafeEqual(expectedBuf, incomingBuf);
  }

  public parseWebhookEvent(body: any, rawPayload?: string): ParsedWebhookEvent {
    const data = body?.data || body;
    const orderDetails = data?.order || {};
    const paymentDetails = data?.payment || {};

    const orderId = orderDetails.order_tags?.orderId || orderDetails.order_id || body.orderId || '';
    const paymentId = paymentDetails.cf_payment_id ? String(paymentDetails.cf_payment_id) : ('cf_pay_' + Date.now().toString(36));
    const amountPaise = Math.round(Number(paymentDetails.payment_amount || orderDetails.order_amount || body.amount || 0) * 100);

    const statusStr = paymentDetails.payment_status || body.payment_status || '';
    const status: 'SUCCESS' | 'FAILED' | 'PENDING' =
      statusStr === 'SUCCESS' || body.type === 'PAYMENT_SUCCESS_WEBHOOK' || body.status === 'PAID'
        ? 'SUCCESS'
        : statusStr === 'FAILED'
        ? 'FAILED'
        : 'PENDING';

    return {
      provider: 'CASHFREE',
      eventType: body?.type || 'PAYMENT_SUCCESS_WEBHOOK',
      orderId,
      providerOrderId: orderDetails.order_id,
      paymentId,
      amountPaise,
      status,
      rawEvent: body,
      signatureValid: true
    };
  }
}
