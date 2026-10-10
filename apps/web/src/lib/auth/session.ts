import {
  getGuestSessionSecret,
  createGuestSessionToken,
  verifyGuestSessionToken
} from '@s2p/shared';
import { adminAuth, adminDb } from '../firebase/admin';

export interface VerifiedIdentity {
  isAuthenticated: boolean;
  uid?: string;
  email?: string;
  isGuest: boolean;
  guestSessionId?: string;
  newGuestSessionToken?: string;
  authError?: string;
}

export { createGuestSessionToken, verifyGuestSessionToken, getGuestSessionSecret };

/**
 * Derives authoritative caller identity from the request.
 * NEVER trusts client-submitted ownerUid in form data.
 * NEVER downgrades a supplied Bearer token to guest identity.
 */
export async function authenticateOrGuest(req: Request): Promise<VerifiedIdentity> {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7).trim();
    if (!idToken) {
      return {
        isAuthenticated: false,
        isGuest: false,
        authError: 'EMPTY_BEARER_TOKEN'
      };
    }

    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return {
        isAuthenticated: true,
        uid: decoded.uid,
        email: decoded.email,
        isGuest: false
      };
    } catch (err: unknown) {
      const errCode = (err as any)?.code || 'TOKEN_VERIFICATION_FAILED';
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[authenticateOrGuest] Token verification failed (${errCode}): ${errMsg}`);
      // Strict Invariant: Never downgrade an explicit Bearer token to guest
      return {
        isAuthenticated: false,
        isGuest: false,
        authError: `${errCode}: ${errMsg}`
      };
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
