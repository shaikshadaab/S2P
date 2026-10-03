import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const result = store.retryOrder(orderId);

    return NextResponse.json({
      success: true,
      message: "Order queued for retry without duplicate printing",
      order: result.order,
      job: result.job,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
