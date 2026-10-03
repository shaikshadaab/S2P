import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const approvedOrder = store.approveOrder(orderId);

    return NextResponse.json({
      success: true,
      message: "Order approved and sent to print queue",
      order: approvedOrder,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
