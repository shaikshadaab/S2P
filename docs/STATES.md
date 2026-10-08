# SOS Print — Lifecycle State Machines & Safety Invariants

SOS Print strictly isolates three independent state dimensions to prevent unauthorized printing or duplicate submissions:
1. **Processing State** (Document preparation & preflight)
2. **Payment State** (Financial settlement)
3. **Fulfillment State** (Physical print spooling & device lifecycle)

---

## 1. Processing States
DRAFT -> UPLOADING -> PREFLIGHT_VERIFIED -> QUOTED
- Stored page counts and sheet estimations are provisional until server preflight verification.
- Customer modifying files or settings invalidates stale quote snapshots.

## 2. Payment States
UNPAID -> COUNTER_REVIEW_PENDING / GATEWAY_PENDING -> PAID (or FAILED / REFUNDED)
- **Safety Invariant:** A browser payment callback or customer clicking 'I Paid' NEVER automatically sets PAID.
- COUNTER_REVIEW_PENDING requires explicit staff confirmation with operator UID and timestamp.
- Razorpay requires server-side HMAC-SHA256 signature verification and captured order matching.

## 3. Fulfillment States
BLOCKED -> READY_TO_PRINT -> PRINT_LEASED -> DOWNLOADING -> SPOOLED -> COMPLETED (or NEEDS_REVIEW)
- Print dispatch is strictly blocked unless paymentStatus === 'PAID'.
- PRINT_LEASED grants a single device an exclusive lease for 90 seconds.
- Irreversible Stage: Once the job transitions to READY_TO_PRINT or SPOOLED, crash recovery moves ambiguous states to STATUS_UNKNOWN or NEEDS_REVIEW rather than blindly resending to avoid duplicate paper output.