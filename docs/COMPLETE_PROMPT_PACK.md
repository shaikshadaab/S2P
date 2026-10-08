# Shakeel Online Services — Complete Print System Prompt Pack
7 October 2026 · First release: one shop only · Internal product name: SOS Print

यह पूरा pack सिर्फ Shakeel Online Services, Guntur की दुकान के लिए है। Customer आपकी दुकान का QR scan करेगा, file/photo upload करके settings चुनेगा, आपकी rates के अनुसार payment करेगा और आपके Windows PC से जुड़े printer पर print निकलेगा। Customer page पर मुख्य नाम Shakeel Online Services रहेगा; SOS Print आपके printing software का नाम है।

## 1. Scope
- **Shop:** Shakeel Online Services (Fixed SHOP_ID: shakeel-online-services), Guntur, Andhra Pradesh.
- **Single Shop Model:** One owner dashboard, one existing Razorpay merchant account, one primary shop Windows PC with installed printers.
- **Excluded:** Public shop registration, multiple-shop onboarding, SaaS plans/trials/subscriptions, reseller/white-label/referral, platform billing.
- **Customer UX:** Zero login/install needed; scoped high-entropy token per session.
- **Owner UX:** Private authenticated login only, bootstrapped securely.

## 2. Technical Architecture
- **Web & API:** Next.js App Router on Vercel.
- **Authentication:** Firebase Authentication for approved owner and staff.
- **Metadata & DB:** Google Cloud Firestore via Firebase Admin SDK.
- **File Storage:** Private Firebase Storage bucket with scoped signed upload grants and lifecycle cleanup.
- **Payment:** Single Razorpay merchant account (Checkout + server signature validation + raw webhook verification) + Counter Cash / Manual UPI.
- **Windows Tray Agent:** Supported .NET 8 LTS user-session tray agent communicating via outbound HTTPS only, DPAPI credential protection, SQLite local journal, and Windows Spooler driver printing.

## 3. Brand Identity
- **Visible Name:** Shakeel Online Services.
- **Software Name:** SOS Print.
- **Theme:** Clean white background, emerald green accents, readable charcoal text, simple original icons.
- **Languages:** English, Hindi, and prepared for Telugu.

## 4. Master Phases Summary (Phase 00 – Phase 09)
- **Phase 00:** Project, owner login, shop website, deny-private-data rules, clean local build.
- **Phase 01:** Real rates (integer paise), shop settings, downloadable QR PNG & A4/A5 standee PDF.
- **Phase 02:** Real Windows .NET 8 tray agent, DPAPI pairing, printer discovery & capabilities, test page.
- **Phase 03:** Direct private Storage upload, multi-file basket (up to 10), preflight, real page count, frozen quote.
- **Phase 04:** Razorpay checkout & raw webhook verification, counter cash/UPI confirmation, atomic print lease dispatch.
- **Phase 05:** Photo editor (crop/rotate/brightness/zoom), A4 photo grids (1/2/4/6/9/12), passport photo repeat sheets (4x6 / A4) with cut guides.
- **Phase 06:** Six original resume templates, searchable print-ready PDF, DOCX/PPTX conversion via Windows local LibreOffice.
- **Phase 07:** Phone camera scan (perspective correction/contrast), ID front/back copy layout, mini print (n-up), hardware-supported large formats (A3/A2/A1).
- **Phase 08:** Owner dashboard operations, live queue, daily/weekly/monthly reports (Asia/Kolkata), audit trail, cloud/local file cleanup.
- **Phase 09:** Vercel deployment, Firebase production configuration, physical PC commissioning runbook in Hindi.