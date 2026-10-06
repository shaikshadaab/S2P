# S2P — Firebase Cloud Setup & Operations Guide

**Project Name:** S2P (Scan 2 Print)  
**Pilot Client:** Shakeel Online Services  
**Environment:** Development & Production Architecture

---

## 1. Cloud Architecture Overview

S2P leverages Firebase serverless cloud infrastructure for maximum reliability, low operational costs, and near-zero server maintenance:

- **Firebase Hosting:** Global CDN distribution for the S2P Customer PWA and Shop Dashboard.
- **Firebase Authentication:** Multi-role identity management with Custom Claims (`OWNER`, `MANAGER`, `COUNTER_STAFF`, `PRINT_OPERATOR`, `FINISHING_STAFF`, `CUSTOMER`, `PRINT_AGENT`).
- **Cloud Firestore:** Multi-tenant document database with realtime listeners for instant order queuing.
- **Cloud Storage for Firebase:** STRICT PRIVATE object vault for customer PDF and image uploads.
- **Cloud Functions for Firebase (2nd Gen):** Server-authoritative price calculation, device pairing verification, and scheduled file purging.
- **Firebase App Check:** API abuse prevention and token validation.
- **Firebase Cloud Messaging (FCM):** Push notifications for order status changes.
- **Firebase Emulator Suite:** Complete local offline development without consuming cloud quotas or incurring costs.

> **IMPORTANT BLAZE PLAN REQUIREMENT FOR CLOUD FUNCTIONS:**  
> According to official Firebase policy, new Cloud Functions cannot be deployed on the Spark (free) plan. Cloud Functions deployment requires attaching the **Blaze (Pay-As-You-Go)** plan.  
> However, for Shakeel Online Services pilot usage, Google Cloud provides generous perpetual free tier quotas:
> - 2,000,000 Cloud Function invocations / month ($0)
> - 50,000 Firestore document reads / day ($0)
> - 20,000 Firestore document writes / day ($0)
> - 10 GB Cloud Storage ($0)
> - 360,000 compute-seconds ($0)  
> This ensures the initial pilot remains free or negligible in cost while enabling full serverless backend execution.

---

## 2. Local Machine Setup & Initialization

Run the following commands on your development machine:

```bash
# 1. Install Firebase CLI globally
npm install -g firebase-tools

# 2. Login to Google / Firebase account
firebase login

# 3. Initialize Firebase in the repository (if configuring a new project)
firebase init
# Select features:
# - Firestore
# - Functions
# - Hosting
# - Storage
# - Emulators

# 4. Set project alias to S2P Shakeel pilot
firebase use s2p-shakeel
```

---

## 3. Local Development with Firebase Emulator Suite

The local development environment uses the Firebase Emulator Suite configured in `firebase.json`:

| Service | Port | Description |
| :--- | :--- | :--- |
| **Emulator UI** | `4000` | Visual inspection dashboard for Firestore, Auth, and Storage |
| **Firestore** | `8080` | Local multi-tenant database emulator |
| **Functions** | `5001` | Cloud Functions local execution |
| **Auth** | `9099` | User accounts and custom claims emulator |
| **Storage** | `9199` | Local private file storage emulator |

### Starting Local Emulators:
```bash
firebase emulators:start
```

Access the local Emulator Suite dashboard at:  
[http://127.0.0.1:4000](http://127.0.0.1:4000)

---

## 4. Deployment Architecture & Commands

### Hosting Endpoints:
- **Production URL:** `https://s2p-shakeel.web.app` (or custom domain e.g. `scan2print.in`)
- **Customer Self-Service Route:** `https://<DOMAIN>/s/shakeel-online-services`
- **Shop Operator Dashboard:** `https://<DOMAIN>/dashboard`

### Deployment Commands:

```bash
# 1. Deploy Frontend Web App (Customer PWA & Shop Dashboard):
npm run build:web
firebase deploy --only hosting

# 2. Deploy Cloud Functions Backend:
npm run build:functions
firebase deploy --only functions

# 3. Deploy Security Rules & Storage Rules:
firebase deploy --only firestore:rules,storage

# 4. Full Production Deployment (All Components):
npm run build
firebase deploy
```

---

## 5. Firestore Data Model & Indexing Rules

> **CRITICAL ARCHITECTURAL RULE:**  
> Firestore is a non-relational document database. Do **NOT** blindly deeply nest collections.  
> High-frequency collections—`orders`, `printJobs`, and `auditLogs`—must be structured for flat querying and collection-group indexing to prevent performance bottlenecks and document size limitations.

### Domain Entity Layout:
- `organizations/`: `shakeel-online-services`
- `shops/`: `shakeel-main` (with shop metadata, settings, UPI configuration)
- `users/`: User profiles and role assignments
- `shopMembers/`: Association between users and shops
- `services/`: Available print offerings (Document Print, Photo Print, Scan & Print)
- `pricingRules/`: Active rate cards (A4, A3, B&W, Color, Duplex, Finishing, Slabs)
- `orders/`: High-frequency customer order documents (indexed by `shopId`, `status`, `createdAt`)
- `orderItems/`: File configuration items and selected page ranges
- `files/`: Private document metadata (hash, size, page count, mime type)
- `payments/`: Financial records (Cash tokens, manual UPI transaction references)
- `devices/`: Paired Windows PC print agents (`deviceId`, `pcName`, `heartbeat`)
- `printers/`: Discovered Windows print queues (`printerName`, `driver`, `capabilities`, `status`)
- `printJobs/`: Spool queue items with atomic lease locks
- `printAttempts/`: Immutable execution history per print job attempt
- `notifications/`: Realtime customer and staff status events
- `auditLogs/`: Tamper-proof operational audit trail
