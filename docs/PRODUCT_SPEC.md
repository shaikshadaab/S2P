# SOS Print — Product Specification

**Business:** Shakeel Online Services, Guntur, Andhra Pradesh  
**Software Name:** SOS Print  
**Scope:** Single Physical Shop Print Spooler & Customer Portal  

---

## 1. System Vision
SOS Print allows customers visiting Shakeel Online Services to scan a QR code at the shop counter, upload documents or photos from their smartphone, select printing preferences (B&W/color, copies, duplex, paper size, orientation), receive an authoritative quote in integer paise, pay via Cash, Direct UPI QR, or Razorpay, and automatically route the job to the shop's Windows PC attached printers.

## 2. Customer Touchpoints
1. **QR Code Standee:** Placed at the counter; points to the shop printing portal (/print or /s/shakeel-online-services).
2. **Customer Web Portal (PWA):**
   - Clean white & emerald green design.
   - Zero login or app installation required.
   - Anonymous session secured with a high-entropy cryptographically random draft token.
   - Multi-file basket supporting up to 10 files.
   - Preflight inspection displaying verified page counts, file formats, and estimated output sheets.
   - Document services: PDF, images, A4 photo grids (1, 2, 4, 6, 9, 12 slots), passport photo repeat sheets (4x6 / A4), 6 resume templates, ID front/back copy layout, mini print (2-up, 4-up).
   - Real-time order tracking page (/track/[orderId]) with step-by-step progress: Uploaded -> Paid -> Queued -> Printing -> Completed.

## 3. Owner & Staff Operations
1. **Private Owner Dashboard:**
   - Single shop administration at /dashboard.
   - Sections: Live Queue, Orders History, Pricing/Rates, Printer Management & Device Pairing, Standee & QR Generation, Financial Reports, Settings.
   - Role-Based Access: Owner (full privileges) and Staff (Counter Staff / Operator with queue actions and cash confirmation).
2. **Windows Desktop Agent:**
   - .NET 8 LTS background worker / tray application running on the shop's main Windows PC.
   - Connects to Next.js backend via outbound HTTPS only (no port forwarding, no router setup required).
   - Encrypts device pairing credentials using Windows Data Protection API (DPAPI).
   - Syncs installed Windows print spooler drivers and detects physical vs. virtual queues.
   - Atomically claims print jobs with expiring leases and local SQLite journal protection.
   - Renders and dispatches print jobs directly to the Windows Spooler.