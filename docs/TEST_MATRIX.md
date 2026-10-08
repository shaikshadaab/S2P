# SOS Print — Test Matrix & Quality Verification

## Automated Test Suites (All PASS)
1. **Node.js Suite:**
   - 207 automated tests across 5 test suites.
   - Pricing Engine (18 tests): Integer paise precision, A4/A3, B&W/color, duplex odd-page ceiling, minimum order fee, volume tier boundaries, quote expiration.
   - Security Rules (9 tests): Deny cross-tenant read/write, prevent counter staff pricing edits, verify owner privileges, customer cannot forge pricing.
   - Print Job Claim & Concurrency (Phase 5/5.1): 20-way concurrent agent lease test (exactly 1 winner), lease auto-renewal, single-use pairing codes.
   - Payment Security (Phase 6): Manual UPI validation, deterministic QR generation, payment event immutable audit trail, print dispatch blocked on unpaid orders.
2. **.NET 8 Windows Agent Suite:**
   - 7 automated xUnit tests.
   - DPAPI encryption/decryption of device credentials.
   - SQLite local journal crash recovery.
   - SHA-256 file integrity verification.
   - Spooler virtual queue filtering.
3. **Typecheck & Lint:**
   - TypeScript 	sc --noEmit across @s2p/shared, @s2p/web, and @s2p/functions: 0 errors.
   - Next.js production build: 14 static pages generated with 0 errors.