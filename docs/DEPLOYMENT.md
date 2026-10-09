# SOS Print — Production Deployment & Hosting Guide

**Business:** Shakeel Online Services, Guntur, Andhra Pradesh  
**Software Name:** SOS Print  
**Repository:** https://github.com/shaikshadaab/shakeel123.git  
**Vercel Project Name:** `sos-print`  
**Fixed Server Shop ID:** `shakeel-online-services`  

---

## 1. Vercel Web Deployment

The web application is built with Next.js 14 App Router and TypeScript.

### 1.1 Project Settings in Vercel:
- **Framework Preset:** Next.js
- **Root Directory:** `apps/web`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Node.js Version:** 20.x

### 1.2 Environment Variables (Configured in Vercel Project Settings):
Never place raw secrets in client-side bundles (`NEXT_PUBLIC_*`).

| Variable Name | Description | Environment |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Public Firebase Web API Key | Production / Preview |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `shakeel-online-services-951ec.firebaseapp.com` | Production / Preview |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `shakeel-online-services-951ec` | Production / Preview |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `shakeel-online-services-951ec.firebasestorage.app` | Production / Preview |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `760528434650` | Production / Preview |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:760528434650:web:e2dfafefc121950d187ce3` | Production / Preview |
| `FIREBASE_PROJECT_ID` | `shakeel-online-services-951ec` | Production (Server) |
| `FIREBASE_CLIENT_EMAIL` | Service Account Client Email | Production (Server) |
| `FIREBASE_PRIVATE_KEY` | Service Account PEM Private Key | Production (Server) |
| `RAZORPAY_KEY_ID` | Shop's Razorpay Merchant Key ID | Production (Server) |
| `RAZORPAY_KEY_SECRET` | Shop's Razorpay Merchant Secret | Production (Server) |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook verification secret | Production (Server) |
| `SESSION_SECRET` | 64-char HMAC signing key | Production (Server) |
| `SHOP_ID` | `shakeel-online-services` | Production (Server) |

---

## 2. Firebase Infrastructure & Security

### 2.1 Project Configuration:
- **Project ID:** `shakeel-online-services-951ec`
- **Authorized Domains in Firebase Auth:**
  - `shakeel-online-services-951ec.firebaseapp.com`
  - `sos-print.vercel.app` (or custom shop domain)
  - `localhost`

### 2.2 Storage Rules & CORS:
Documents uploaded through `/api/upload` use private scoped access.
Direct public access is denied by default in `storage.rules`:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 2.3 CORS Configuration (`cors.json`):
```json
[
  {
    "origin": ["https://sos-print.vercel.app", "http://localhost:3000"],
    "method": ["GET", "PUT", "POST"],
    "responseHeader": ["Content-Type", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
]
```
Apply via: `gsutil cors set cors.json gs://shakeel-online-services-951ec.firebasestorage.app`

---

## 3. Windows Print Agent Deployment

The Windows Agent runs as a user-session application in the active Windows desktop of the shop PC.

### 3.1 Distribution Package:
- Package: `SOS-Print-Agent-Package.zip` (5.0 MB)
- Package Location: Available at `/SOS-Print-Agent-Package.zip` on the website.
- Package Checksum: SHA-256 `A3EDEF14FB66B25E894D2C933812C067E4A7B2032E17CF8BF5A2E113773BE507`
- Runtime Requirement: **.NET 8.0 Desktop Runtime (x64)**

### 3.2 Installation on Shop PC:
1. Download `SOS-Print-Agent-Package.zip` from the Owner Dashboard (Printers / Device Setup).
2. Extract to a stable directory: `C:\SOSPrint-Agent\`.
3. Run `install-agent.bat` to check .NET 8 prerequisites.
4. Run `start-agent.bat`.
5. In Owner Dashboard (`/dashboard/printers`), click **Pair New Windows PC** to obtain a 6-digit single-use pairing code.
6. Enter the pairing code in the agent prompt. The device credential is encrypted using Windows DPAPI and stored in a local SQLite journal.
7. Send a test page from the dashboard to verify physical paper printing.

---

## 4. Local Development Execution

```bash
# Locked dependency install
npm.cmd install

# Start local Next.js development server
npm.cmd run dev

# Open in browser
http://localhost:3000
```
