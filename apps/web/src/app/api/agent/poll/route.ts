import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

async function handlePoll(req: NextRequest) {
  try {
    let deviceToken = req.headers.get("x-device-token");

    if (!deviceToken && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      deviceToken = body.deviceToken;
    }

    if (!deviceToken) {
      return NextResponse.json({ success: false, error: "Missing device token in header or body" }, { status: 401 });
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
      return NextResponse.json({ success: false, error: "Device token revoked or invalid" }, { status: 403 });
    }

    pairedDevice.isOnline = true;
    pairedDevice.lastSeenAt = new Date().toISOString();

    // Check for next queued job for this shop with atomic lease
    const claimed = store.getNextQueuedJobForShop(pairedDevice.shopId, pairedDevice.id);

    if (!claimed) {
      return NextResponse.json({ success: true, job: null });
    }

    const { job, order, upload } = claimed;

    // Generate short-lived signed download URL (simulated 15-minute token)
    const downloadUrl = `/api/upload/download?uploadId=${upload.id}&token=${Math.random().toString(36).substring(2)}`;

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        orderId: order.id,
        fileUrl: downloadUrl,
        checksumSha256: upload.sha256Checksum,
        status: job.status,
        document: {
          originalFilename: upload.originalFilename,
          mimeType: upload.mimeType,
          fileSizeBytes: upload.fileSizeBytes,
          sha256Checksum: upload.sha256Checksum,
          downloadUrl,
          pageCount: upload.pageCount,
        },
        options: {
          printerName: "Vintha Virtual Test Spooler (PDF-to-Disk)",
          copies: order.copies,
          colorMode: order.colorMode,
          paperSize: order.paperSize,
          isDuplex: order.isDuplex,
          duplexMode: order.duplexMode,
          pagesPerSheet: order.pagesPerSheet,
          pageRangeText: order.pageRangeText,
          selectedPages: [] as number[],
        },
        printSettings: {
          copies: order.copies,
          colorMode: order.colorMode,
          paperSize: order.paperSize,
          isDuplex: order.isDuplex,
          duplexMode: order.duplexMode,
          pagesPerSheet: order.pagesPerSheet,
          pageRangeText: order.pageRangeText,
          selectedPages: [] as number[],
        },
        customerName: order.customerName,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handlePoll(req);
}

export async function POST(req: NextRequest) {
  return handlePoll(req);
}