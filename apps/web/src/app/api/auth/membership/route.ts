import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { PRIMARY_PILOT_SHOP, ShopMember } from '@s2p/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleMembership(req);
}

export async function POST(req: NextRequest) {
  return handleMembership(req);
}

async function handleMembership(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    let token = '';

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      try {
        const body = await req.json();
        token = body.token || '';
      } catch {
        // No body
      }
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'MISSING_AUTH_TOKEN', message: 'No bearer token supplied' },
        { status: 401 }
      );
    }

    // Verify token using Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const shopId = PRIMARY_PILOT_SHOP.id;

    // Look up canonical membership: shopMembers/{userId}_{shopId}
    const membershipDocId = `${uid}_${shopId}`;
    const docRef = adminDb.collection('shopMembers').doc(membershipDocId);
    const snap = await docRef.get();

    if (!snap.exists) {
      // Also query by userId and shopId in case doc ID differs
      const querySnap = await adminDb
        .collection('shopMembers')
        .where('userId', '==', uid)
        .where('shopId', '==', shopId)
        .limit(1)
        .get();

      if (!querySnap.empty) {
        const doc = querySnap.docs[0];
        const data = doc.data() as ShopMember;
        return NextResponse.json({
          success: true,
          member: { ...data, id: doc.id }
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: 'NO_ACTIVE_MEMBERSHIP',
          message: `User ${decodedToken.email || uid} has no membership in ${PRIMARY_PILOT_SHOP.name}`
        },
        { status: 403 }
      );
    }

    const data = snap.data() as ShopMember;
    if (data.status !== 'ACTIVE') {
      return NextResponse.json(
        {
          success: false,
          error: 'MEMBERSHIP_SUSPENDED',
          message: `Membership status is ${data.status}`
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      member: { ...data, id: snap.id }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal authorization failure';
    console.error('[API /api/auth/membership] Error:', msg);
    return NextResponse.json(
      { success: false, error: 'SERVER_AUTH_ERROR', message: msg },
      { status: 500 }
    );
  }
}
