import crypto from 'crypto';

export function getGuestSessionSecret(): string {
  const secret = process.env.GUEST_SESSION_SECRET;
  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }

  // Strictly permit test-only secret in local test / emulator environments
  const isTestOrEmulator =
    process.env.NODE_ENV === 'test' ||
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    process.env.S2P_TEST_MODE === 'true';

  if (isTestOrEmulator) {
    return 's2p-emulator-test-guest-secret-only-not-for-prod-9988';
  }

  throw new Error(
    'FATAL SECURITY ERROR: GUEST_SESSION_SECRET is not configured in server environment. Production startup/request failed.'
  );
}

export function createGuestSessionToken(explicitSecret?: string): { guestSessionId: string; token: string } {
  const secret = explicitSecret || getGuestSessionSecret();
  const guestSessionId = 'gst_' + crypto.randomBytes(24).toString('hex');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(guestSessionId)
    .digest('hex');
  const token = guestSessionId + '.' + signature;
  return { guestSessionId, token };
}

export function verifyGuestSessionToken(token: string, explicitSecret?: string): string | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [guestSessionId, signature] = parts;
  if (!guestSessionId.startsWith('gst_') || guestSessionId.length < 20) return null;

  try {
    const secret = explicitSecret || getGuestSessionSecret();
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(guestSessionId)
      .digest('hex');

    if (
      signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return guestSessionId;
    }
  } catch {
    return null;
  }
  return null;
}
