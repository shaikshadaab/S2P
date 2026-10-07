import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { UpiPaymentUtils, Order, Shop } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 });
    }

    const order = orderDoc.data() as Order;
    if (order.paymentMethod !== 'MANUAL_UPI') {
      return NextResponse.json({ success: false, error: 'NOT_MANUAL_UPI_ORDER' }, { status: 400 });
    }

    // Load shop UPI settings from subcollection or shop doc
    const settingsDoc = await adminDb
      .collection('shops')
      .doc(order.shopId)
      .collection('paymentSettings')
      .doc('manualUpi')
      .get();

    let upiId = '';
    let payeeName = '';
    let providerLabel = 'PhonePe / UPI';
    let isEnabled = false;

    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      upiId = data?.upiId || '';
      payeeName = data?.payeeName || '';
      providerLabel = data?.providerLabel || 'PhonePe / UPI';
      isEnabled = Boolean(data?.enabled);
    } else {
      const shopDoc = await adminDb.collection('shops').doc(order.shopId).get();
      const shop = shopDoc.data() as Shop;
      if (shop?.upiConfig) {
        upiId = shop.upiConfig.upiId || '';
        payeeName = shop.upiConfig.merchantName || shop.name || '';
        providerLabel = (shop.upiConfig as any).providerLabel || 'PhonePe / UPI';
        isEnabled = Boolean(shop.upiConfig.isEnabled);
      }
    }

    if (!isEnabled || !upiId) {
      return NextResponse.json({
        success: false,
        error: 'UPI_NOT_CONFIGURED',
        message: 'Shop has not enabled or configured Manual UPI payments.'
      }, { status: 400 });
    }

    const amountRupees = order.totalPaise
      ? UpiPaymentUtils.formatPaiseToRupees(order.totalPaise)
      : (order.totalAmount || 0).toFixed(2);

    const reference = order.manualPaymentReference || UpiPaymentUtils.generateManualPaymentReference(order.orderNumber);

    const uri = UpiPaymentUtils.generateUpiPaymentUri({
      upiId,
      payeeName,
      amountRupees,
      orderToken: order.orderNumber,
      reference
    });

    const qrDataUrl = await UpiPaymentUtils.generateUpiQrDataUrl(uri);
    const qrSvg = await UpiPaymentUtils.generateUpiQrSvg(uri);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountRupees,
      upiId,
      payeeName,
      providerLabel,
      reference,
      uri,
      qrDataUrl,
      qrSvg
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate UPI QR';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}