import {
  getGuestSessionSecret,
  createGuestSessionToken,
  verifyGuestSessionToken
} from '@s2p/shared';
import { adminAuth, adminDb } from '../firebase/admin';

export interface VerifiedIdentity {
  isAuthenticated: boolean;
  uid?: string;
  isGuest: boolean;
  guestSessionId?: string;
  newGuestSessionToken?: string;
}

export { createGuestSessionToken, verifyGuestSessionToken, getGuestSessionSecret };

/**
 * Derives authoritative caller identity from the request.
 * NEVER trusts client-submitted ownerUid in form data.
 */
export async function authenticateOrGuest(req: Request): Promise<VerifiedIdentity> {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7).trim();
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return {
        isAuthenticated: true,
        uid: decoded.uid,
        isGuest: false
      };
    } catch {
      // Invalid Firebase ID token; fall through to guest session check
    }
  }

  // Check guest session token from header or cookie
  const guestHeader = req.headers.get('x-guest-session-token');
  if (guestHeader) {
    const verifiedGuestId = verifyGuestSessionToken(guestHeader);
    if (verifiedGuestId) {
      return {
        isAuthenticated: false,
        isGuest: true,
        guestSessionId: verifiedGuestId
      };
    }
  }

  // Check cookie
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/s2p_guest_session=([^;]+)/);
  if (match) {
    const verifiedGuestId = verifyGuestSessionToken(match[1]);
    if (verifiedGuestId) {
      return {
        isAuthenticated: false,
        isGuest: true,
        guestSessionId: verifiedGuestId
      };
    }
  }

  // Issue new cryptographically secure guest session
  const newSession = createGuestSessionToken();
  return {
    isAuthenticated: false,
    isGuest: true,
    guestSessionId: newSession.guestSessionId,
    newGuestSessionToken: newSession.token
  };
}

/**
 * Validates that the requested shop exists and is in ACTIVE status.
 * Fails closed with NO mock or fallback shop in production.
 */
export async function validateActiveShop(shopId: string): Promise<boolean> {
  if (!shopId) return false;
  try {
    const shopSnap = await adminDb.collection('shops').doc(shopId).get();
    if (!shopSnap.exists) {
      return false;
    }
    const data = shopSnap.data();
    return Boolean(data && data.status === 'ACTIVE' && data.organizationId);
  } catch (err) {
    console.error('[validateActiveShop] Firestore lookup error, failing closed:', err);
    return false;
  }
}
