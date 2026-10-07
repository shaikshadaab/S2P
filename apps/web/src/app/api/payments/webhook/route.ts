import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { PaymentService } from '@/server/payments/payment-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawText = await req.text();
    let body: any = {};
    try {
      body = rawText ? JSON.parse(rawText) : {};
    } catch {
      body = {};
    }

    const { searchParams } = new URL(req.url);
    const providerParam = searchParams.get('provider')?.toUpperCase();
    const isCashfree =
      providerParam === 'CASHFREE' ||
      req.headers.get('x-cashfree-signature') !== null ||
      (body?.type && String(body.type).includes('PAYMENT_SUCCESS_WEBHOOK'));

    const gateway: 'RAZORPAY' | 'CASHFREE' = isCashfree ? 'CASHFREE' : 'RAZORPAY';

    const signature =
      req.headers.get('x-razorpay-signature') ||
      req.headers.get('x-webhook-signature') ||
      req.headers.get('x-cashfree-signature') ||
      body.signature ||
      '';

    const webhookSecret =
      process.env[gateway === 'CASHFREE' ? 'CASHFREE_WEBHOOK_SECRET' : 'RAZORPAY_WEBHOOK_SECRET'] ||
      'test_webhook_secret';

    const result = await PaymentService.processWebhook(
      adminDb,
      gateway,
      rawText || JSON.stringify(body),
      signature,
      webhookSecret
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook processing error';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
