import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { authenticateOrGuest } from '@/lib/auth/session';
import { PRIMARY_PILOT_SHOP } from '@s2p/shared';
import { getApps } from 'firebase-admin/app';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const hasBearer = authHeader.startsWith('Bearer ');
    const apps = getApps();
    const app = apps[0];
    const projectId = app?.options?.projectId || 'NOT_SET';
    const hasCredential = Boolean(app?.options?.credential);

    const identity = await authenticateOrGuest(req);

    let memberFound = false;
    let memberRole = null;
    let memberStatus = null;
    let firestoreReadOk = false;

    try {
      const snap = await adminDb.collection('shops').doc(PRIMARY_PILOT_SHOP.id).get();
      firestoreReadOk = snap.exists;
    } catch (e: any) {
      console.error('[Diagnostic] Firestore shop read error:', e?.message);
    }

    if (identity.isAuthenticated && identity.uid) {
      try {
        const memDocId = `${identity.uid}_${PRIMARY_PILOT_SHOP.id}`;
        const memSnap = await adminDb.collection('shopMembers').doc(memDocId).get();
        if (memSnap.exists) {
          memberFound = true;
          memberRole = memSnap.data()?.role;
          memberStatus = memSnap.data()?.status;
        } else {
          const qSnap = await adminDb.collection('shopMembers')
            .where('shopId', '==', PRIMARY_PILOT_SHOP.id)
            .where('userId', '==', identity.uid)
            .limit(1)
            .get();
          if (!qSnap.empty) {
            memberFound = true;
            memberRole = qSnap.docs[0].data()?.role;
            memberStatus = qSnap.docs[0].data()?.status;
          }
        }
      } catch (e: any) {
        console.error('[Diagnostic] Member read error:', e?.message);
      }
    }

    return NextResponse.json({
      success: true,
      diagnostic: {
        serverTime: new Date().toISOString(),
        firebaseAdmin: {
          initialized: apps.length > 0,
          projectId,
          hasCredential,
          storageBucket: app?.options?.storageBucket || 'NOT_SET'
        },
        firestore: {
          accessible: firestoreReadOk,
          pilotShopExists: firestoreReadOk
        },
        caller: {
          hasBearerHeader: hasBearer,
          isAuthenticated: identity.isAuthenticated,
          uid: identity.uid ? `${identity.uid.slice(0, 4)}...(${identity.uid.length} chars)` : null,
          email: identity.email || null,
          authError: identity.authError || null,
          memberFound,
          memberRole,
          memberStatus
        }
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
