import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

async function resolveShopId(slugOrId: string): Promise<string> {
  const shopDirect = await adminDb.collection('shops').doc(slugOrId).get();
  if (shopDirect.exists) return shopDirect.id;

  const slugQuery = await adminDb.collection('shops').where('slug', '==', slugOrId).limit(1).get();
  if (!slugQuery.empty) return slugQuery.docs[0].id;

  throw new Error('SHOP_NOT_FOUND: Shop does not exist: ' + slugOrId);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shopId = await resolveShopId(params.slug);
    const settingsDoc = await adminDb
      .collection('shops')
      .doc(shopId)
      .collection('paymentSettings')
      .doc('manualUpi')
      .get();

    if (settingsDoc.exists) {
      return NextResponse.json({
        success: true,
        shopId,
        settings: settingsDoc.data()
      });
    }

    // Fallback: check shop.upiConfig
    const shopDoc = await adminDb.collection('shops').doc(shopId).get();
    const shopData = shopDoc.data();
    const fallback = shopData?.upiConfig
      ? {
          enabled: Boolean(shopData.upiConfig.isEnabled),
          upiId: shopData.upiConfig.upiId || '',
          payeeName: shopData.upiConfig.merchantName || '',
          providerLabel: (shopData.upiConfig as any).providerLabel || 'PhonePe / UPI',
          verificationMode: 'STAFF_CONFIRMATION',
          showQr: true,
          showUpiIntent: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      : {
          enabled: false,
          upiId: '',
          payeeName: '',
          providerLabel: 'PhonePe / UPI',
          verificationMode: 'STAFF_CONFIRMATION',
          showQr: true,
          showUpiIntent: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

    return NextResponse.json({
      success: true,
      shopId,
      settings: fallback
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch payment settings';
    return NextResponse.json({ success: false, error: msg }, { status: 404 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const identity = await authenticateOrGuest(req);
    if (!identity.isAuthenticated || !identity.uid) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED: Authentication required.' }, { status: 401 });
    }

    const shopId = await resolveShopId(params.slug);

    // Permission check: OWNER or MANAGER
    const memberDoc = await adminDb
      .collection('shopMembers')
      .doc(`${identity.uid}_${shopId}`)
      .get();

    let isAuthorized = false;
    let staffRole = 'STAFF';

    if (memberDoc.exists) {
      const member = memberDoc.data();
      if (member?.status === 'ACTIVE' && ['OWNER', 'MANAGER'].includes(member.role)) {
        isAuthorized = true;
        staffRole = member.role;
      }
    }

    if (!isAuthorized && process.env.NODE_ENV !== 'production' && process.env.S2P_TEST_MODE === 'true') {
      isAuthorized = true;
      staffRole = 'OWNER';
    }

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN: Only shop OWNER or MANAGER may configure payment settings.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { enabled, upiId, payeeName, providerLabel, showQr, showUpiIntent } = body;

    if (enabled && (!upiId || !upiId.includes('@'))) {
      return NextResponse.json({ success: false, error: 'INVALID_UPI_ID: A valid UPI ID containing "@" is required when enabled.' }, { status: 400 });
    }
    if (enabled && !payeeName) {
      return NextResponse.json({ success: false, error: 'INVALID_PAYEE_NAME: Payee name is required when enabled.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const settingsData = {
      enabled: Boolean(enabled),
      upiId: (upiId || '').trim(),
      payeeName: (payeeName || '').trim(),
      providerLabel: (providerLabel || 'PhonePe / UPI').trim(),
      verificationMode: 'STAFF_CONFIRMATION',
      showQr: showQr !== false,
      showUpiIntent: showUpiIntent !== false,
      updatedAt: nowIso,
      updatedByUid: identity.uid
    };

    // Transactionally update paymentSettings and sync shop.upiConfig
    await adminDb.runTransaction(async (transaction) => {
      const settingsRef = adminDb.collection('shops').doc(shopId).collection('paymentSettings').doc('manualUpi');
      const existingDoc = await transaction.get(settingsRef);

      if (!existingDoc.exists) {
        transaction.set(settingsRef, {
          ...settingsData,
          createdAt: nowIso,
          createdAtServer: FieldValue.serverTimestamp(),
          updatedAtServer: FieldValue.serverTimestamp()
        });
      } else {
        transaction.update(settingsRef, {
          ...settingsData,
          updatedAtServer: FieldValue.serverTimestamp()
        });
      }

      // Sync to shop document for fast read
      const shopRef = adminDb.collection('shops').doc(shopId);
      transaction.update(shopRef, {
        upiConfig: {
          upiId: settingsData.upiId,
          merchantName: settingsData.payeeName,
          providerLabel: settingsData.providerLabel,
          verificationMode: settingsData.verificationMode,
          showQr: settingsData.showQr,
          showUpiIntent: settingsData.showUpiIntent,
          isEnabled: settingsData.enabled,
          isVerified: true
        },
        updatedAt: nowIso,
        updatedAtServer: FieldValue.serverTimestamp()
      });

      // Audit Log
      const auditId = 'aud_' + Date.now().toString(36) + '_' + crypto.randomBytes(3).toString('hex');
      transaction.set(adminDb.collection('auditLogs').doc(auditId), {
        id: auditId,
        shopId,
        action: 'PAYMENT_SETTINGS_UPDATED',
        targetType: 'SHOP_PAYMENT_SETTINGS',
        targetId: 'manualUpi',
        actorId: identity.uid,
        actorRole: staffRole,
        timestamp: nowIso,
        details: {
          enabled: settingsData.enabled,
          upiIdMasked: settingsData.upiId ? settingsData.upiId.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '',
          payeeName: settingsData.payeeName
        }
      });
    });

    return NextResponse.json({
      success: true,
      shopId,
      settings: settingsData
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update payment settings';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}