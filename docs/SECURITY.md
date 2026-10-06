# S2P — System Security & Privacy Architecture

**Product Name:** S2P (Scan 2 Print)  
**Shop:** Shakeel Online Services  
**Compliance Standard:** Zero-Trust Customer File Handling & Safe Print Agent Operation

---

## 1. Print Agent Security: Absolute Prohibitions

The S2P Windows Print Agent runs on shop computers and connects to physical Windows queues. It must NEVER serve as an attack vector.

### STRICTLY FORBIDDEN:
1. **NO Remote Shell / Command Prompt:** The cloud backend can NEVER trigger `cmd.exe` execution.
2. **NO Remote PowerShell:** The agent contains NO PowerShell invocation endpoints.
3. **NO Arbitrary Executables:** The agent CANNOT download or execute arbitrary `.exe`, `.msi`, or `.bat` scripts from the cloud.
4. **NO Arbitrary File Browsing:** The agent cannot browse or exfiltrate desktop, documents, or personal folders.
5. **NO Macro Execution:** Customer Office documents must never run VBA macros.

### Allow-Listed Cloud Commands:
Only the following strongly-typed commands are accepted by `S2P.PrintService`:
- `SYNC_PRINTERS`: Enumerate installed Windows print queues.
- `JOB_AVAILABLE`: Signal that a new print job is ready for atomic lease claim.
- `CANCEL_JOB`: Cancel a pending or spooled job in the Windows print spooler.
- `RUN_TEST_PRINT`: Print the standardized S2P diagnostic test sheet.
- `REFRESH_SETTINGS`: Update polling intervals and shop metadata.

---

## 2. Customer File Privacy & Zero-Trust Storage

1. **Private Storage Only:** Customer files are stored in private Cloud Storage. Public download URLs are never generated.
2. **Automated Purging Policy:**
   - Successfully printed documents are automatically deleted after **2 hours**.
   - Unpaid or abandoned uploads are purged after **24 hours**.
   - Order metadata, financial records, and audit logs are retained permanently.
3. **Protected Local Agent Temp:**
   - The Windows Agent downloads documents into `%LOCALAPPDATA%\S2P\PrintTemp`.
   - Files are securely deleted immediately following spooler submission and retention verification.
4. **Operator Privacy:** Shop staff does not need to open or browse customer files. The S2P system renders and submits documents directly to the Windows print queue.

---

## 3. Database & Network Security

1. **Firestore Security Rules:** Multi-tenant isolation is enforced at the database security rule layer.
2. **Price Immutability:** Calculated prices are signed/stamped by Cloud Functions. Clients cannot alter totals.
3. **Payment Verification:** Manual UPI payments must be verified by staff before entering the physical print queue.
