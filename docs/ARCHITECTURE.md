# S2P (Scan 2 Print) — System Architecture

**Product Name:** S2P (Scan 2 Print)  
**Primary Pilot Client:** Shakeel Online Services  
**Architecture Version:** Phase 0 Technical Foundation  
**Operating System:** Windows PC (Agent) + Linux/V8 Cloud Runtime (Firebase) + Web/PWA (Mobile & Desktop)

---

## 1. High-Level Architecture Overview

S2P is a multi-tier, multi-tenant cloud-to-hardware operating system that enables self-service scan-to-print workflows for Indian print shops and cyber cafes.

```
 CUSTOMER MOBILE PHONE                      SHOP COUNTER TERMINAL
+------------------------+                 +------------------------+
¦  Counter QR Scan       ¦                 ¦  S2P Shop Dashboard    ¦
¦  S2P Customer PWA      ¦                 ¦  Counter POS View      ¦
¦  - PDF/Image Upload    ¦                 ¦  - Order Board         ¦
¦  - Configuration       ¦                 ¦  - Cash / UPI Verify   ¦
¦  - Authoritative Price ¦                 ¦  - Rate Card Controls  ¦
+------------------------+                 +-----------?------------+
            ¦ HTTPS                                    ¦ Realtime Listeners
            ?                                          ¦ (Firestore)
+-------------------------------------------------------------------+
¦                    FIREBASE CLOUD INFRASTRUCTURE                  ¦
¦                                                                   ¦
¦  Firebase Auth       : RBAC (Owner, Manager, Staff, Customer)     ¦
¦  Cloud Firestore     : Multi-Tenant Data Store & Realtime Queues  ¦
¦  Cloud Storage       : STRICT PRIVATE Document Vault              ¦
¦  Cloud Functions     : Authoritative Pricing & Privileged Logic   ¦
¦  Firebase App Check  : API Abuse & Bot Prevention                 ¦
+-------------------------------------------------------------------+
                                    ¦ Secure TLS WebSocket / Long-Poll
                                    ?
+-------------------------------------------------------------------+
¦               SHAKEEL ONLINE SERVICES — SHOP PC                   ¦
¦                                                                   ¦
¦  +-------------------------------------------------------------+  ¦
¦  ¦ S2P.PrintService (.NET 8 Windows Worker Service)            ¦  ¦
¦  ¦ - Persistent Device Identity (Hardware GUID)                ¦  ¦
¦  ¦ - Atomically Claims Assigned Print Jobs (Lease Lock)        ¦  ¦
¦  ¦ - Downloads Document to Temporary Vault & Verifies SHA256   ¦  ¦
¦  ¦ - Durable Local Transaction Log (SQLite)                    ¦  ¦
¦  ¦ - Submits to Windows Print Spooler (winspool.drv API)       ¦  ¦
¦  +-------------------------------------------------------------+  ¦
¦                                 ¦ Spooler IPC                     ¦
¦  +------------------------------?------------------------------+  ¦
¦  ¦ S2P.Tray (.NET 8 Windows System Tray App)                   ¦  ¦
¦  ¦ - Realtime Cloud Connectivity Status                        ¦  ¦
¦  ¦ - Discovered Printers & Hardware Telemetry                  ¦  ¦
¦  ¦ - Single-Click Pairing & Diagnostic Test Page               ¦  ¦
¦  +-------------------------------------------------------------+  ¦
¦                                 ¦ Windows Driver Subsystem        ¦
¦  +------------------------------?------------------------------+  ¦
¦  ¦                   WINDOWS PRINT SPOOLER                     ¦  ¦
¦  +------------------------------+------------------------------+  ¦
+---------+-----------------------+-----------------------+---------+
          ¦ Direct USB            ¦ Local LAN / Wi-Fi     ¦ Ethernet / TCP-IP
          ?                       ?                       ?
    [USB Printer]           [Wi-Fi Printer]        [Network MFP Copier]
   (e.g. Canon B&W)        (e.g. Epson Color)      (e.g. Ricoh / Xerox)
```

---

## 2. Core Applications & Services

1. **S2P Customer Web / PWA (`apps/web` / `/s/:shopSlug`):**
   - Lightweight, fast, mobile-optimized for Android Chrome and iOS Safari.
   - Accessed by scanning the physical shop counter QR standee.
   - Automatically binds the customer session to **Shakeel Online Services**.
   - Handles file upload, page count calculation, print options selection, live pricing, and token generation.

2. **S2P Shop Dashboard (`apps/web` / `/dashboard`):**
   - High-contrast, responsive desktop terminal for shop operators.
   - **Orders Board:** Real zero-state Kanban/table tracking active customer jobs.
   - **Counter POS:** Fast single-screen order entry for walk-in counter customers.
   - **Print Queue:** Realtime monitor of pending, claimed, spooling, and completed jobs.
   - **Printer Center:** Windows PC agent pairing status, discovered queues, and hardware health.
   - **Pricing Engine:** Rate cards, finishing fees, and volume discount slabs.
   - **Settings:** Business profile, UPI payee configuration, and file retention policy.

3. **Cloud Functions Backend (`functions/`):**
   - Authoritative business logic tier:
     - Pure authoritative price calculation (prevents client-side price tampering).
     - Single-use, time-bounded 6-digit device pairing code verification.
     - Cash and Manual UPI payment verification state transitions.
     - Document hash verification and automated purge jobs.

4. **Shared Domain Engine (`packages/shared` — `@s2p/shared`):**
   - Isomorphic TypeScript library shared across web frontend, Cloud Functions, and node runtimes.
   - Contains:
     - Domain entity models (Shops, Orders, PrintJobs, Printers, Devices, Audit).
     - Zod validation schemas for all inputs.
     - Deterministic pricing engine with slab calculations and finishing add-ons.
     - Formal Order and Print Job finite state machines with transition guards.
     - Strict allow-listed agent command catalog (`ALLOWED_AGENT_COMMANDS`).

5. **S2P Windows Print Agent (`agent/` — .NET 8):**
   - **`S2P.PrintService`:** Unattended Windows Service that starts automatically with Windows, maintains heartbeat, claims print jobs with lease locks, downloads encrypted payload to temporary storage, verifies SHA256 integrity, submits to Windows Print Spooler, and reports hardware progress.
   - **`S2P.Tray`:** Windows system tray utility for operator monitoring, device pairing, diagnostic logs, and manual test prints.
   - **`S2P.Shared`:** C# domain contracts, Windows `winspool.drv` bindings, and SQLite durable offline execution log.

---

## 3. Multi-Tenant Model

S2P is architected from day one as a multi-tenant platform. While **Shakeel Online Services** is the initial pilot tenant, all database documents, storage paths, and agent communication strictly isolate data by `organizationId` and `shopId`.

### Data Hierarchy:
```
organizations/{organizationId}
  +-- shops/{shopId}
        +-- members/{memberId}
        +-- pricingRules/{ruleId}
        +-- orders/{orderId}
        ¦     +-- items/{itemId}
        +-- printJobs/{printJobId}
        ¦     +-- attempts/{attemptId}
        +-- devices/{deviceId}
        +-- printers/{printerId}
        +-- pairingCodes/{code}
        +-- auditLogs/{logId}
```

---

## 4. Finite State Machines

### 4.1 Order Lifecycle
```
[DRAFT] --? [FILE_PROCESSING] --? [CONFIGURED] --? [AWAITING_PAYMENT]
                                                          ¦
                                     +-------------------------------+
                                     ?                               ?
                             [PAYMENT_FAILED]                    [RECEIVED]
                                     ¦                               ¦
                                     ?                               ?
                                [CANCELLED]                      [ACCEPTED]
                                                                     ¦
                                                                     ?
                                                             [QUEUED_FOR_PRINT]
                                                                     ¦
                                                                     ?
                                                                 [PRINTING]
                                                                     ¦
                                             +---------------------------------------+
                                             ?                                       ?
                                        [FINISHING]                               [READY]
                                             ¦                                       ¦
                                             ?                                       ?
                                          [READY] -----------------------------? [COMPLETED]
                                                                                     ¦
                                                                                     ?
                                                                             [REPRINT_REQUIRED]
```

### 4.2 Print Job Lifecycle
```
[QUEUED] --? [CLAIMED] --? [DOWNLOADING] --? [VALIDATING] --? [SPOOLING] --? [PRINTING] --? [COMPLETED]
                ¦                                                  ¦             ¦
                ?                                                  ?             ?
             [FAILED] ?----------------------------------------------------------¦
                ¦                                                                ?
                ?                                                         [STATUS_UNKNOWN]
          [RETRY_PENDING] --? [QUEUED]                                           ¦
                                                                                 ?
                                                                      (Operator Confirmation)
                                                                       +--? [COMPLETED]
                                                                       +--? [FAILED]
```

---

## 5. Security & Privacy Guarantees

1. **Zero Client Authority Over Price:** Authoritative prices are computed exclusively server-side.
2. **Strict Private Storage:** Customer files are stored in private Cloud Storage buckets accessible only by authenticated shop staff and paired print agents.
3. **Automated Document Purging:** Successful prints are purged after 2 hours (configurable). Unpaid uploads expire after 24 hours.
4. **No Remote Code Execution (RCE):** The Windows Print Agent only executes allow-listed commands (`SYNC_PRINTERS`, `JOB_AVAILABLE`, `CANCEL_JOB`, `RUN_TEST_PRINT`, `REFRESH_SETTINGS`). Arbitrary CMD or PowerShell execution is architecturally impossible.
