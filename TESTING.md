# Testing Strategy & Acceptance Verification Plan
> **Vintha Print Quality Assurance**

---

## 1. Automated Test Suites

Vintha Print is covered by comprehensive automated tests at both the shared engine layer and the full end-to-end system layer.

### 1.1 Shared Business Logic Tests
Run unit tests with the Node.js native test runner:
```bash
npm --workspace=@vintha/shared test
```

#### Test Coverage (19 Automated Tests)
- **Order State Machine:** Enforces that orders cannot jump to `QUEUED` without being `PAID`.
- **Print Job State Machine:** Validates `QUEUED -> CLAIMED -> DOWNLOADING -> PRINTING -> COMPLETED`.
- **Customer Status Display:** Maps internal state machine codes to customer-friendly UI text.
- **Page Range Parser:**
  - Handles `"all"`, blank strings, `"odd"`, `"even"`.
  - Handles complex ranges (e.g. `"1-3,5,8-10"`).
  - Deduplicates and sorts page ranges.
  - Rejects out-of-bounds pages (e.g., page 15 on a 10-page document).
  - Rejects inverted ranges (e.g., `"5-2"`).
- **Pricing Engine Arithmetic:**
  - Standard single-sided A4 B&W calculations.
  - Minimum order floor enforcement (e.g., ₹5.00 minimum charge).
  - Duplex odd page calculations (e.g., 5 pages = 3 physical sheets).
  - Pages per sheet calculations (e.g., 2 pages per side, 4 pages per sheet).
  - Multi-copy multipliers.
  - Tax and discount adjustments.
  - Enforcement of maximum page ceilings.

---

## 2. End-to-End Automated Integration Test

Run the full end-to-end acceptance test:
```bash
node scripts/e2e-workflow.mjs
```

### Complete 10/10 Acceptance Journey
1. **Server Initialization:** Boots Next.js production build on `http://127.0.0.1:3005`.
2. **Shop Registration:** Dynamically registers a print shop (*Balaji DigiPrint*) with custom pricing rules and unique public slug.
3. **Hardware Pairing Handshake:** Generates a 6-digit one-time pairing code via the dashboard API and successfully binds the Windows Print Agent.
4. **Customer Document Upload:** Uploads a valid binary PDF document via `multipart/form-data`, validating page count and generating a SHA-256 checksum.
5. **Pricing Arithmetic:** Confirms authoritative server pricing calculation.
6. **Order Creation:** Creates an order strictly in `AWAITING_PAYMENT` status.
7. **Security Verification:** Confirms that the print agent receives zero unpaid jobs.
8. **Payment Verification:** Simulates PhonePe webhook / callback verification, transitioning the order to `PAID` and queuing the job.
9. **Hardware Job Claim & Silent Spool:** Print agent claims the job, downloads it, verifies checksum, submits to virtual spooler, and reports completion.
10. **Customer Live Tracking:** Confirms the customer order tracking endpoint reflects `COMPLETED` status with receipt metadata.

---

## 3. Manual Testing Checklist (Physical Hardware)

- [ ] Print Shop QR poster download in A4 portrait / landscape.
- [ ] Mobile scan via Android Chrome and iOS Safari.
- [ ] PDF upload via mobile file manager and gallery.
- [ ] PhonePe sandbox checkout simulation.
- [ ] Physical printer paper feed and duplex alignment.