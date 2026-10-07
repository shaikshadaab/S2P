export interface CreatePaymentOrderOptions {
  orderId: string;
  orderNumber: string;
  amountPaise: number;
  currency?: string;
  customer: {
    name: string;
    mobile: string;
    email?: string | null;
  };
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  provider: 'RAZORPAY' | 'CASHFREE';
  providerOrderId: string;
  amountPaise: number;
  currency: string;
  paymentUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ParsedWebhookEvent {
  provider: 'RAZORPAY' | 'CASHFREE';
  eventType: string;
  orderId: string;
  providerOrderId?: string;
  paymentId: string;
  amountPaise: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  rawEvent: any;
  signatureValid: boolean;
}

export interface IPaymentProvider {
  readonly providerName: 'RAZORPAY' | 'CASHFREE';
  createPaymentOrder(options: CreatePaymentOrderOptions): Promise<PaymentOrderResult>;
  verifyWebhookSignature(rawPayload: string | Buffer, signature: string, webhookSecret: string): boolean;
  parseWebhookEvent(body: any, rawPayload?: string): ParsedWebhookEvent;
}
