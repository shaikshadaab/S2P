import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { Shop, ShopSettings } from "@vintha/shared";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const shopId = "shop-" + Math.random().toString(36).substring(2, 9);
    const ownerId = "owner-" + Math.random().toString(36).substring(2, 9);

    const newShop: Shop = {
      id: shopId,
      ownerId,
      slug: body.slug || "shop-" + Date.now().toString(36),
      name: body.shopName || "My Print Shop",
      businessCategory: body.businessCategory || "Print & Stationery",
      mobile: body.mobile || "9876543210",
      whatsappNumber: body.whatsappNumber || body.mobile,
      address: body.address || "Main Market",
      city: body.city || "Hyderabad",
      state: body.state || "Telangana",
      pinCode: body.pinCode || "500001",
      googleMapsUrl: body.googleMapsUrl || null,
      logoUrl: null,
      businessHours: {
        monday: { open: "09:00", close: "21:00", isClosed: false },
        tuesday: { open: "09:00", close: "21:00", isClosed: false },
        wednesday: { open: "09:00", close: "21:00", isClosed: false },
        thursday: { open: "09:00", close: "21:00", isClosed: false },
        friday: { open: "09:00", close: "21:00", isClosed: false },
        saturday: { open: "09:00", close: "21:00", isClosed: false },
        sunday: { open: "10:00", close: "18:00", isClosed: false },
      },
      isOpen: true,
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.shops.set(shopId, newShop);

    // Save Settings
    const settings: ShopSettings = {
      id: "settings-" + shopId,
      shopId,
      maxFileSizeMb: 50,
      maxPages: 250,
      allowedFileTypes: ["application/pdf", "image/jpeg", "image/png"],
      autoPrintEnabled: true,
      manualApprovalMode: false,
      jobTimeoutSeconds: 600,
      retentionHours: 24,
      lowPaperWarning: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.shopSettings.set(shopId, settings);

    return NextResponse.json({
      success: true,
      shop: newShop,
      redirectUrl: `/dashboard?shopId=${shopId}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
