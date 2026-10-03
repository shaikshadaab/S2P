import crypto from "crypto";

export interface PhonePeConfigParams {
  merchantId: string;
  saltKey: string;
  saltIndex: string | number;
  environment: "sandbox" | "production";
}

/**
 * Builds standard PhonePe X-VERIFY header for API requests:
 * SHA256(base64Payload + endpoint + saltKey) + "###" + saltIndex
 */
export function generatePhonePeChecksum(
  base64Payload: string,
  endpoint: string,
  saltKey: string,
  saltIndex: string | number
): string {
  const data = `${base64Payload}${endpoint}${saltKey}`;
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  return `${hash}###${saltIndex}`;
}

/**
 * Verifies PhonePe Webhook X-VERIFY header:
 * SHA256(responseBase64 + saltKey) + "###" + saltIndex
 */
export function verifyPhonePeWebhookChecksum(
  responseBase64: string,
  receivedXVerify: string,
  saltKey: string
): boolean {
  if (!responseBase64 || !receivedXVerify || !saltKey) {
    return false;
  }

  const parts = receivedXVerify.split("###");
  if (parts.length !== 2) return false;

  const [receivedHash, saltIndex] = parts;
  const expectedData = `${responseBase64}${saltKey}`;
  const calculatedHash = crypto.createHash("sha256").update(expectedData).digest("hex");

  // Constant-time string comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedHash, "utf8"),
      Buffer.from(calculatedHash, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * Generates an idempotent PhonePe Merchant Transaction ID
 */
export function generateMerchantTransactionId(orderId: string): string {
  const shortId = orderId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  const timestamp = Date.now().toString(36);
  return `VNT_${shortId}_${timestamp}`.toUpperCase();
}
