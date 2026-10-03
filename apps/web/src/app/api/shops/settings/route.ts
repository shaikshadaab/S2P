import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId") || req.headers.get("x-shop-id") || "shop-om-sai-001";

    const settings = store.getShopSettings(shopId);
    if (!settings) {
      return NextResponse.json({ success: false, error: "Settings not found for shop" }, { status: 404 });
    }

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const shopId = body.shopId || req.headers.get("x-shop-id") || "shop-om-sai-001";

    const updated = store.updateShopSettings(shopId, {
      autoPrintEnabled: body.autoPrintEnabled !== undefined ? Boolean(body.autoPrintEnabled) : undefined,
      manualApprovalMode: body.manualApprovalMode !== undefined ? Boolean(body.manualApprovalMode) : undefined,
      maxFileSizeMb: body.maxFileSizeMb !== undefined ? Number(body.maxFileSizeMb) : undefined,
      maxPages: body.maxPages !== undefined ? Number(body.maxPages) : undefined,
      retentionHours: body.retentionHours !== undefined ? Number(body.retentionHours) : undefined,
      allowedFileTypes: body.allowedFileTypes,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
