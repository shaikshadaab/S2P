# S2P — Critical Printer Architecture & Connection Guide

**Product Name:** S2P (Scan 2 Print)  
**Target Shop:** Shakeel Online Services  
**Operating Principle:** Universal Windows Print Queue Compatibility Layer

---

## 1. The Fundamental Architecture Rule

> **IF A PRINTER IS CORRECTLY INSTALLED IN WINDOWS AND WINDOWS CAN PRINT A TEST PAGE TO IT, THE S2P PRINT AGENT CAN DISCOVER AND PRINT TO THAT PRINTER QUEUE.**

### Realistic Compatibility Standard:
Competitor marketing often makes claims like *"100% universal printer compatibility"*. S2P avoids deceptive claims:
- S2P does **not** write vendor-specific proprietary firmware drivers for every printer model.
- Instead, S2P uses the native **Windows Print Spooler Subsystem** (`winspool.drv` and `System.Drawing.Printing`).
- As long as the manufacturer's Windows driver works and can print from Notepad or Windows Test Page, S2P can dispatch compatible PDF and image jobs to that print queue.

### Supported Hardware Categories:
- **Canon** (e.g. LBP2900, MF series, ImageRUNNER)
- **Epson** (e.g. EcoTank L3210, L8050 Photo, WorkForce)
- **HP** (e.g. LaserJet 1020, OfficeJet, Color LaserJet)
- **Brother** (e.g. HL series, DCP multi-function)
- **Ricoh** (e.g. Aficio, MP / IM commercial copiers)
- **Xerox** (e.g. VersaLink, AltaLink, WorkCentre)
- **Kyocera / Konica Minolta / Sharp / Toshiba**
- **TVS & POS thermal receipt printers**

---

## 2. Printer Connection Topologies

### 2.1 USB Printer (Without Wi-Fi / Offline Hardware)

This is the standard cyber-cafe setup in India. The printer itself has **no Wi-Fi, no Ethernet port, and no Internet connection**.

```
CUSTOMER MOBILE PHONE
        │
        │ Internet (HTTPS)
        ▼
   S2P CLOUD
        │
        │ WebSocket / Poll
        ▼
SHOP WINDOWS PC running S2P.PrintService
        │
        │ USB 2.0 / 3.0 Cable
        ▼
 PHYSICAL USB PRINTER (e.g. Canon LBP2900)
```

**Setup Workflow:**
1. Connect printer to shop computer via USB cable.
2. Install manufacturer Windows driver.
3. Open Windows Settings ➔ Printers ➔ Print Test Page.
4. Launch S2P Print Agent. The agent enumerates Windows queues and detects the USB port (e.g. `USB001`).
5. Run S2P Test Print to confirm cloud-to-hardware execution.
*The printer hardware never requires Internet access.*

---

### 2.2 Wi-Fi Connected Printer

Printer and shop PC reside on the same Local Area Network (LAN).

```
             SHOP ROUTER
             /         \
            /           \
     WINDOWS PC      WIFI PRINTER
  (S2P Print Agent)  (e.g. Epson L8050)
```

**Setup Workflow:**
1. Connect printer to shop Wi-Fi network.
2. In Windows on the shop PC, add printer using manufacturer network installer or IP address.
3. Confirm Windows print spooler can reach the device.
4. S2P discovers the detected network printer queue.

---

### 2.3 Ethernet / Large Office Copier (MFP)

Commercial Xerox, Ricoh, or Konica Minolta copiers connected via CAT6 Ethernet cable to the shop router.

```
COPIER (MFP)
   │ Ethernet Cable
   ▼
ROUTER / SWITCH
   │
   ▼
WINDOWS PC (running S2P Print Agent)
```

**Setup Workflow:**
1. Connect copier to router with Ethernet cable.
2. Assign static IP address to copier (e.g. `192.168.1.50`).
3. In Windows: Add Printer ➔ Standard TCP/IP Port (`192.168.1.50`) ➔ Select PCL6 / PostScript driver.
4. Print Windows Test Page.
5. S2P discovers the Windows queue and reads capabilities (A3/A4, Duplex, B&W/Color).

---

### 2.4 Multiple Printers on a Single PC

A single S2P Print Agent running on one shop PC can manage multiple print queues simultaneously across different physical connection types:

```
S2P-PC (running S2P.PrintService)
├── USB      → Canon LBP2900 (A4 B&W)
├── Wi-Fi    → Epson L8050 (A4 Color / Photo)
├── Ethernet → Ricoh Aficio MP 3054 (Duplex A4/A3 Copier)
└── USB      → TVS LP 46 Neo (Thermal Receipt)
```

The agent discovers each Windows print queue, queries capabilities, and registers all available printers with Shakeel Online Services.

---

## 3. Multiple Computers & Distributed Setup

A single shop can run multiple S2P Print Agents simultaneously across different computers under the same shop tenant (**Shakeel Online Services**):

| Host PC | Connection | Printers Installed | Role |
| :--- | :--- | :--- | :--- |
| **COUNTER-PC** | USB | 1. Canon LBP2900 (B&W A4)<br>2. TVS Thermal Receipt | Walk-in counter receipts & quick single-page documents |
| **PRINT-PC** | Wi-Fi + LAN | 1. Epson L8050 (Color Photo)<br>2. Ricoh Aficio MP 3054 (Duplex A4/A3 Copier) | Heavy production jobs, photo sheets, duplex bulk printing |

Both computers pair with **Shakeel Online Services**. The cloud dashboard displays the live health and ready status of each device and its attached print queues.

---

## 4. Automatic Printer Routing Engine (Architecture)

When a print job is dispatched, S2P matches job requirements against online printer capabilities:

```
Customer Order Settings:
- Paper: A4
- Color: BW
- Sides: Duplex (Double Sided)

Evaluating Printers:
1. Canon LBP2900:  [A4: YES] [BW: YES] [Duplex: NO]  ➔ INELIGIBLE
2. Ricoh MP 3054:  [A4: YES] [BW: YES] [Duplex: YES] ➔ SELECTED & DISPATCHED
```

---

## 5. Duplicate Print Protection & Recovery

**Mandatory Guarantee:** S2P guarantees that network drops or computer restarts NEVER silently duplicate physical prints.

1. **Atomic Lease:** An agent must atomically claim a job with an expiring lease ID before spooling.
2. **Durable Local Journal (SQLite):** The agent records the claim and Windows spooler job ID locally.
3. **STATUS_UNKNOWN Handling:** If connection drops while spooling, the job enters `STATUS_UNKNOWN`. The dashboard alerts staff with two choices:
   - **Mark as Printed** (if paper physically came out).
   - **Reprint** (creates a new audited print attempt).

---

## 6. The Final Acceptance Test (Physical Verification Standard)

A feature or phase is complete only when the complete underlying physical workflow actually works:

```
Customer Phone
   ↓ Scan Counter QR
Open Shakeel Online Services S2P
   ↓ Real PDF/Image Upload
Server detects correct page count
   ↓ Select A4 / B&W / Duplex / Copies
Server calculates authoritative price
   ↓ Pay via Cash / Manual UPI
Owner / Staff accepts order at counter
   ↓ Cloud creates printJob
S2P Windows Agent receives printJob
   ↓ Correct Windows printer selected (e.g. Canon/Ricoh)
Physical paper prints from printer
   ↓ Spooler reports completion
Dashboard status updates to READY
   ↓ Customer sees READY on phone
Temporary customer file gets purged from storage
```

**When this end-to-end flow executes physically without simulation = S2P Production MVP.**
