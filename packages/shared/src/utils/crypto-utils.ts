import crypto from 'crypto';

export function calculateSha256(data: Buffer | Uint8Array | string): string {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

export const computeSha256 = calculateSha256;
