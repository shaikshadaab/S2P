# PhonePe Payment Gateway Integration Guide
> **Vintha Print Payment Architecture**

---

## 1. Operating Modes

Vintha Print supports two merchant collection architectures:

### Mode A: Platform Collection Mode (Default for Fast Onboarding)
- **Flow:** Customer payments are collected into the centralized Vintha Print master merchant account.
- **Accounting:** Shop earnings and platform fees are recorded automatically in `earnings_ledger`.
- **Settlement:** Periodic T+1 bank payouts are disbursed to the shop owner's registered bank account / UPI ID.
- **Advantage:** Print shops can start accepting online payments in 2 minutes without undergoing individual merchant gateway KYC approvals.

### Mode B: Direct Merchant Mode (For High Volume Enterprise Shops)
- **Flow:** The shop owner registers their own approved PhonePe Business Merchant Account.
- **Credentials:** Shop owner inputs their PhonePe Merchant ID, Client ID, Client Secret, and Salt Key into the dashboard under **Payment Settings**.
- **Settlement:** Funds settle directly into the shop's own bank account according to their bank agreement.

---

## 2. Environment Variables

Store credentials strictly on the server; never expose them to client-side bundles.

```env
# Mode Selection: SANDBOX or PRODUCTION
PHONEPE_ENVIRONMENT=SANDBOX

# PhonePe API Endpoints
# Sandbox: https://api-preprod.phonepe.com/apis/pg-sandbox
# Production: https://api.phonepe.com/apis/hermes
PHONEPE_HOST_URL=https://api-preprod.phonepe.com/apis/pg-sandbox

# Merchant Credentials
PHONEPE_MERCHANT_ID=PGTESTPAYUAT86
PHONEPE_SALT_KEY=96434309-7796-489d-8924-ab56988a6076
PHONEPE_SALT_INDEX=1

# Webhook Basic Auth (Optional security layer)
PHONEPE_WEBHOOK_USERNAME=vintha_webhook_user
PHONEPE_WEBHOOK_PASSWORD=replace_with_strong_secret_password
```

---

## 3. Cryptographic Signature Verification (`X-VERIFY`)

PhonePe uses SHA-256 HMAC checksum verification across API requests and webhooks.

### Payment Request Header
```
X-VERIFY = SHA256(Base64EncodedPayload + "/pg/v1/pay" + SALT_KEY) + "###" + SALT_INDEX
```

### Webhook Verification
When PhonePe dispatches an event to `/api/payments/phonepe/webhook`:
```
ExpectedHeader = SHA256(RawBody + SALT_KEY) + "###" + SALT_INDEX
```
If the calculated hash does not strictly match the incoming `X-VERIFY` header, the request is rejected with HTTP 401 Unauthorized.

---

## 4. Webhook Idempotency & Replay Protection

1. When a webhook arrives, `event_id` is queried in `webhook_events`.
2. If already processed, the endpoint returns `HTTP 200 { "received": true }` immediately without triggering duplicate state transitions or duplicate print jobs.
3. If new, the transaction status is inspected:
   - `PAYMENT_SUCCESS`: Order transitions from `AWAITING_PAYMENT` -> `PAID` -> `QUEUED`.
   - `PAYMENT_ERROR` / `PAYMENT_DECLINED`: Order transitions to `FAILED`.