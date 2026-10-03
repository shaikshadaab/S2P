import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { getCustomerStatusDisplay } from "@vintha/shared";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id;
    const order = store.getOrder(orderId);

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const shop = store.getShopById(order.shopId);
    const printJob = store.printJobs.get(order.id);
    const statusDisplay = getCustomerStatusDisplay(order.status);

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        statusDisplay,
      },
      shop: shop
        ? {
            id: shop.id,
            name: shop.name,
            address: shop.address,
            mobile: shop.mobile,
            whatsapp: shop.whatsappNumber,
          }
        : null,
      printJob: printJob
        ? {
            status: printJob.status,
            startedAt: printJob.startedAt,
            completedAt: printJob.completedAt,
            retryCount: printJob.retryCount,
          }
        : null,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
