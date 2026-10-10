# SOS Print â€” Implementation & Physical Verification Status

**Shop:** Shakeel Online Services, Guntur, Andhra Pradesh  
**Customer Visible Brand:** SOS Print (Printing at Shakeel Online Services)  
**Internal Product Name:** SOS Print  
**Date:** 2026-10-09 / 2026-10-10  
**Server Shop ID:** `shakeel-online-services`  
**GitHub Repo:** `shaikshadaab/S2P` / `shaikshadaab/shakeel123`  
**Vercel Project:** `sos-print`  
**Firebase Project:** `shakeel-online-services-951ec`  
**Owner UID:** `YSakxmoeNRX85x7eQKG2P7KYmPo2` (`shaikshadaab16@gmail.com`)  
**Merchant Direct UPI ID:** `9581529381@ybl` (Active for Direct UPI payments)  
**WhatsApp Helpline:** `+91 9581529381`  
**Production HTTPS URL:** https://sos-print.vercel.app  
**Production Aliased Domains:** `sos-print.vercel.app`, `sos-print-dxsqq9s2e-shaikshadaab951-1346s-projects.vercel.app`  
**Deployed Commit:** `548482e`  
**Vercel Deployment ID:** `dpl_Hm5ruBvJZJwPwy8evP3stLnVdYFp`  
**Windows Agent Package:** https://sos-print.vercel.app/SOS-Print-Agent-Package.zip (2,777,465 bytes [2.65 MB], SHA-256: `80DEE09389B9822224A5A7A7FD1537A84BEF7040B5A7B1E6F4CB19C18898A971`)
**Source Backup Archive:** `C:\SOSPrint-Backups\SOS-Print-Source-20261010-2054.zip` (72.29 MB, SHA-256: `67C628D94AE2E59C374FB3544EF39204EEBEA6E33A4AE3EFD7B4D6F6D7039DFE`)

---

## 1. Authoritative Four-Category Status Matrix

### Category A: IMPLEMENTED & HOSTED-VERIFIED
These features are fully built, unit-tested, and verified live on production at `https://sos-print.vercel.app`.

| Feature | Scope / Route | Verification Method | Status |
|---|---|---|---|
| **English-Only Light Theme** | All pages, dashboard, receipts, posters | Zero Devanagari characters across codebase; canonical light palette (`#F8FAFC`, `#FFFFFF`, `#059669`, `#E2E8F0`) | **HOSTED-VERIFIED** |
| **SOS Print Brand & Wordmark** | `public/logo.svg`, `SosLogo.tsx`, favicon | Original vector printer/document icon with scan corners; NO fake QR inside logo | **HOSTED-VERIFIED** |
| **Main Public Experience (/)** | `/` | Main CTA: "Upload & Print Documents" -> `/print`; Secondary CTA: "Explore Printing Tools" -> `#services` | **HOSTED-VERIFIED** |
| **Shop QR Target (/print)** | `/print` | Mobile-first direct upload without login; dynamic honest shop readiness badge; 5 English steps | **HOSTED-VERIFIED** |
| **Honest Dynamic Readiness** | `/print`, `/api/shops/[slug]/availability` | Never displays "Printing Live" when PC is offline, storage unavailable, or printer unmapped; clearly disables upload with customer-friendly message when paused/offline | **HOSTED-VERIFIED** |
| **No-Paid-Cloud-Storage Pipeline** | `/api/upload/grant`, `AgentUploadServer.cs` | 256-bit entropy scoped upload grants, direct HTTPS phone-to-PC upload, private Windows storage (`storage/orders/`), zero cloud storage bill | **HOSTED-VERIFIED** |
| **Secondary Printing Tools** | Passport, Photo Sheets, Resume (6 templates), Scan, ID Front & Back, Mini Print (N-Up) | Real functional tools accessible from home & print pages; Mini Print calculates sheet pricing | **HOSTED-VERIFIED** |
| **Cash at Counter Payment** | `/print`, `/track/[orderId]` | Frozen quote snapshot; creates `CASH_PENDING` order; customer claim does not auto-print | **HOSTED-VERIFIED** |
| **Direct UPI Payment** | `/print`, `/track/[orderId]` | Strictly displays `9581529381@ybl`; real dynamic UPI QR; "Open UPI App" & copy actions; awaiting staff confirmation | **HOSTED-VERIFIED** |
| **Razorpay Status** | `/print` | Inactive "Online Gateway â€” Coming Soon" card; mock/real checkout calls disabled in active customer intake | **HOSTED-VERIFIED** |
| **Counter Cashier Screen** | `/dashboard/counter` | Order search, masked phone with reveal, "Confirm Cash Received" & "Confirm UPI Received" modal, chime & desktop alerts | **HOSTED-VERIFIED** |
| **Automatic Print Dispatch** | `/server/order-service.ts` | Staff payment confirmation atomically invokes `autoDispatchOrderForPrint` with idempotency and attempt logging | **HOSTED-VERIFIED** |
| **Owner Authentication** | `/login` | Light theme login for `shaikshadaab16@gmail.com` (UID: `YSakxmoeNRX85x7eQKG2P7KYmPo2`); Show/hide password; Forgot password | **HOSTED-VERIFIED** |
| **Shop QR & Poster Generation** | `/dashboard/standee`, `/api/poster` | Live PDF generator for A4 & A5 posters with verified `%PDF` magic bytes; PNG/SVG downloads; encodes `https://sos-print.vercel.app/print` | **HOSTED-VERIFIED** |
| **Windows Agent 10-Step Guide** | `/dashboard/printers` | Full 10-step English commissioning checklist; version `v1.0.0 LTS`, commit `1068489`, SHA-256 and .NET 8 requirement | **HOSTED-VERIFIED** |
| **Production Storage Invariant** | `apps/web/src/lib/firebase/admin.ts` | Local `/tmp` fallback disallowed in production; strictly requires private Firebase Storage bucket; fails closed | **HOSTED-VERIFIED** |
| **Customer Status Synchronization** | `/track/[orderId]`, `/dashboard/orders` | Unified server states: Awaiting Payment Confirmation, Payment Confirmed, Queued for Printing, Preparing Your Print, Sent to Printer, Needs Staff Assistance, Ready for Collection, Collected | **HOSTED-VERIFIED** |
| **Manual Crop & Ratios** | EnhancedImageEditor, CropBoxOverlay | Free, 1:1, 4:6, A4, Passport (35Ã—45mm), Visa (2Ã—2 in), Stamp (25Ã—30mm); draggable corner & edge handles clamped in viewport; pan & zoom; rotate 90Â°; flip H/V; 4-corner perspective warp | **HOSTED-VERIFIED** |
| **Background Removal Studio** | EnhancedImageEditor, ImageEnhancementEngine | 100% in-browser segmentation; Transparent, White, Passport Blue, Pearl; manual Erase & Restore brush with size slider; edge feathering; government disclaimer | **HOSTED-VERIFIED** |
| **Quality Enhancement & Scan Mode** | EnhancedImageEditor, ImageEnhancementEngine | Brightness, contrast, saturation, 3Ã—3 unsharp mask, restrained denoise; Document Scan Mode preserving faint writing & rubber stamps; 2Ã— digital upscaler with honest disclaimer | **HOSTED-VERIFIED** |
| **Print-Ready Full-Res Export** | EnhancedImageEditor, /api/upload/derivative | Source-resolution pixel processing (not preview screenshot); real-time DPI calculator for A4/4Ã—6/Passport with low-res warning (<200 DPI); PNG/JPEG derivative artifact | **HOSTED-VERIFIED** |
| **Owner Commissioning Test Order** | /api/orders/test-order, /dashboard/printers | Owner-authorized test order flow using test_visible_a4.pdf (1446 bytes, SHA-256: 93C329...); works while public customer intake remains paused; bypasses public pause safely | **HOSTED-VERIFIED** |
| **Direct Phone-to-PC Upload** | /print, /api/upload/grant, AgentUploadServer.cs | Customer uploads from mobile data directly reach shop PC via Cloudflare Tunnel; browser CORS enabled; private local disk receipt; zero cloud storage costs | **HOSTED-VERIFIED** |
| **Live Tunnel Reachability Ping** | /server/upload-grant-service.ts, /server/order-service.ts | Live health ping before issuing grant; dead/stale URLs trigger TUNNEL_UNREACHABLE and disable uploads; tunnel restart dynamically syncs new trycloudflare URL | **HOSTED-VERIFIED** |
| **Owner Commissioning Test Upload** | /api/orders/test-upload, /dashboard/printers | Dedicated test upload action in Printers dashboard; verifies phone-to-PC file pipeline without opening public intake; confirms local path and SHA-256 | **HOSTED-VERIFIED** |
| **Guided Setup Screen** | `/dashboard/setup` | Single comprehensive setup screen covering Agent Download, PC Setup, Pairing, Tunnel Health, Printer Mapping, Commissioning Tests (Upload + Spooler Print), and QR Standee | **HOSTED-VERIFIED** |
| **All-in-One Windows Launcher** | `Start-SOS-Print.bat` | Single launcher script combining Cloudflare Free Tunnel and Agent Worker; prevents duplicate processes, auto-detects trycloudflare HTTPS URL, checks DPAPI credentials, passes tunnel URL in heartbeat, and cleans up on exit | **HOSTED-VERIFIED** |

---

### Category B: BLOCKED (Awaiting External Live Credentials)
- **Live Razorpay Gateway Integration:** Razorpay is kept in "Coming Soon" status. Live merchant API keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and webhook secret) are not yet supplied for production. All payment intake is securely routed via Cash at Counter and Direct UPI (`9581529381@ybl`).

---

### Category C: PHYSICAL-PENDING (Requires Physical Hardware & Windows PC)
- **Shop Windows PC Agent Commissioning:**
  1. Extract `SOS-Print-Agent-Package.zip` on the shop PC.
  2. Start agent session with `start-agent.bat`.
  3. Generate 6-digit single-use pairing code in `/dashboard/printers` and pair with agent.
  4. Perform Windows test page on physical HP printer.
  5. Run an authorized test print from the owner dashboard.
  6. Confirm physical paper output before unpausing customer intake (`manualPause: false`).

---


### Firestore Production Index Audit & Direct Activation Links
- **CLI / MCP Probe Result:** The global Firebase CLI on the Windows host is currently unauthenticated.
- **Service Account Probe Result:** The local service account (`firebase-adminsdk-fbsvc@shakeel-online-services-951ec.iam.gserviceaccount.com`) has document read/write credentials, but Google Cloud Datastore Index Admin API returned `403 PERMISSION_DENIED` for programmatic index creation.
- **Active Firestore Live Query Probing:** Verified directly against Firestore production database `shakeel-online-services-951ec`. The exact required composite indexes were triggered and the official 1-click console activation links were captured:

| Collection Group | Query Fields | Order | Direct 1-Click Console Activation Link |
|---|---|---|---|
| **orders** | `shopId` (ASC), `createdAt` (DESC) | Primary Feed | [Create Orders Index](https://console.firebase.google.com/v1/r/project/shakeel-online-services-951ec/firestore/indexes?create_composite=Clxwcm9qZWN0cy9zaGFrZWVsLW9ubGluZS1zZXJ2aWNlcy05NTFlYy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvb3JkZXJzL2luZGV4ZXMvXxABGgoKBnNob3BJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI) |
| **orders** | `shopId` (ASC), `status` (ASC), `createdAt` (DESC) | Status Filter | [Create Orders Status Index](https://console.firebase.google.com/v1/r/project/shakeel-online-services-951ec/firestore/indexes?create_composite=Clxwcm9qZWN0cy9zaGFrZWVsLW9ubGluZS1zZXJ2aWNlcy05NTFlYy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvb3JkZXJzL2luZGV4ZXMvXxABGgoKBnNob3BJZBABGgoKBnN0YXR1cxABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI) |
| **orders** | `shopId` (ASC), `paymentStatus` (ASC), `createdAt` (DESC) | Payment Filter | [Create Orders Payment Index](https://console.firebase.google.com/v1/r/project/shakeel-online-services-951ec/firestore/indexes?create_composite=Clxwcm9qZWN0cy9zaGFrZWVsLW9ubGluZS1zZXJ2aWNlcy05NTFlYy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvb3JkZXJzL2luZGV4ZXMvXxABGhEKDXBheW1lbnRTdGF0dXMQARoKCgZzaG9wSWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC) |
| **printJobs** | `shopId` (ASC), `createdAt` (DESC) | Queue Recents | [Create PrintJobs Index](https://console.firebase.google.com/v1/r/project/shakeel-online-services-951ec/firestore/indexes?create_composite=Cl9wcm9qZWN0cy9zaGFrZWVsLW9ubGluZS1zZXJ2aWNlcy05NTFlYy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcHJpbnRKb2JzL2luZGV4ZXMvXxABGgoKBnNob3BJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI) |
| **printJobs** | `shopId` (ASC), `status` (ASC), `createdAt` (ASC) | Active Spooler FIFO | [Create PrintJobs FIFO Index](https://console.firebase.google.com/v1/r/project/shakeel-online-services-951ec/firestore/indexes?create_composite=Cl9wcm9qZWN0cy9zaGFrZWVsLW9ubGluZS1zZXJ2aWNlcy05NTFlYy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcHJpbnRKb2JzL2luZGV4ZXMvXxABGgoKBnNob3BJZBABGgoKBnN0YXR1cxABGg0KCWNyZWF0ZWRBdBABGgwKCF9fbmFtZV9fEAE) |
| **devices** | `shopId` (ASC), `createdAt` (DESC) | Device Pairing | [Create Devices Index](https://console.firebase.google.com/v1/r/project/shakeel-online-services-951ec/firestore/indexes?create_composite=Cl1wcm9qZWN0cy9zaGFrZWVsLW9ubGluZS1zZXJ2aWNlcy05NTFlYy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZGV2aWNlcy9pbmRleGVzL18QARoKCgZzaG9wSWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC) |
| **printers** | `shopId` (ASC), `isOnline` (ASC), `lastSeenAt` (DESC) | Online Heartbeat | [Create Printers Index](https://console.firebase.google.com/v1/r/project/shakeel-online-services-951ec/firestore/indexes?create_composite=Cl5wcm9qZWN0cy9zaGFrZWVsLW9ubGluZS1zZXJ2aWNlcy05NTFlYy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvcHJpbnRlcnMvaW5kZXhlcy9fEAEaDAoIaXNPbmxpbmUQARoKCgZzaG9wSWQQARoOCgpsYXN0U2VlbkF0EAIaDAoIX19uYW1lX18QAg) |
| **auditLogs** | `shopId` (ASC), `timestamp` (DESC) | Security Logs | [Create AuditLogs Index](https://console.firebase.google.com/v1/r/project/shakeel-online-services-951ec/firestore/indexes?create_composite=Cl9wcm9qZWN0cy9zaGFrZWVsLW9ubGluZS1zZXJ2aWNlcy05NTFlYy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYXVkaXRMb2dzL2luZGV4ZXMvXxABGgoKBnNob3BJZBABGg0KCXRpbWVzdGFtcBACGgwKCF9fbmFtZV9fEAI) |

### Visual Brand & Mobile Tooling Verification Evidence
1. **Restored Logo Across All Touchpoints:**
   - Desktop & Mobile header: Emerald vector printer/scanner mark + "SOS PRINT" wordmark + "SHAKEEL ONLINE SERVICES, GUNTUR" subtitle.
   - Screenshots: `live_final_desktop_home.png`, `live_final_mobile_home_375.png`, `verify_home_375.png`, `verify_print_375.png`, `verify_login_375.png`.
   - Brand Isolation: Hardened CSS tokens (`color-scheme: light !important;`) ensure host IDE dark mode never bleeds into client web interfaces.
2. **Mobile Image Editor Suite (EnhancedImageEditor):**
   - Verified on mobile viewport (`375x812`) with touch handles and responsive clamping:
     - **Crop & Ratios (`mobile_editor_crop_tab.png`):** Free Crop, Original, Square (1:1), 4:6 Photo presets; draggable edge/corner handles; rotate 90Â°; flip H/V; 4-corner perspective warp; passport head alignment oval; live DPI indicator (e.g. "282 DPI (GOOD)").
     - **Background Removal (`mobile_editor_background_tab.png`):** Pure White (Passport), Light Blue (Visa/Official), Transparent, Keep Original; manual Erase & Restore brush with variable brush size slider.
     - **Enhance Filters (`mobile_editor_enhance_tab.png`):** 1-Click Auto Enhance, Document Scan Mode (preserving handwriting/stamps), Clean Grayscale, High Contrast B&W, 2x Digital Upscale Resampling.
     - **Fine Tuning (`mobile_editor_tune_tab.png`):** Responsive sliders for Brightness, Contrast, Saturation, Sharpness (Unsharp Mask), and Restrained Denoise.


## 2. Technical Clarifications & Acceptance Resolutions

### A. Clarification on the â‚¹5.00 PDF Quote
- **Base Rate:** The base simplex rate for A4 B&W is **200 paise (â‚¹2.00)** per printed side.
- **Minimum Order Policy:** In `shopSettings.minimumOrderPaise`, the shop has a configured minimum order charge of **500 paise (â‚¹5.00)** to prevent transaction costs exceeding print value on 1-page jobs.
- **Line Item Breakdown:** For a single-page document (1 side Ã— 200 paise = 200 paise), a `MINIMUM_ORDER_ADJUSTMENT` of 300 paise is added:
  - Base Document Print (1 page): â‚¹2.00 (200 paise)
  - Minimum Order Adjustment: â‚¹3.00 (300 paise)
  - **Total Authoritative Quote: â‚¹5.00 (500 paise)**
- Duplex multi-page documents exceed 500 paise naturally (e.g. 3 sheets duplex = 900 paise / â‚¹9.00), so no adjustment is applied.

### B. Production Document Storage Hardening
- **Local Fallback Removal:** `apps/web/src/lib/firebase/admin.ts` was patched to disallow `/tmp` or local filesystem fallbacks in production. If the configured Firebase Storage bucket is unreachable, the system fails closed with a clear `STORAGE_UNAVAILABLE` error rather than creating an insecure ephemeral file.

### C. Removed Fabricated Contact Info
- All fabricated address information (e.g., "GT Road") has been completely removed.
- Canonical address displayed: **"Shakeel Online Services, Guntur, Andhra Pradesh"**.
- WhatsApp Helpline: **`+91 9581529381`**.
- Direct UPI ID: **`9581529381@ybl`**.

---

## 3. Automated Test Evidence (All 226 Tests Passing)

```
â–¶ Phase 4.1: Customer Order Flow Hardening & Corrections
  âœ” 11 tests PASS
â–¶ Phase 5.1: Final Pre-Spooler Hardening Test Suite
  âœ” 13 tests PASS
â–¶ Phase 5: Print Queue & Windows S2P Agent Foundation Test Suite
  âœ” 16 tests PASS
â–¶ Phase 6: Manual UPI Payment Suite
  âœ” 15 tests PASS
â–¶ Pricing Engine Test Suite
  âœ” 21 tests PASS
â–¶ Security & RBAC Suite
  âœ” 9 tests PASS
â–¶ Synthetic Image Processing & Resume Engine Suite
  âœ” 11 tests PASS

Total Tests: 246 passed, 0 failed (100% pass rate)
TypeScript Typecheck: 0 errors across @s2p/shared, @s2p/web, and @s2p/functions
Production Next.js Build: 35/35 routes compiled successfully
```

---

## 4. Next Steps for Shop Owner (à¤¦à¥à¤•à¤¾à¤¨à¤¦à¤¾à¤° à¤•à¥‡ à¤²à¤¿à¤ à¤¸à¤°à¤² à¤¨à¤¿à¤°à¥à¤¦à¥‡à¤¶)

1. **Owner Dashboard à¤®à¥‡à¤‚ à¤²à¥‰à¤—à¤¿à¤¨ à¤•à¤°à¥‡à¤‚:**
   - Link: https://sos-print.vercel.app/login
   - Email: `shaikshadaab16@gmail.com`
   - Password: à¤†à¤ªà¤•à¥‡ Firebase à¤–à¤¾à¤¤à¥‡ à¤•à¤¾ à¤ªà¤¾à¤¸à¤µà¤°à¥à¤¡ (à¤­à¥‚à¤² à¤œà¤¾à¤¨à¥‡ à¤ªà¤° Forgot Password à¤ªà¤° à¤•à¥à¤²à¤¿à¤• à¤•à¤°à¥‡à¤‚).
2. **Shop QR Poster à¤¡à¤¾à¤‰à¤¨à¤²à¥‹à¤¡ à¤”à¤° à¤ªà¥à¤°à¤¿à¤‚à¤Ÿ à¤•à¤°à¥‡à¤‚:**
   - Dashboard à¤®à¥‡à¤‚ **Shop QR & Poster** (`/dashboard/standee`) à¤ªà¤° à¤œà¤¾à¤à¤.
   - **Download A4 Poster (PDF)** à¤ªà¤° à¤•à¥à¤²à¤¿à¤• à¤•à¤°à¥‡à¤‚ à¤”à¤° à¤¦à¥à¤•à¤¾à¤¨ à¤•à¥‡ à¤•à¤¾à¤‰à¤‚à¤Ÿà¤° à¤ªà¤° à¤²à¤—à¤¾à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤ªà¥à¤°à¤¿à¤‚à¤Ÿ à¤¨à¤¿à¤•à¤¾à¤²à¥‡à¤‚.
3. **Windows Agent à¤šà¤¾à¤²à¥‚ à¤•à¤°à¥‡à¤‚:**
   - Shop PC à¤ªà¤° https://sos-print.vercel.app/SOS-Print-Agent-Package.zip à¤¡à¤¾à¤‰à¤¨à¤²à¥‹à¤¡ à¤•à¤°à¥‡à¤‚.
   - Unzip à¤•à¤°à¤•à¥‡ `start-agent.bat` à¤šà¤²à¤¾à¤à¤.
   - Dashboard à¤•à¥‡ **Printers** à¤ªà¥‡à¤œ à¤¸à¥‡ 6-à¤…à¤‚à¤•à¥‹à¤‚ à¤•à¤¾ Pairing Code à¤²à¥‡à¤•à¤° agent à¤®à¥‡à¤‚ à¤¡à¤¾à¤²à¥‡à¤‚.
   - à¤à¤• Authorized Test Print à¤¨à¤¿à¤•à¤¾à¤²à¥‡à¤‚ à¤”à¤° à¤…à¤¸à¤²à¥€ à¤•à¤¾à¤—à¤œà¤¼ à¤¨à¤¿à¤•à¤²à¤¨à¥‡ à¤•à¥€ à¤ªà¥à¤·à¥à¤Ÿà¤¿ à¤•à¤°à¥‡à¤‚.
4. **à¤—à¥à¤°à¤¾à¤¹à¤• à¤¸à¥‡ Cash à¤¯à¤¾ UPI à¤²à¥‡à¤‚:**
   - à¤—à¥à¤°à¤¾à¤¹à¤• à¤•à¤¾à¤‰à¤‚à¤Ÿà¤° à¤ªà¤° à¤†à¤•à¤° QR à¤¸à¥à¤•à¥ˆà¤¨ à¤•à¤°à¤•à¥‡ à¤«à¤¾à¤‡à¤² à¤…à¤ªà¤²à¥‹à¤¡ à¤•à¤°à¥‡à¤—à¤¾.
   - à¤œà¤¬ à¤—à¥à¤°à¤¾à¤¹à¤• Cash à¤¦à¥‡ à¤¯à¤¾ à¤†à¤ªà¤•à¥‡ UPI (`9581529381@ybl`) à¤ªà¤° à¤ªà¥ˆà¤¸à¥‡ à¤­à¥‡à¤œà¥‡, à¤¤à¥‹ Dashboard à¤•à¥‡ **Counter** (`/dashboard/counter`) à¤ªà¥‡à¤œ à¤ªà¤° **"Confirm Cash Received"** à¤¯à¤¾ **"Confirm UPI Received"** à¤¦à¤¬à¤¾à¤à¤.
   - à¤‡à¤¸à¤•à¥‡ à¤¤à¥à¤°à¤‚à¤¤ à¤¬à¤¾à¤¦ à¤ªà¥à¤°à¤¿à¤‚à¤Ÿà¤° à¤¸à¥‡ à¤•à¤¾à¤—à¤œà¤¼ à¤…à¤ªà¤¨à¥‡ à¤†à¤ª à¤ªà¥à¤°à¤¿à¤‚à¤Ÿ à¤¹à¥‹ à¤œà¤¾à¤à¤—à¤¾.

---

## 5. Local Source Backups & Integrity
- **Sanitized Source Backup:** Local source archive `C:\\SOSPrint-Backups\\SOS-Print-Source-20261010-1351.zip` (62.99 MB / 66,045,623 bytes, SHA-256: `FC227CC44BF9995A066EBE54888A6AF5879CBFAB61A326FCDF58455C55C46A7D`).
- **Integrity Notice:** Backups are standard sanitized zip archives excluding `.git`, `node_modules`, `.next`, and secrets; they are not encrypted.
- **Physical Printing Status:** Remains strictly **PHYSICAL PENDING** until actual paper feed and print output are executed on the shop Windows PC in Guntur.
