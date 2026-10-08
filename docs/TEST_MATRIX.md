# SOS Print — Test Matrix & Quality Verification

**Shop:** Shakeel Online Services, Guntur, Andhra Pradesh  
**Customer Brand:** Shakeel Online Services  
**Internal Product:** SOS Print  
**Git Remotes:**
- `origin`: `https://github.com/shaikshadaab/S2P.git` (branch: `main`)
- `shakeel123`: `https://github.com/shaikshadaab/shakeel123.git` (branch: `main`)

---

## 1. Automated Test Suites (All PASS)

### A. Node.js Test Suite (`npm test`)
- **Total Tests:** 215 tests across 5 test suites — 100% PASS.
- **Pricing Engine (18 tests):**
  - Integer paise precision (B&W ₹2 = 200p, Duplex ₹3 = 300p/sheet, Colour ₹10 = 1000p, Passport ₹100 = 10000p).
  - Duplex odd-page calculation (e.g. 3-page file = 2 output sheets = ₹3 + ₹2 or ₹3 sheet model; separate files never combined onto one duplex sheet).
  - Minimum order fee, volume tier boundaries, quote expiration logic.
- **Security & Authorization Rules (9 tests):**
  - Deny cross-tenant read/write.
  - Fail-closed RBAC: blocked unauthenticated requests, staff prevented from editing pricing/rates.
  - Verification that customers cannot tamper with or forge server-computed pricing.
- **Print Job Claim & Concurrency (Phase 5/5.1):**
  - 20-way concurrent agent lease test (strictly 1 winner).
  - Lease auto-renewal and heartbeat handling.
  - Expiring, single-use 6-digit agent pairing codes.
- **Payment Security & Integrity (Phase 6):**
  - Manual UPI validation (unverified UPI address disabled from customer checkout until verified).
  - Razorpay REST order generation and signature verification with `crypto.timingSafeEqual`.
  - Immutable audit trail for payment events.
  - Print dispatch strictly blocked on unpaid orders.
- **Office & Resume Document Processors (12 tests):**
  - OpenXML DOCX / PPTX text & table extraction and conversion pipeline (5 tests).
  - Multi-page ResumeEngine template rendering (3 tests).

### B. .NET 8 Windows Agent Test Suite (`dotnet test apps/agent/S2P.Agent.sln`)
- **Total Tests:** 7 automated xUnit tests — 100% PASS.
- **DPAPI Credential Storage:** Windows DPAPI `ProtectedData` encryption and decryption of local pairing credentials.
- **SQLite Local Journal:** Transaction crash recovery and lease reconciliation.
- **File Integrity:** SHA-256 checksum verification before spooling.
- **Printer Spooler Discovery:** Spooler virtual queue filtering and capability inspection.

### C. Failure Resilience & Security Suite (`scratch/test_failure_resilience.cjs`)
- **Total Tests:** 5 tests — 100% PASS.
1. Corrupted file upload rejection: 400 Bad Request on invalid PDF header / fake magic bytes.
2. Expired / forged pairing code rejection: 400 Bad Request on invalid 6-digit token.
3. Protected Dashboard API fail-closed check: 401 Unauthorized when unauthenticated, 403 Forbidden without `shopMember` role.
4. Unverified UPI address protection: `isVerified: false` enforces `isUpiAvailable: false` on customer kiosk.
5. Launch Gate enforcement: `manualPause: true` in Firestore blocks public intake until physical paper verification passes.

### D. Real Multipart PDF Pipeline Verification (`scratch/test_real_pdf_upload_flow.cjs`)
- **Status:** 100% PASS (Real 3-page vector PDF buffer: 1,788 bytes).
1. `POST /api/upload`: Multipart upload parsed, magic bytes validated, extracted page count = 3, SHA-256 = `694c1bfa...`.
2. Storage: Document metadata stored in Firestore, raw bytes saved to filesystem/cloud storage.
3. Streaming Download: `GET /api/upload/file/[fileId]` streams verified 1,788 bytes.
4. Server Quote: Computed 3 pages × 2 copies = 6 sides @ 200p = 1200 paise (₹12.00).
5. Order Creation: Order `ord_muztqy4a_32b6968e` created in `CASH_PENDING` status.

---

## 2. Compilation, Typecheck & Static Analysis
- **TypeScript:** `npm --workspace=apps/web run typecheck` — 0 errors.
- **Next.js Production Build:** `npm --workspace=apps/web run build` — 31 static & dynamic routes compiled cleanly.
  - `/` (Home)
  - `/services` (Services Catalog)
  - `/rates` (Official Rates)
  - `/how-to-print` (Printing Instructions)
  - `/about` (About Shop)
  - `/contact` (Contact & Hours)
  - `/privacy` (Privacy Policy)
  - `/terms` (Terms of Service & Refund)
  - `/s/[slug]` (Customer Kiosk & Upload Basket)
  - `/photo-studio` (Photo Sheet & Passport Studio)
  - `/resume` (6-Template Searchable Resume Builder)
  - `/scan` (Camera Document Scanner)
  - `/id-card` (ID Front & Back Card Studio)
  - `/dashboard` (Owner Operational Dashboard)
  - `/dashboard/pricing` (Real Rates Editor)
  - `/dashboard/printers` (Printer Management & Pairing)
  - `/dashboard/queue` (Print Job Queue)
  - `/dashboard/reports` (Revenue KPIs & CSV Export)
  - `/dashboard/services` (Owner Services Catalog & Hardware Mapping)
  - `/dashboard/settings` (Shop Details & Payment Settings)
  - `/print` (Print Hub & 10-Service Discovery)
  - `/dashboard/diagnostics` (System Health & Storage Checks)
  - `/api/*` (Upload, Order, Payment, Agent Pairing, Webhook routes)

---

## 3. Physical Acceptance Verification (Checklist)

| Check | Tool / Mechanism | Result | Notes |
|---|---|---|---|
| Windows Spooler Test Page | Windows Settings > Printers | [PENDING_USER] | Shop Windows PC |
| Agent Pairing | `start-agent.bat` with 6-digit code | [PENDING_USER] | Shop Windows PC |
| Agent Preflight Test Print | Dashboard > Printers > Test Print | [PENDING_USER] | Tests DPAPI + Spooler dispatch |
| Counter Cash Order Test | Mobile QR scan > Upload PDF > Cash Order | [STANDBY] | Ready to run locally or deployed |
| Counter Cash Confirmation | Dashboard > Queue > Confirm Payment | [STANDBY] | Dispatches to paired agent |
| Physical Output Verification | Inspect paper output | [PENDING_USER] | Verify margins, duplex orientation, passport photo cut guides |
