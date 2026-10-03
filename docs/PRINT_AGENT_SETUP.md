# Windows Print Agent Setup & Diagnostics
> **apps/print-agent (Electron Desktop Application)**

---

## 1. Overview
The Vintha Print Agent is a lightweight, background Windows service application that connects local physical USB/Network printers to the Vintha cloud print queue.

### Core Capabilities
- **Native Hardware Discovery:** Discovers all connected Windows printers via `Get-CimInstance Win32_Printer`.
- **Silent Printing:** Sends print jobs directly to the Windows Spooler without showing the OS print dialog.
- **Virtual Test Spooler:** Emulates printing by saving files and manifests to `%USERPROFILE%/vintha-print-output` for risk-free testing without paper waste.
- **Heartbeat & Self-Healing:** Transmits a heartbeat every 25 seconds and auto-reconnects after network disruptions.
- **Privacy Shredder:** Automatically deletes downloaded customer files from local disk immediately after submission to the spooler.
- **System Tray Integration:** Runs discreetly in the Windows notification tray with pause, test print, and diagnostics shortcuts.

---

## 2. System Requirements
- **Operating System:** Windows 10 (64-bit) or Windows 11 (64-bit).
- **RAM:** Minimum 512 MB available.
- **Hardware Drivers:** Manufacturer printer drivers installed (HP, Canon, Epson, Brother, Ricoh, Xerox, Konica Minolta).

---

## 3. Installation & Pairing Workflow

1. **Launch the Agent:**
   Open the Vintha Print Agent desktop application.
2. **Retrieve Pairing Code:**
   In the Vintha Shop Dashboard, navigate to **Printer Setup** -> Click **Add Print Computer**. A 6-digit code will appear (valid for 10 minutes).
3. **Submit Pairing Code:**
   Enter the 6-digit code in the agent window and click **Pair Computer**.
4. **Select Active Printer:**
   The agent detects your Windows printers. Select your primary Xerox/printer or leave **Virtual Spooler Test Mode** checked for test verification.
5. **Run Test Print:**
   Click **Send Test Print** to verify end-to-end spooling.

---

## 4. File Locations & Logs

| Item | Location |
|---|---|
| Configuration | `%APPDATA%\VinthaPrint\agent-config.json` |
| Local Logs | `%APPDATA%\VinthaPrint\logs\agent.log` |
| Temp Download Buffer | `%APPDATA%\VinthaPrint\temp\` |
| Virtual Spooler Output | `%USERPROFILE%\vintha-print-output\` |

---

## 5. Troubleshooting & Diagnostics

- **Queue Paused:** If the status dot is orange, click "Resume Print Queue".
- **Agent Offline in Dashboard:** Check internet connectivity and verify `%APPDATA%\VinthaPrint\logs\agent.log`.
- **Export Diagnostics:** Click **Export Diagnostics** in the agent UI to copy full OS info, hardware printer statuses, and error traces to your clipboard.