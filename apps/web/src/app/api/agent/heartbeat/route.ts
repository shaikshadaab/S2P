import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const deviceToken = req.headers.get("x-device-token") || body.deviceToken;

    if (!deviceToken) {
      return NextResponse.json({ success: false, error: "Missing device token in header or body" }, { status: 401 });
    }

    const recorded = store.recordHeartbeat(deviceToken, body.printerName);
    return NextResponse.json({ success: recorded, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}