# Vintha Print (vintha.ai)
> **Tagline:** Scan • Upload • Pay • Print  
> "Customer ke Phone Se Seedha Print"

Vintha Print is a production-ready, multi-tenant SaaS platform built for commercial xerox, photocopy, and digital print shops across India. It eliminates manual WhatsApp file sharing, USB drive viruses, and counter payment delays through an automated, contactless printing pipeline.

---

## 🌟 How It Works
```mermaid
flowchart LR
    A[Customer Scans Shop QR] --> B[Upload PDF/Photo on Mobile]
    B --> C[Configure Pages & Duplex]
    C --> D[Pay with PhonePe UPI]
    D --> E[Backend Cryptographic Verification]
    E --> F[Windows Print Agent Claims Job]
    F --> G[Silent Spool to Shop Printer]
    G --> H[Live Customer Status Complete]
```

1. **Shop Registration:** Owner registers a shop, configures printing rates (A4 B&W, Color, Duplex, A3, Photo), and downloads branded shop QR posters.
2. **Contactless Upload:** Customer scans the shop QR poster with any smartphone camera (no mobile app installation or account required).
3. **Smart Document Parser:** Detects page count, generates preview thumbnails, and validates against maximum page/file size rules.
4. **Deterministic Server Pricing:** Computes exact price (selected pages, single/duplex physical sheets, copies, service fee, and GST).
5. **Secure PhonePe Gateway:** Customer completes checkout via UPI, PhonePe, or cards. Backend independently validates the signed webhook / payment status.
6. **Windows Print Agent:** Paired Electron desktop application on the shop PC polls the secure job queue, downloads document via short-lived signed URLs, validates SHA-256 checksums, and silently spools to the designated printer.
7. **Auto-Shred Privacy:** Files are permanently deleted after the configurable retention window (default: 24 hours).

---

## 🏗️ Monorepo Structure

```
├── apps/
│   ├── web/                     # Next.js 14 App Router, Tailwind CSS, PWA
│   │   ├── src/app/             # Customer QR routes, Dashboards, APIs
│   │   ├── src/components/      # Multi-step Onboarding, Mobile Flow, Posters
│   │   └── src/lib/             # PhonePe Client, Store, Utilities
│   └── print-agent/             # Electron 30 Windows Desktop Application
│       ├── src/main/            # Printer discovery, Agent sync, Silent spooler
│       ├── src/preload/         # Secure contextBridge IPC
│       └── src/renderer/        # Desktop Control Center UI
├── packages/
│   └── shared/                  # Shared Business Logic & Type Definitions
│       ├── src/pricing/         # Deterministic Pricing Engine
│       ├── src/state-machine/   # Order & Print Job State Machine
│       ├── src/utils/           # Page range parser, PhonePe HMAC-SHA256
│       └── src/types/           # Canonical TypeScript interfaces & enums
├── supabase/
│   └── migrations/              # 24-Table PostgreSQL Schema with RLS
├── scripts/
│   └── e2e-workflow.mjs         # 10/10 Automated End-to-End Verification
└── docs/                        # Complete Technical & Operational Documentation
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or 20+
- npm 9+
- Windows 10/11 (for the native Windows Print Agent; simulated virtual driver works cross-platform)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Test Suite
```bash
npm --workspace=@vintha/shared test
```

### 3. Build Web Application & Print Agent
```bash
npm --workspace=@vintha/shared run build
npm --workspace=@vintha/web run build
npm --workspace=@vintha/print-agent run build
```

### 4. Run Full End-to-End Test (10/10 Acceptance Verification)
```bash
node scripts/e2e-workflow.mjs
```

### 5. Start Development Servers
- **Web App (Customer & Owner Dashboard):**
  ```bash
  npm --workspace=apps/web run dev
  ```
  Open [http://localhost:3000](http://localhost:3000)

- **Windows Print Agent:**
  ```bash
  npm --workspace=@vintha/print-agent run dev
  ```

---

## 🎨 Branding & Visual Tokens
Built strictly in accordance with the Vintha.ai design system:
- **Cream / Soft White Canvas:** `#FAFAF8`, `#FFFFFF`
- **Primary Mint Emerald:** `#20C878`
- **Dark Navigation Sidebar:** `#121018`
- **Action Coral/Pink:** `#F23868`
- **Royal Accent Purple:** `#6D3AE8`
- **Typography:** Outfit (Display & Headings) and Inter (Body)

---

## 📚 Complete Documentation
- [Architecture Blueprint](file:///./ARCHITECTURE.md)
- [Database Schema & Migrations](file:///./DATABASE.md)
- [PhonePe Payment Gateway Integration](file:///./PHONEPE_SETUP.md)
- [Windows Print Agent Setup & Diagnostics](file:///./PRINT_AGENT_SETUP.md)
- [Print Shop Owner Guide](file:///./SHOP_OWNER_GUIDE.md)
- [Production Deployment Guide](file:///./DEPLOYMENT.md)
- [Security & File Retention Architecture](file:///./SECURITY.md)
- [Test Strategy & Verification Plan](file:///./TESTING.md)