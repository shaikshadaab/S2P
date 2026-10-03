# Security, Compliance & Data Privacy Architecture
> **Vintha Print Platform**

---

## 1. Zero-Trust Document Security

Commercial print shops regularly handle sensitive customer records (Aadhaar cards, PAN cards, bank statements, legal affidavits, marksheets). Vintha Print applies strict confidentiality controls:

1. **No Public Storage:** Customer uploads are strictly saved in private cloud storage. Direct public file URLs are completely forbidden.
2. **Short-Lived Signed Download URLs:** Print agents only receive temporary signed URLs that expire within 15 minutes.
3. **Cryptographic Checksum Verification:** Every file is hashed with SHA-256 on upload. The desktop agent validates this hash before spooling to ensure zero in-transit tampering.
4. **Immediate Local Shredding:** As soon as the document is spooled to the Windows print queue, the desktop agent immediately shreds the local temporary file from disk (`fs.unlinkSync()`).
5. **Configurable Cloud Retention:** Uploads are permanently deleted from private cloud storage after the shop's configured retention window (default 24 hours, configurable down to 1 hour).
6. **No Owner Snooping:** Print shop owners cannot download or archive customer documents after the retention period. Only order audit metadata (amount, pages, timestamp) remains for accounting.

---

## 2. Payment & Financial Security

- **Server-Authoritative Pricing:** The customer's mobile browser is never trusted with price calculations. The backend recalculates exact sheet and side counts directly from the validated file metadata.
- **Strict Transition Invariant:** An order cannot transition to `QUEUED` or print without cryptographically verified payment status from PhonePe.
- **HMAC-SHA256 Webhook Verification:** Every payment webhook is validated against the merchant salt key and salt index.
- **Idempotency Keys:** Duplicate webhook events or payment retries are rejected safely without double-charging or double-printing.

---

## 3. Hardware & Device Security

- **Revocable Device Tokens:** Computers authenticate with 64-character hashed tokens. If a computer is decommissioned, the owner can revoke its access from the dashboard instantly.
- **Single-Use Pairing Codes:** 6-digit pairing codes expire in 10 minutes and can only be claimed once.
- **Zero Browser USB Access:** Browsers never communicate with local printers directly, mitigating USB malware and drive-by attacks.

---

## 4. Reporting Security Vulnerabilities

To report a vulnerability, please email `security@vintha.ai`.