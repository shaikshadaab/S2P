# SOS Print Windows Agent - Shakeel Online Services

This official Windows agent links physical printers connected to your shop PC in Guntur directly to the SOS Print cloud system (https://sos-print.vercel.app).

---

## 1. System Requirements (आवश्यकताएँ)
1. **Operating System:** Windows 10 or Windows 11 (64-bit).
2. **.NET 8 Runtime:** Microsoft .NET 8.0 Desktop Runtime (x64) installed.
   - Download: https://dotnet.microsoft.com/en-us/download/dotnet/8.0 (Select **.NET Desktop Runtime 8.0.x - Windows x64**).
3. **Printers:** Physical printers connected via USB or Local Network and installed in Windows Settings -> Printers & Scanners.

---

## 2. Quick Setup Steps (सेटअप करने के 3 आसान कदम)

### Step 1: Pair PC with Shop (दुकान से जोड़ें)
1. Double click **`pair-agent.bat`**.
2. Open your Owner Dashboard in browser:
   **https://sos-print.vercel.app/dashboard/printers**
3. Click **"Generate Pairing Code"** (6-digit code).
4. Enter this 6-digit code into the agent window and press Enter.
5. Your PC will pair securely using DPAPI encryption.

### Step 2: Start Printing Agent (प्रिंट एजेंट चालू करें)
- Double click **`start-agent.bat`**.
- The agent will discover your physical Windows printers, sync them to your dashboard, and start listening for paid print jobs.
- Status will display **ONLINE** on the dashboard.

### Step 3: Verify Physical Output (हार्डवेयर टेस्ट)
- To print a 1-page hardware test sheet immediately, double click **`run-controlled-test.bat`**.
- Check if the test sheet comes out of your printer tray.

---

## 3. Normal Shop Printing Flow (दुकान का सामान्य काम)
1. Customer scans QR standee poster at counter or opens **https://sos-print.vercel.app/print**.
2. Customer uploads document, chooses color/B&W, copies, and places order.
3. Unpaid order appears immediately in **Counter Terminal** (https://sos-print.vercel.app/dashboard/counter).
4. Customer hands Cash or scans direct Shop UPI QR at counter.
5. Shop staff clicks **"Confirm Cash Paid"** or **"Confirm UPI Paid"** on Counter.
6. The agent claims the job, checks SHA-256 integrity, submits to Windows Spooler, and physical paper prints.
7. Staff hands printed copies to customer and marks order complete.

---

## 4. Reset or Re-pair (डिवाइस रीसेट)
- To un-pair this computer, double click **`unpair-agent.bat`**.
