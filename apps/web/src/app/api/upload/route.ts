import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { store } from "@/lib/store";
import { CustomerUpload } from "@vintha/shared";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const shopId = (formData.get("shopId") as string) || "shop-om-sai-001";
    const explicitPageCount = parseInt(formData.get("pageCount") as string, 10);

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const settings = store.getShopSettings(shopId);
    const maxSizeBytes = (settings?.maxFileSizeMb || 50) * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { success: false, error: `File size exceeds shop limit of ${settings?.maxFileSizeMb || 50} MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256Checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // Page count detection: if PDF, estimate or use client-detected count
    let pageCount = 1;
    if (file.type === "application/pdf") {
      if (explicitPageCount && explicitPageCount > 0) {
        pageCount = explicitPageCount;
      } else {
        // Robust PDF page counter by scanning /Type /Page in PDF binary structure
        const pdfText = buffer.toString("latin1");
        const matches = pdfText.match(/\/Type\s*\/Page[^s]/g);
        pageCount = matches ? matches.length : 1;
      }
    }

    const uploadId = "upl-" + Math.random().toString(36).substring(2, 9);
    const retentionHours = settings?.retentionHours || 24;
    const expiresAt = new Date(Date.now() + retentionHours * 3600 * 1000).toISOString();

    const uploadRecord: CustomerUpload = {
      id: uploadId,
      shopId,
      filePath: `private/uploads/${shopId}/${uploadId}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      originalFilename: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
      sha256Checksum,
      pageCount,
      imageCount: file.type.startsWith("image/") ? 1 : 0,
      expiresAt,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };

    store.saveCustomerUpload(uploadRecord);

    return NextResponse.json({
      success: true,
      upload: {
        id: uploadRecord.id,
        filename: uploadRecord.originalFilename,
        sizeBytes: uploadRecord.fileSizeBytes,
        pageCount: uploadRecord.pageCount,
        mimeType: uploadRecord.mimeType,
        sha256: uploadRecord.sha256Checksum,
        expiresAt: uploadRecord.expiresAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
