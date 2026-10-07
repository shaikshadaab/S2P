import { NextRequest, NextResponse } from 'next/server';
import { adminDb, getFileStorageBucket } from '@/lib/firebase/admin';
import { ImpositionEngine, Order, OrderItem, OrderFile } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body = await req.json().catch(() => ({}));
    const { layoutMode = 'SMALL_CARD', paperSize = 'A4', orientation = 'PORTRAIT', orderItemId, itemId } = body;
    const targetItemId = orderItemId || itemId;

    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    const order = orderDoc.data() as Order;

    let itemDoc = null;
    if (targetItemId) {
      const specificDoc = await adminDb.collection('orderItems').doc(targetItemId).get();
      if (specificDoc.exists && specificDoc.data()?.orderId === orderId) {
        itemDoc = specificDoc;
      }
    }

    if (!itemDoc) {
      const itemsSnap = await adminDb.collection('orderItems').where('orderId', '==', orderId).get();
      if (itemsSnap.empty) {
        return NextResponse.json({ success: false, error: 'Order item not found' }, { status: 404 });
      }
      itemDoc = itemsSnap.docs[0];
    }
    const item = itemDoc.data() as OrderItem;

    const fileDoc = await adminDb.collection('orderFiles').doc(item.fileId).get();
    if (!fileDoc.exists) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }
    const file = fileDoc.data() as OrderFile;

    const bucket = getFileStorageBucket();
    const originalFile = bucket.file(file.storageOriginalPath || '');
    const [fileBuffer] = await originalFile.download();

    // Generate Print Master PDF
    const imposition = await ImpositionEngine.generatePrintMaster({
      frontAsset: {
        data: fileBuffer,
        mimeType: file.mimeType
      },
      backAsset: null,
      paperSize,
      layoutMode,
      orientation
    });

    // Upload Print Master PDF to Storage
    const printMasterStoragePath = `shops/${order.shopId}/orders/${order.id}/print-master/${imposition.sha256}.pdf`;
    const masterFile = bucket.file(printMasterStoragePath);
    await masterFile.save(Buffer.from(imposition.pdfBytes), {
      contentType: 'application/pdf',
      metadata: {
        sha256: imposition.sha256,
        orderId: order.id,
        layoutMode
      }
    });

    const nowIso = new Date().toISOString();
    const masterFileId = 'f_pm_' + Date.now().toString(36);

    const masterFileRecord: OrderFile = {
      id: masterFileId,
      organizationId: order.organizationId,
      shopId: order.shopId,
      orderId: order.id,
      originalFilename: 'print_master_' + layoutMode + '.pdf',
      safeDisplayName: 'Print Master (' + layoutMode + ')',
      mimeType: 'application/pdf',
      sizeBytes: imposition.sizeBytes,
      sha256: imposition.sha256,
      pageCount: imposition.pageCount,
      storageOriginalPath: printMasterStoragePath,
      storageProcessedPath: printMasterStoragePath,
      processingStatus: 'READY_FOR_PRINT',
      documentAvailable: true,
      uploadedAt: nowIso,
      readyAt: nowIso,
      purgeStatus: 'NOT_SCHEDULED'
    };

    await adminDb.collection('orderFiles').doc(masterFileId).set(masterFileRecord);

    // Update OrderItem with Print Master
    await itemDoc.ref.update({
      fileId: masterFileId,
      printMasterSnapshot: {
        printMasterFileId: masterFileId,
        storagePath: printMasterStoragePath,
        sha256: imposition.sha256,
        pageCount: imposition.pageCount,
        sizeBytes: imposition.sizeBytes,
        layoutVersion: imposition.layoutVersion,
        layoutMode: imposition.layoutMode,
        createdAt: nowIso
      }
    });

    return NextResponse.json({
      success: true,
      printMaster: {
        fileId: masterFileId,
        sha256: imposition.sha256,
        pageCount: imposition.pageCount,
        sizeBytes: imposition.sizeBytes,
        layoutMode
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Imposition failed' }, { status: 400 });
  }
}
