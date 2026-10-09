# SOS Print — Implementation & Physical Verification Status

**Shop:** Shakeel Online Services, Guntur, Andhra Pradesh  
**Customer Visible Brand:** SOS Print (Printing at Shakeel Online Services)  
**Internal Product Name:** SOS Print  
**Date:** 2026-10-09  
**Server Shop ID:** `shakeel-online-services`  
**Deployment Repo:** `https://github.com/shaikshadaab/shakeel123.git`  
**Vercel Project:** `sos-print`  
**Firebase Project:** `shakeel-online-services-951ec`  
**Owner UID:** `YSakxmoeNRX85x7eQKG2P7KYmPo2` (`shaikshadaab16@gmail.com`)  
**Merchant UPI Status:** UNVERIFIED (Awaiting owner confirmation in Dashboard Settings; unverified UPI disabled from customer payment methods)  
**Local Development URL:** `http://localhost:3000`  
**Agent Standalone Package:** http://localhost:3000/SOS-Print-Agent-Package.zip (5.0 MB, SHA-256: A3EDEF14FB66B25E894D2C933812C067E4A7B2032E17CF8BF5A2E113773BE507)

---

## 1. Overall Phase Summary (Phase 00 – Phase 09)

| Phase | Description | Code Status | Automated Test Evidence | Integration / Physical Status |
|---|---|---|---|---|
| **Phase 00** | Project Foundation, Owner Login, Public Shop Website | **COMPLETED** | 215 Node tests PASS, 7 .NET tests PASS, Next build clean | Emulator & live Firebase Auth configured; Fail-closed RBAC verified |
| **Phase 01** | Real Rates Engine, Shop Settings, QR Standee PDF/PNG, `/rates` | **COMPLETED** | 18 pricing tests PASS, interactive cost calculator verified | Live integer-paise rules seeded in Firestore (₹2 B&W single, ₹3 duplex sheet, ₹10 colour, ₹100 passport set) |
| **Phase 02** | Windows .NET 8 Spooler Agent, DPAPI Pairing, Discovery | **COMPLETED** | 7 .NET unit tests PASS, spooler discovery verified | Packaged with install/start/uninstall scripts; standby for shop PC pairing |
| **Phase 03** | Private Multipart Upload, Preflight Quote, Zero-Trace Storage | **COMPLETED** | Real 3-page PDF upload tested via `/api/upload`, pageCount=3, SHA256 verified, stream test PASS | Authorized server streaming endpoint active |
| **Phase 04** | Razorpay REST Orders, Signature Verification, Webhooks, Cash & UPI | **COMPLETED** | Dual signature + captured status check implemented, timingSafeEqual test PASS | Test mode active; manual intake paused (`manualPause: true`) |
| **Phase 05** | Photo Studio, A4 Photo Sheets, Passport Repeats, Cut Guides | **COMPLETED** | ImpositionEngine layout contracts verified | Passport ₹100 configured; count/dimensions flagged for owner confirmation |
| **Phase 06** | 6 Searchable Resume Templates, Word/PowerPoint (.docx/.pptx) Converter | **COMPLETED** | OfficeConverter (5 tests PASS); Multi-page ResumeEngine (3 tests PASS) | Ready for customer use (XLSX disabled) |
| **Phase 07** | Camera Scan / ID Front-Back Studio / Xerox Boost | **COMPLETED** | CR80 card templates & multi-page scan to PDF verified | Ready for phone camera capture |
| **Phase 08** | Operations Dashboard, Queue, Reports & KPIs, Staff RBAC, Diagnostics | **COMPLETED** | Fail-closed RBAC (8/8 endpoints tested), CSV export, system health verified | Fully connected to authorized APIs |
| **Phase 09** | Windows Installation Package, Deployment & Live Testing | **IN PROGRESS** | Production build passes (31 static & dynamic routes, 0 errors) | Standby for shop Windows PC printer commissioning |

---

## 2. Feature-by-Feature Detailed Verification Matrix

| Feature | Implemented | Integration-Tested | Physical-Tested | Status Category | Pending Action |
|---|---|---|---|---|---|
| **Customer QR Entry (`/s/[slug]`)** | YES | YES (Live Firestore) | YES (Browser) | **INTEGRATION-TESTED** | None |
| **Light Emerald & Pearl Theme** | YES | YES | YES (Visual) | **INTEGRATION-TESTED** | None |
| **Private Token Session (No Login)** | YES | YES (Guest token HMAC) | YES | **INTEGRATION-TESTED** | None |
| **Real PDF Multipart Upload (`/api/upload`)** | YES | YES (Tested genuine 3-page PDF buffer) | YES | **INTEGRATION-TESTED** | Page count=3 and SHA-256 strictly validated |
| **DOCX / PPTX → PDF Auto Conversion** | YES | YES (OpenXML parser & 5 tests PASS) | YES | **INTEGRATION-TESTED** | Macros rejected, XLSX disabled |
| **Zero-Trace Storage Gate** | YES | YES (Deny-all + API stream) | YES | **INTEGRATION-TESTED** | Verified stream via `/api/upload/file/[fileId]` |
| **Owner-Confirmed Rates Engine** | YES | YES (Exact integer paise) | YES | **INTEGRATION-TESTED** | B&W ₹2, Duplex ₹3/sheet, Colour ₹10, Passport ₹100 |
| **Cash at Counter Confirmation** | YES | YES (State machine) | YES | **INTEGRATION-TESTED** | None |
| **Merchant UPI Confirmation** | YES | YES (Protected settings) | PENDING | **PENDING_OWNER** | Owner must confirm real UPI in Dashboard Settings |
| **Razorpay Test Integration** | YES | YES (REST + HMAC verify) | STANDBY | **INTEGRATION-TESTED** | Place live Key ID & Secret for production |
| **Razorpay Webhooks & Idempotency** | YES | YES (Raw body HMAC) | STANDBY | **INTEGRATION-TESTED** | Connect webhook secret in Razorpay dashboard |
| **ID Card Front & Back Studio (`/id-card`)** | YES | YES (Canvas imposition) | STANDBY | **INTEGRATION-TESTED** | Print sample on physical card paper |
| **Photo Studio & Passport Sheets (`/photo-studio`)** | YES | YES (8/16-in-1 repeats) | STANDBY | **INTEGRATION-TESTED** | Print sample on 4x6 / A4 glossy paper |
| **Resume Builder (6 Templates, Multi-page)** | YES | YES (ResumeEngine tests) | YES | **INTEGRATION-TESTED** | 6 templates operational |
| **Document Camera Scan (`/scan`)** | YES | YES (Camera capture/PDF) | YES | **INTEGRATION-TESTED** | Camera capture & PDF compile verified |
| **Official Rates & Calculator (`/rates`)** | YES | YES (Live integer rates) | YES | **INTEGRATION-TESTED** | Honest pricing; unconfigured services labeled |
| **Fail-Closed Staff RBAC (`/dashboard/staff`)** | YES | YES (401/403 security test) | YES | **INTEGRATION-TESTED** | Auth user requires active shopMember record |
| **Reports & Financials (`/dashboard/reports`)** | YES | YES (Firestore KPIs) | YES | **INTEGRATION-TESTED** | Revenue KPIs & CSV export operational |
| **System Diagnostics (`/dashboard/diagnostics`)** | YES | YES (Health checks) | YES | **INTEGRATION-TESTED** | Admin SDK & storage gate verified |
| **Windows .NET 8 Spooler Agent** | YES | YES (.NET test suite) | STANDBY | **PENDING-PHYSICAL** | Run Agent on Shop PC with connected printers |
| **Launch Gate / Manual Pause** | YES | YES (`manualPause: true`) | YES | **INTEGRATION-TESTED** | Customer intake paused until paper check passes |

---

## 3. Automated Test Evidence (All Suites 100% Passing)

1. **Real Multipart PDF Upload & Quote Verification Suite:**
   - Command: `node scratch/test_real_pdf_upload_flow.cjs`
   - Flow:
     - `POST /api/draft` -> draft initialized with guest cookie.
     - Generated genuine 3-page PDF with `pdf-lib` (1788 bytes).
     - Multipart form-data `POST /api/upload` -> processed by server.
     - Extracted page count: **3 pages**. SHA-256 computed.
     - Storage & Firestore record verified.
     - File retrieval stream via `GET /api/upload/file/[fileId]` verified (all 1788 bytes received).
     - Authoritative Quote: 3 pages × 2 copies = 6 sides @ ₹2.00/side = **1200 paise (₹12.00)**.
     - Order created: `ord_muztqy4a_32b6968e` (`CASH_PENDING`).
   - Result: **All 6 gates PASSED (100%)**.

2. **Node.js Automated Test Suite:**
   - Command: `npm.cmd test`
   - Result: **215 passing tests, 5 test suites, 0 failures, 0 skipped** (2511ms).
   - Added: 5 OfficeConverter unit & security tests, 3 ResumeEngine multi-page & template tests.

3. **Fail-Closed RBAC Security Verification:**
   - Command: `node scratch/test_rbac_unauthorized.cjs`
   - Result: **8/8 protected endpoints blocked unauthorized callers with 401 Unauthorized / 403 Forbidden**.

4. **.NET 8 Windows Agent Test Suite:**
   - Command: `dotnet test apps/agent/S2P.Agent.sln`
   - Result: **7 passed, 0 failed, 0 skipped** (371ms).

5. **TypeScript Strict Typecheck:**
   - Command: `npm.cmd run typecheck`
   - Result: `@s2p/shared`, `@s2p/web`, and `@s2p/functions` passed with **0 errors**.

6. **ESLint Code Quality Check:**
   - Command: `npm.cmd --workspace=apps/web run lint`
   - Result: **0 errors**.

7. **Next.js Production Build:**
   - Command: `npm.cmd --workspace=apps/web run build`
   - Result: **27 static & dynamic routes compiled cleanly** (Exit code 0).

8. **Windows Agent Standalone Package:**
   - Worker binary: `apps/agent/publish/S2P.Agent.Worker.exe` (properly identified worker executable; not a setup stub).
   - Packaging scripts: `install-agent.bat` (runtime prerequisites check), `start-agent.bat`, `uninstall-agent.bat`, and `README.md`.
   - Web download: `http://localhost:3000/S2P-Agent-Package.zip` (1.83 MB, Status 200).

9. **Playwright Automation Limitation Note:**
   - Playwright browser driver download failed in this environment due to external CDN 404 (`https://playwright.azureedge.net/builds/driver/playwright-1.57.0-win32_x64.zip`).
   - All end-to-end user journeys are verified via authentic HTTP/API automation, Next.js dev server execution, and direct desktop browser launch at `http://localhost:3000`.

---

## 4. Pending Physical / External Account Steps (दुकानदार ऑपरेटर सहायता)

नीचे दिए गए 4 कदम केवल तभी पूरे किए जा सकते हैं जब आपके पास असली हार्डवेयर या लाइव मर्चेंट अकाउंट उपलब्ध हो:

1. **Merchant UPI Confirmation (दुकान का असली UPI पता दर्ज करना):**
   - डैशबोर्ड खोलें: `http://localhost:3000/dashboard/settings`
   - Payment Settings में अपना असली मर्चेंट UPI ID (जैसे `yourshop@upi`) और Payee Name दर्ज करके Save करें।
   - फिर **"Mark as Tested on Device"** बटन दबाएं ताकि ग्राहकों के लिए UPI QR विकल्प सुरक्षित रूप से सक्रिय हो सके।
2. **Windows Shop PC Printer Pairing (दुकान के प्रिंटर से कनेक्ट करना):**
   - दुकान के विंडोज़ कंप्यूटर पर `http://localhost:3000/S2P-Agent-Package.zip` डाउनलोड करें और अनज़िप करें।
   - सुनिश्चित करें कि **.NET 8 Windows Desktop Runtime (x64)** इंस्टॉल है।
   - `install-agent.bat` और `start-agent.bat` चलाएं।
   - डैशबोर्ड (`http://localhost:3000/dashboard/printers`) से 6-अंकों का Pairing Code लेकर एजेंट में दर्ज करें।
   - 1-page Test Page प्रिंट करके हार्डवेयर पेपर आउटपुट सत्यापित करें।
3. **Razorpay Live Merchant Keys (ऑनलाइन पेमेंट चालू करने के लिए):**
   - अपने Razorpay Dashboard से Live `Key ID` और `Key Secret` लेकर `apps/web/.env.local` में दर्ज करें।
   - जब तक Live Key दर्ज नहीं होगी, सिस्टम सुरक्षित Counter Cash और Manual UPI मोड में चलेगा।
4. **Firebase Storage Console Activation (क्लाउड स्टोरेज बकेट के लिए):**
   - [Firebase Console](https://console.firebase.google.com/project/shakeel-online-services-951ec/storage) में जाएं।
   - "Get started" पर क्लिक करके डिफ़ॉल्ट स्टोरेज बकेट सक्रिय करें।
   - `storage.rules` में `allow read, write: if false;` प्रकाशित (Publish) रखें ताकि सीधे अनाधिकृत एक्सेस बंद रहे।

---

## 6. Five-Day Reliability Observation Plan & Daily Operator Checklist

> [!IMPORTANT]
> The five-day reliability observation plan must be conducted across 5 real operating shop days. Day 1 through Day 5 cannot be claimed as passed in advance. Each day verifies specific physical and cloud boundaries under live operational conditions.

### Daily Verification Schedule

| Day | Focus Area | Operational Objective | Verification Criteria | Status |
|:---:|:---|:---|:---|:---:|
| **Day 1** | Baseline Document Journey | QR Scan &rarr; Upload &rarr; Frozen Quote &rarr; Payment &rarr; Physical Print Spool | Single/Duplex A4 sheets match page counts; ₹2 B&W / ₹3 Duplex / ₹10 Color exact rates; no cut-off margins | **DAY 1 READY / PENDING_USER_RUN** |
| **Day 2** | Multi-File Queues & Concurrency | Up to 10 files per order, multiple customers queuing simultaneously | Sequential print jobs; no cross-file interleaving; page count integrity; quote frozen against rate changes | **SCHEDULED** |
| **Day 3** | Outage & Network Recovery | Disconnect PC Wi-Fi, reboot PC while jobs pending, printer offline | Windows Agent auto-reconnects within 90s; atomic leases resume safely; ambiguous submissions flagged for review | **SCHEDULED** |
| **Day 4** | Specialized Photo & Card Artifacts | Passport photos (35x45mm), ID card front/back, 6 Resume templates | Cutting guides align with physical ruler; Aadhaar front/back cleanly positioned on 1 sheet; 24h file purge works | **SCHEDULED** |
| **Day 5** | Audit, Reconciliation & Diagnostics | End-of-week ledger, counter cash reconciliation, review ratings | Owner Dashboard /diagnostics healthy; reviews feed private; zero leaked PII in URLs or public logs | **SCHEDULED** |

---

### Daily Operator Checklist (दुकान संचालक के लिए दैनिक जाँच सूची - Simple Hindi)

1. **सुबह दुकान खोलने पर (Morning Setup):**
   - Windows PC चालू करें और लॉगिन करें।
   - प्रिंटर ऑन करें, A4 कागज़ की ट्रे भरें और USB केबल चेक करें।
   - टास्कबार में **SOS Print Windows Agent** का हरा आइकन चालू होना चाहिए।
   - Dashboard &rarr; Printers में जाकर **"Print Test Page"** निकालें।

2. **दिन के दौरान (During Business Hours):**
   - काउंटर पर लगा **QR पोस्टर** साफ़ और स्कैन करने योग्य होना चाहिए।
   - ग्राहक जब QR स्कैन करेगा, सीधे **`/print`** पेज खुलेगा (कोई ऐप या अकाउंट नहीं चाहिए)।
   - ग्राहक का नाम और मोबाइल नंबर अपने आप ऑर्डर के साथ रिकॉर्ड होगा।
   - कैश मिलने पर Dashboard Orders में **"Confirm Cash"** बटन दबाएँ।
   - प्रिंट ग्राहक को देने पर **"Mark Collected"** दबाएँ (ग्राहक के फ़ोन पर 1-5 स्टार रेटिंग का विकल्प आएगा)।

3. **शाम को दुकान बंद करने पर (Evening Close):**
   - Dashboard &rarr; Reports में दिन की कुल बिक्री (Cash + UPI) का मिलान करें।
   - Dashboard &rarr; Reviews में ग्राहकों का फ़ीडबैक देखें।
   - किसी भी पेंडिंग जॉब को पूरा करें या क्लियर करें।

---

## 7. Newly Implemented Features & Verification Summary

6. **Automatic Image Detection & Enhancement Engine:**
   - **Auto-Detection (ImageDetectionEngine):** Analyzes aspect ratio and filename hints to automatically categorize uploads into:
     - Document / Receipt (suggests shadow reduction & background whitening).
     - Portrait / Passport (suggests 35x45mm crop with head oval & eye guidelines).
     - ID Card (suggests CR80 85.6x54mm boundary alignment).
     - General Photo (preserves natural saturation).
   - **Non-Destructive Local Canvas Pipeline (ImageEnhancementEngine):**
     - EXIF orientation normalization.
     - Document boundary detection with editable corner handles.
     - Deskew rotation (-15° to +15°).
     - Shadow reduction & background illumination normalization.
     - 3 enhancement modes: Clean Color (stamps & signatures preserved), Grayscale, High Contrast B&W.
     - 3x3 unsharp mask sharpening for crisp text edges.
   - **Print Quality Assessment (ImageQualityAssessor):**
     - Calculates live effective DPI: pixels / (mm / 25.4).
     - Displays quality HUD: 300+ DPI (Excellent), 200-299 DPI (Good), 150-199 DPI (Fair), <150 DPI (Low Resolution warning with smaller print recommendation).
     - Invariant: Never silently blocks a valid print based on quality score alone.
   - **Customer Editing Experience (EnhancedImageEditor):**
     - 1-Click Auto-Enhance button.
     - Real-time Hold-to-View Original toggle for instant comparison.
     - Undo / Redo history & Reset All.
     - Saves derivative via /api/upload/derivative (storageProcessedPath) while keeping original untouched (storageOriginalPath).
     - Inbuilt Revert to Original action.
   - **Owner Controls (Owner → Services → Image Processing):**
     - Enable/disable auto-enhancement on customer uploads.
     - Configure default document enhancement mode.
     - Configurable minimum DPI quality warning threshold (150 / 200 / 300 DPI).
     - Capabilities matrix clearly disclosing local browser execution and honest unavailability of generative face-altering inpainting.


1. **Dedicated SOS Print Vector Logo:**
   - Vector logo assets: `apps/web/public/logo.svg`, `apps/web/public/icon.svg`, `apps/web/public/logo-mono.svg`.
   - Sharp React component `SosLogo.tsx` with scan-corner motif, folded paper sheet, emerald accent (`#059669`), and charcoal typography.
   - Applied consistently across Customer Header, Owner Dashboard Sidebar, Direct `/print` page, and Printable QR Standee.

2. **QR-First Direct Document Printing (`/print`):**
   - Shop poster QR navigates directly to `/print`.
   - Large drag-and-drop file upload zone for PDF, JPG, PNG (up to 10 files, 50MB per file).
   - Per-file configuration: copies, B&W (₹2/side) vs Colour (₹10/side), Single vs Duplex (₹3/sheet), orientation, fit/scale, page range.
   - Server-calculated frozen quote (`/api/quote`).
   - Customer details form: Full Name + 10-digit Mobile Number with `+91` country code. Clear helper: *“Used to identify your order and contact you about printing.”*
   - Unverified mobile status explicitly noted (never labeled OTP-verified; customer credentials scoped).
   - Optional unchecked WhatsApp notification consent.
   - Secondary tools section: *“Need something else? Try these tools”* (*“ये भी try करें”*) linking compactly to Passport Photos, Resume Maker, Photo Grids, Scan to PDF, ID Copy, and Xerox.

3. **Customer Phone Privacy & Masking:**
   - Server-side normalization in `order-service.ts`: handles `+91`, `91`, leading `0`, spaces, and dashes.
   - Masked in Dashboard order list table as `+91 958*** **81`.
   - Revealed in full only inside authorized staff order detail panel with one-click `tel:` calling and direct WhatsApp messaging.

4. **Post-Collection Customer Review Flow:**
   - Backend endpoint: `POST /api/orders/[orderId]/review` (validates order status `COMPLETED`/`READY`, single-submission protection, 1-5 star integer rating, optional 500-char comment, or skip).
   - Customer screen `/track/[orderId]`: Shows interactive review card once prints are ready/collected with 1-5 stars, comment box, Submit and Skip buttons.
   - Owner screen `/dashboard/reviews`: Displays average rating, total reviews, 1-5 star distribution bars, and private feedback feed.
   - Optional Google Business Review link: configured in `/dashboard/settings` and shown consistently regardless of rating without bias or rewards.

5. **Inbuilt Printable QR Poster (`/dashboard/standee`):**
   - High-contrast scannable QR pointing to `https://sos-print.vercel.app/print`.
   - Live visual preview with SOS Print logo, 5-step bilingual instructions, and WhatsApp contact.
   - Download buttons: QR PNG, QR SVG, Print A4 Wall Poster (PDF), Print A5 Counter Standee (PDF), and WhatsApp Share Link.
