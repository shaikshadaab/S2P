import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId") || "shop-om-sai-001";

    const shop = store.getShopById(shopId);
    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });
    }

    const pairing = store.createPairingCode(shopId);
    return NextResponse.json({
      success: true,
      pairingCode: pairing.code,
      code: pairing.code,
      expiresAt: pairing.expiresAt,
      shopId: shop.id,
      shopName: shop.name,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body.code || body.pairingCode;
    const computerName = body.computerName || "Shop Windows PC";
    const osVersion = body.osVersion || body.osInfo || "Windows 11 Pro";
    const agentVersion = body.agentVersion || "1.0.0";

    if (!code) {
      return NextResponse.json({ success: false, error: "Pairing code is required" }, { status: 400 });
    }

    const { device, shop, token } = store.claimPairingCode(
      code,
      computerName,
      osVersion,
      agentVersion
    );

    return NextResponse.json({
      success: true,
      message: "Computer paired successfully with shop",
      deviceId: device.id,
      deviceToken: token,
      shopId: shop.id,
      shopName: shop.name,
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        city: shop.city,
      },
      device: {
        id: device.id,
        computerName: device.computerName,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}