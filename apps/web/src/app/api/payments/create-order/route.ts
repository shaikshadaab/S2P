import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { Order, PRIMARY_PILOT_SHOP } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    const body = await req.json().catch(() => ({}));
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
    }

    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const order = orderDoc.data() as Order;

    // Fail-closed authorization
    if (identity.isGuest && order.guestSessionId !== identity.guestSessionId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    if (identity.isAuthenticated && order.ownerUid && order.ownerUid !== identity.uid) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const totalPaise = order.totalPaise;

    let rzpOrderId: string;

    if (keyId && keySecret && process.env.S2P_TEST_MODE !== 'true') {
      // Live Razorpay API call
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader
        },
        body: JSON.stringify({
          amount: totalPaise,
          currency: 'INR',
          receipt: order.orderNumber,
          notes: {
            orderId: order.id,
            shopId: order.shopId,
            customerMobile: order.customerMobile || ''
          }
        })
      });

      if (!rzpRes.ok) {
        const errData = await rzpRes.json().catch(() => ({}));
        const errMsg = errData?.error?.description || 'Razorpay order creation failed on provider';
        return NextResponse.json({ success: false, error: errMsg }, { status: 502 });
      }

      const rzpData = await rzpRes.json();
      rzpOrderId = rzpData.id;
    } else {
      // Deterministic Mock Order for Test/Development Mode
      rzpOrderId = `order_test_${order.id}_${Date.now().toString(36)}`;
    }

    // Persist providerOrderId on Order record
    await adminDb.collection('orders').doc(order.id).update({
      providerOrderId: rzpOrderId,
      paymentMethod: 'ONLINE_GATEWAY',
      paymentProvider: 'RAZORPAY',
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      provider: 'RAZORPAY',
      keyId: keyId || 'mock_rzp_key',
      rzpOrderId,
      amountPaise: totalPaise,
      amountRupees: (totalPaise / 100).toFixed(2),
      currency: 'INR',
      shopName: PRIMARY_PILOT_SHOP.name,
      customerMobile: order.customerMobile || ''
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal payment error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
