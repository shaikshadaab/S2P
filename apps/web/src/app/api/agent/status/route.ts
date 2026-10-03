import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { PrintJobStatus } from "@vintha/shared";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const deviceToken = req.headers.get("x-device-token") || body.deviceToken;
    const jobId = body.jobId || body.printJobId;
    const status = body.status;
    const errorMessage = body.errorMessage || body.error;

    if (!deviceToken || !jobId || !status) {
      return NextResponse.json({ success: false, error: "Missing required status fields (deviceToken, jobId/printJobId, status)" }, { status: 400 });
    }

    // Authenticate device
    let pairedDevice;
    for (const dev of store.devices.values()) {
      if (dev.deviceTokenHash === deviceToken) {
        pairedDevice = dev;
        break;
      }
    }

    if (!pairedDevice) {
      return NextResponse.json({ success: false, error: "Unauthorized device" }, { status: 403 });
    }

    const updatedJob = store.updateJobStatus(jobId, status as PrintJobStatus, errorMessage);

    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        orderId: updatedJob.orderId,
        status: updatedJob.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}