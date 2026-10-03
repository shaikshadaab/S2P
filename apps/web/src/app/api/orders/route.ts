import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { calculatePrintMetrics, Order } from "@vintha/shared";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const shopId = body.shopId;
    const uploadId = body.uploadId || body.customerUploadId;
    const customerName = body.customerName;
    const customerMobile = body.customerMobile;
    const customerWhatsapp = body.customerWhatsapp;
    const printOptions = body.printOptions || body;

    if (!shopId || !uploadId || !customerName) {
      return NextResponse.json(
        { success: false, error: "Missing required order fields (shopId, uploadId, customerName)" },
        { status: 400 }
      );
    }

    const shop = store.getShopById(shopId);
    if (!shop || !shop.isActive) {
      return NextResponse.json({ success: false, error: "Shop is currently not accepting orders" }, { status: 400 });
    }

    const upload = store.getCustomerUpload(uploadId);
    if (!upload) {
      return NextResponse.json({ success: false, error: "Uploaded document not found" }, { status: 404 });
    }

    const copies = Math.max(1, Number(printOptions.copies) || 1);
    const colorMode = printOptions.colorMode === "color" ? "color" : "bw";
    const paperSize = printOptions.paperSize || "A4";
    const isDuplex = Boolean(printOptions.isDuplex);
    const pageRangeText = printOptions.pageRangeText || "all";

    const metrics = calculatePrintMetrics({
      totalPagesInDocument: upload.pageCount,
      pageRangeText,
      copies,
      isDuplex,
    });

    const orderId = "VNT-" + Math.random().toString(36).substring(2, 7).toUpperCase() + "-" + Date.now().toString().slice(-4);

    const orderRecord: Order = {
      id: orderId,
      shopId,
      customerUploadId: uploadId,
      customerName,
      customerMobile: customerMobile || "N/A",
      customerWhatsapp: customerWhatsapp || null,
      status: "SUBMITTED", // store.createOrder will set to QUEUED or PENDING_APPROVAL based on shop settings
      totalPages: upload.pageCount,
      printableSides: metrics.printableSides,
      physicalSheets: metrics.physicalSheets,
      copies: metrics.copies,
      colorMode,
      paperSize,
      isDuplex,
      duplexMode: isDuplex ? "long-edge" : "none",
      pagesPerSheet: metrics.pagesPerSheet,
      pageRangeText,
      idempotencyKey: `free_ord_${orderId}_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdOrder = store.createOrder(orderRecord);

    return NextResponse.json({
      success: true,
      orderId: createdOrder.id,
      status: createdOrder.status,
      order: createdOrder,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId") || "shop-om-sai-001";

    const orders = store.getOrdersByShop(shopId);
    return NextResponse.json({ success: true, count: orders.length, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
