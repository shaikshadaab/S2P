# SOS Print — API Endpoints & Contracts

All endpoints return JSON responses with standard { success: boolean, data?: any, error?: string } envelopes.

---

## 1. Customer Endpoints (High-entropy token auth)
- POST /api/draft: Initializes draft session for shakeel-online-services, returns draftId and token.
- POST /api/upload: Direct upload handler verifying mime-type magic bytes, calculating SHA-256 and page count.
- POST /api/quote: Calculates immutable authoritative quote in integer paise based on shop rates.
- POST /api/orders: Converts draft to active order with frozen quote snapshot.
- GET /api/orders/[orderId]: Scoped order tracking endpoint returning real-time status and timeline.
- POST /api/orders/[orderId]/claim-manual-paid: Customer flags that counter cash/manual UPI was paid.

## 2. Windows Agent Endpoints (Device Secret Header auth)
- POST /api/agent/pair: Exchanges 6-digit short-lived code for revocable device secret.
- POST /api/agent/heartbeat: Transmits agent liveness and installed Windows spooler queues.
- POST /api/agent/printers/sync: Updates physical printer list and driver capabilities.
- POST /api/agent/jobs/claim: Atomically leases the next eligible READY_TO_PRINT job for the paired device.
- POST /api/agent/jobs/[jobId]/renew: Renews lease duration during long downloading/spooling tasks.
- GET /api/agent/jobs/[jobId]/file: Streams the original/derivative print file to the agent over HTTPS.
- POST /api/agent/jobs/[jobId]/status: Reports terminal or intermediate print attempt status (COMPLETED, FAILED, STATUS_UNKNOWN).

## 3. Owner & Staff Endpoints (Firebase Auth Bearer token)
- GET /api/orders: Paginated orders queue with live status filter.
- POST /api/orders/[orderId]/confirm-manual-upi: Staff confirms receipt of counter payment, moving order to PAID.
- POST /api/orders/[orderId]/mark-manual-upi-not-found: Staff marks payment not received.
- POST /api/orders/[orderId]/queue-print: Manually queues paid order for printing.
- POST /api/devices/pairing-code: Generates 5-minute single-use pairing code for Windows agent.
- POST /api/devices/revoke: Revokes device access immediately.

## 4. Payment Gateway Webhook
- POST /api/payments/webhook: Idempotent raw-body signed Razorpay webhook handler. Validates HMAC signature, checks provider order ID, confirms payment capture, and transitions order fulfillment status.