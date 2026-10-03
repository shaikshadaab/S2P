# Production Deployment & Infrastructure Guide
> **Vintha Print Platform**

---

## 1. Cloud Web Application Deployment (Vercel)

### Step 1: Link Repository
Import the monorepo into Vercel and set the root directory to `apps/web`.

### Step 2: Configure Build Settings
- **Framework Preset:** Next.js
- **Root Directory:** `apps/web`
- **Build Command:** `next build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### Step 3: Production Environment Variables
Configure the following in the Vercel Project Settings:
```env
NEXT_PUBLIC_APP_URL=https://print.vintha.ai
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# PhonePe Production Credentials
PHONEPE_ENVIRONMENT=PRODUCTION
PHONEPE_HOST_URL=https://api.phonepe.com/apis/hermes
PHONEPE_MERCHANT_ID=<your-production-merchant-id>
PHONEPE_SALT_KEY=<your-production-salt-key>
PHONEPE_SALT_INDEX=1

# Security & Data Retention
FILE_RETENTION_HOURS=24
DEVICE_TOKEN_ENCRYPTION_KEY=<random-32-byte-hex-string>
PLATFORM_ADMIN_EMAIL=admin@vintha.ai
```

---

## 2. Supabase PostgreSQL & Storage Configuration

1. Create a new Supabase project in the `ap-south-1` (Mumbai) region for minimal latency.
2. In the Supabase SQL Editor, run `supabase/migrations/20261002000001_initial_vintha_schema.sql`.
3. Create a **Private** Storage Bucket named `private-uploads`.
4. Ensure Public Access is **DISABLED** on the bucket.
5. Apply Storage RLS policies allowing upload creation and short-lived signed GET access.

---

## 3. PhonePe Production Go-Live Checklist

- [ ] Complete business entity KYC on PhonePe Merchant Dashboard.
- [ ] Whitelist production callback URL: `https://print.vintha.ai/api/payments/phonepe/callback`.
- [ ] Whitelist production webhook URL: `https://print.vintha.ai/api/payments/phonepe/webhook`.
- [ ] Execute low-value production transaction (₹1) and verify receipt in the ledger.
- [ ] Confirm automatic T+1 bank settlement cycle.

---

## 4. Windows Print Agent Desktop Packaging

To compile standalone Windows executables with `electron-builder`:
```bash
cd apps/print-agent
npm run build
npx electron-builder --win nsis
```
Outputs:
- `dist/VinthaPrintAgent-Setup-1.0.0.exe` (NSIS Installer)
- `dist/win-unpacked/` (Portable Executable)