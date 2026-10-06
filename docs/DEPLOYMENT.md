# S2P — Deployment & Operations Guide

**Product Name:** S2P (Scan 2 Print)  
**Shop:** Shakeel Online Services  
**Version:** Phase 0 Technical Foundation

---

## 1. System Requirements

### Shop Computer (Agent Host):
- Windows 10 (64-bit) or Windows 11.
- .NET 8.0 Runtime.
- Standard printer drivers installed and confirmed working via Windows Test Page.
- Stable broadband or mobile hotspot connection.

### Cloud Infrastructure:
- Node.js 20 LTS.
- Firebase CLI (`firebase-tools`).
- Firebase Project configured on Blaze plan (free tier generous limits).

---

## 2. Web Application Deployment

The web workspace contains both the Customer PWA (`/s/shakeel-online-services`) and Shop Dashboard (`/dashboard`).

```bash
# Build production bundle
npm run build:web

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

---

## 3. Cloud Functions Deployment

```bash
# Build Cloud Functions
npm run build:functions

# Deploy Cloud Functions
firebase deploy --only functions
```

---

## 4. Windows Print Agent Installation

### Service Installation:
```cmd
# Register S2P.PrintService as a Windows Service
sc.exe create S2P.PrintService binPath= "C:\Program Files\S2P\S2P.PrintService.exe" start= auto

# Start the service
sc.exe start S2P.PrintService
```

### Device Pairing Workflow:
1. Open Shop Dashboard ➔ **Printer Center**.
2. Click **Pair Print Computer**. A single-use 6-digit numeric pairing code is generated (e.g. `482731`).
3. On the shop PC, open S2P Tray ➔ **Pair Device**.
4. Enter the 6-digit pairing code.
5. The cloud associates the computer identity (hardware GUID) with Shakeel Online Services.
6. The agent enumerates all Windows print queues and begins heartbeat telemetry.
