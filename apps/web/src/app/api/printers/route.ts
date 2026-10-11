import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { getActiveShopMember } from '@/server/order-service';
import { Printer } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }
    const url = new URL(req.url);
    const shopId = url.searchParams.get('shopId');
    if (!shopId) {
      return NextResponse.json({ success: false, error: 'shopId is required.' }, { status: 400 });
    }

    await getActiveShopMember(adminDb, identity.uid, shopId);
    const snap = await adminDb.collection('printers')
      .where('shopId', '==', shopId)
      .orderBy('createdAt', 'desc')
      .get();

    const printers = snap.docs.map(d => d.data() as Printer);
    return NextResponse.json({ success: true, printers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch printers';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const identity = await authenticateOrGuest(req);
    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const body = await req.json();
    const { printerId, shopId, isEnabled, isDefault, isIgnored } = body;
    if (!printerId || !shopId) {
      return NextResponse.json({ success: false, error: 'printerId and shopId are required.' }, { status: 400 });
    }

    // Verify staff permissions
    const member = await getActiveShopMember(adminDb, identity.uid, shopId);
    if (member.role !== 'OWNER' && member.role !== 'MANAGER') {
      return NextResponse.json({ success: false, error: 'Owner or manager role required to manage printers.' }, { status: 403 });
    }

    const printerRef = adminDb.collection('printers').doc(printerId);
    const printerDoc = await printerRef.get();
    if (!printerDoc.exists) {
      return NextResponse.json({ success: false, error: 'Printer not found.' }, { status: 404 });
    }

    const printerData = printerDoc.data() as Printer;
    if (printerData.shopId !== shopId) {
      return NextResponse.json({ success: false, error: 'Printer does not belong to specified shop.' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      updatedAt: nowIso
    };

    if (typeof isIgnored === 'boolean') {
      updatePayload.isIgnored = isIgnored;
      if (isIgnored) {
        updatePayload.isEnabled = false;
        updatePayload.isDefault = false;
      }
    }

    if (typeof isEnabled === 'boolean') {
      updatePayload.isEnabled = isEnabled;
      if (!isEnabled) {
        updatePayload.isDefault = false;
        updatePayload.isIgnored = true;
      } else {
        updatePayload.isIgnored = false;
      }
    }

    if (isDefault === true) {
      // Must be enabled to be default
      updatePayload.isEnabled = true;
      updatePayload.isIgnored = false;
      updatePayload.isDefault = true;

      // Unset isDefault on all other printers in this shop
      const allPrintersSnap = await adminDb.collection('printers')
        .where('shopId', '==', shopId)
        .get();

      const batch = adminDb.batch();
      for (const doc of allPrintersSnap.docs) {
        if (doc.id !== printerId && doc.data().isDefault) {
          batch.update(doc.ref, { isDefault: false, updatedAt: nowIso });
        }
      }
      batch.update(printerRef, updatePayload);
      batch.update(adminDb.collection('shops').doc(shopId), {
        defaultPrinterId: printerId,
        updatedAt: nowIso
      });
      await batch.commit();
    } else {
      if (isDefault === false) {
        updatePayload.isDefault = false;
      }
      await printerRef.update(updatePayload);
    }

    const updatedDoc = await printerRef.get();
    return NextResponse.json({ success: true, printer: updatedDoc.data() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update printer';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
