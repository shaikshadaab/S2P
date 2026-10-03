import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const shopId = searchParams.get("shopId");

    let shop = slug ? store.getShopBySlug(slug) : undefined;
    if (!shop && shopId) {
      shop = store.getShopById(shopId);
    }
    if (!shop && !slug && !shopId) {
      shop = store.getShopById("shop-om-sai-001");
    }

    if (!shop) {
      return NextResponse.json({ success: false, error: "Shop not found" }, { status: 404 });
    }

    const settings = store.getShopSettings(shop.id);
    const activeDevice = Array.from(store.devices.values()).find((d) => d.shopId === shop?.id && d.isOnline);

    return NextResponse.json({
      success: true,
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
        address: shop.address,
        mobile: shop.mobile,
        whatsapp: shop.whatsappNumber,
        isOpen: shop.isOpen,
        settings: settings || {
          autoPrintEnabled: true,
          manualApprovalMode: false,
          maxFileSizeMb: 50,
          allowedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
        },
        agent: activeDevice
          ? {
              isOnline: true,
              computerName: activeDevice.computerName,
              lastSeenAt: activeDevice.lastSeenAt,
              printerName: activeDevice.defaultPrinterId || "HP51C8E5 (HP Smart Tank 580-590 series)",
            }
          : { isOnline: false },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
