# S2P — Local Recovery & Developer Runbook

This guide explains how to start, test, and restore the entire S2P (Scan 2 Print) platform locally on the Windows PC without external dependencies.

---

## 1. Local Runtime Endpoints

| Service | Address | Intended User |
|---|---|---|
| **PC Web App (Localhost)** | `http://localhost:3000` | Shopkeeper PC Browser |
| **Customer Shop (Wi-Fi Phone)** | `http://192.168.1.123:3000/s/shakeel-online-services` | Customer Phone on Same Wi-Fi |
| **Staff Dashboard** | `http://localhost:3000/dashboard` | Counter Staff / Owner |
| **Order Tracking** | `http://192.168.1.123:3000/track/<orderId>` | Customer Phone |
| **Firebase Emulator UI** | `http://localhost:4000` | Developer Inspection |
| **Firestore Emulator** | `0.0.0.0:8080` | Local Database |
| **Auth Emulator** | `0.0.0.0:9099` | Local Authentication |
| **Storage Emulator** | `0.0.0.0:9199` | Local File Bucket |

*Note: `192.168.1.123` is the detected LAN IP of the host Windows PC. If your Wi-Fi router assigns a different IP, check with `ipconfig` in PowerShell and update the URL.*

---

## 2. Daily Startup Sequence

Open **PowerShell** in the repository root (`browser/`):

### Step A: Start Firebase Emulators
```powershell
firebase emulators:start
```
*(Verify Emulator UI is accessible at `http://localhost:4000`)*

### Step B: Start Next.js Web Server (Bound to LAN)
In a second PowerShell terminal:
```powershell
npm.cmd run dev
```
*(Bound to `0.0.0.0:3000` so mobile phones on the same Wi-Fi can open `http://192.168.1.123:3000/s/shakeel-online-services`)*

### Step C: Test .NET 8 Agent
In a third PowerShell terminal:
```powershell
dotnet test apps/agent/tests/S2P.Agent.Tests/S2P.Agent.Tests.csproj
```

---

## 3. Testing PhonePe / Manual UPI Flow Locally

1. Open `http://localhost:3000/dashboard/settings` on the PC.
2. Under **Manual UPI & PhonePe Settings**, verify/enter:
   - **UPI ID:** e.g. `shakeel@ybl`
   - **Merchant Name:** `Shakeel Online Services`
   - **Display Label:** `PhonePe / UPI`
   - Click **Save Payment Settings**.
3. Open `http://192.168.1.123:3000/s/shakeel-online-services` on a mobile phone connected to the same Wi-Fi.
4. Upload a document (PDF or photos), select settings, and click **Place Order**.
5. The order tracking page opens with a **real deterministic UPI QR** and a **Pay with PhonePe / UPI App** button.
6. The customer taps **I'VE PAID** (optionally entering UTR). Status updates to **Waiting for Payment Verification** (NOT auto-printed!).
7. On the shop PC Dashboard (`http://localhost:3000/dashboard/orders`), switch to the **Pending Verification** tab.
8. Staff inspects their actual PhonePe app/SMS, confirms receipt, and clicks **[ Confirm Payment ]**.
9. The order transitions to **PAID** and queues for printing safely.

---

## 4. Git Recovery & Checkpoints

Local git history is maintained after every PASS phase. No push to remote GitHub occurs until Phase 22.

To inspect checkpoints:
```powershell
git log --oneline -n 10
```

To discard uncommitted experiments and return to last known safe checkpoint:
```powershell
git status
```
*(Never run `git reset --hard` or destructive cleans without creating a local branch or backup first).*

---

## 5. Windows Firewall Troubleshooting

If a phone on the same Wi-Fi cannot open `http://192.168.1.123:3000`:
1. Ensure the Wi-Fi connection profile in Windows is set to **Private Network** (not Public).
2. Allow Node.js on port `3000` on the private network if prompted by Windows Firewall.
3. Do NOT disable the entire Windows Firewall.

---

## 6. Firebase Emulator LAN Security Protocol

1. **Local-Only Scope:** All emulator services (`0.0.0.0:8080`, `0.0.0.0:9099`, `0.0.0.0:9199`, `0.0.0.0:4000`) are bound for same-subnet Wi-Fi development only.
2. **Never Expose to Internet:**
   - NO router port forwarding for emulator ports or port 3000.
   - NO public reverse proxy or tunneling (e.g., ngrok, Cloudflare Tunnel) during development.
3. **Network Profile:** Ensure the PC network profile is set to **Private Network** in Windows Settings. Do NOT disable Windows Firewall globally.
4. **Data Isolation:** Emulators contain zero real production customer data or live banking secrets. All test data resides in local memory.