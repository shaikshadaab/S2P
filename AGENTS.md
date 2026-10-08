# AGENTS.md — SOS Print System Instructions & One-Shop Scope

## 1. Permanent System Scope & Identity
- **Owner & Pilot Business:** Shakeel Online Services, Guntur, Andhra Pradesh.
- **Customer Facing Name:** **Shakeel Online Services** (strictly visible on customer pages).
- **Internal Software Name:** **SOS Print**.
- **Fixed Server Shop ID:** shakeel-online-services (PRIMARY_PILOT_SHOP.id).
- **Scope Model:** Single physical shop, one owner dashboard, optional authorized staff (cashier/operator), one existing Razorpay merchant account for this shop, one primary shop Windows PC with connected/installed printers.
- **Strict Exclusions:**
  - NO multi-shop onboarding or registration.
  - NO public owner signup (first owner bootstrapped via secure administrative script).
  - NO SaaS billing, plans, trials, or subscription tiers.
  - NO reseller, referral commission, or white-labeling features.
  - NO customer login or mobile app installation required.

---

## 2. Brand Identity & Visual Design Rules
- **Backgrounds:** Clean white / light pearl backgrounds (#ffffff, #f8fafc, #f1f5f9).
- **Accents:** Emerald green (#059669, #10b981, #047857).
- **Typography & Text:** Readable charcoal and slate (#0f172a, #334155, #475569).
- **Icons:** Simple, original Lucide icons without clutter.
- **Localization:** English and Hindi strings, structured for Telugu addition.
- **Truthful Content:** Real business details (address, phone, WhatsApp, hours, rates) are owner-configured. Never publish fabricated or dummy public values.

---

## 3. Technology Stack & Deployment
- **Customer & Staff Web App:** Next.js 14 App Router + TypeScript deployed on Vercel.
- **Backend / Metadata / Auth:** Firebase Authentication (for approved owner/staff) + Google Cloud Firestore (Admin SDK on server).
- **Document Storage:** Private Firebase Storage bucket with short-lived scoped grants and strict file lifecycle cleanup.
- **Payment Gateway:** Single Razorpay merchant account (Checkout + server-side signature verification + idempotent raw webhook processing) + Shop Counter Cash / Manual UPI confirmation.
- **Windows Tray Agent:** Supported .NET 8 LTS Windows user-session application using Windows Print Spooler / installed printer drivers with DPAPI-encrypted credentials and SQLite local journal.

---

## 4. Execution Mode Guidelines (Complete Execution Mode)
1. **Never Rebuild from Scratch:** Inspect existing codebase, preserve passing features and test suites.
2. **Sequential Phase Progression (Phase 00 – 09):** Check and verify each phase. When blocked by physical hardware (e.g., physical paper tray output, physical scanner hardware) or external credentials (e.g., Razorpay live keys, Firebase production project), clearly record the status as [STANDBY / PENDING_USER] with simple Hindi guidance, and continue all independent software/emulated work.
3. **Security Invariant:** Never log, expose, or request secrets (API keys, service account private keys, webhook secrets, passwords) in chat. Always place secrets in protected .env.local or hosting environment variables.
4. **Authoritative Status Tracking:** Maintain docs/STATUS.md, docs/PRODUCT_SPEC.md, docs/DATA_MODEL.md, docs/API.md, docs/STATES.md, docs/SETUP_HINDI.md, and docs/TEST_MATRIX.md.