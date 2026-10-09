# Dependencies and Licenses — SOS Print

This document records all production runtime dependencies and licenses used across the SOS Print monorepo.

## 1. Web Application (apps/web)
| Package | Version | License | Purpose |
|---|---|---|---|
| next | 14.2.35 | MIT | React framework (App Router) |
| react | 18.3.1 | MIT | UI library |
| react-dom | 18.3.1 | MIT | React DOM renderer |
| typescript | 5.6.2 | Apache-2.0 | Type safety |
| tailwindcss | 3.4.13 | MIT | Utility-first CSS styling |
| lucide-react | 0.446.0 | ISC | Open-source SVG icons |
| firebase | 10.14.1 | Apache-2.0 | Client Firebase SDK (Auth) |
| firebase-admin | 12.6.0 | Apache-2.0 | Server-side Firestore & Storage Admin SDK |
| pdf-lib | 1.17.9 | MIT | Client/Server PDF parsing & rendering |
| razorpay | 2.9.4 | MIT | Razorpay payment gateway integration |
| qrcode | 1.5.4 | MIT | QR code generation |
| zod | 3.23.8 | MIT | Schema validation |

## 2. Shared Contracts (packages/shared)
| Package | Version | License | Purpose |
|---|---|---|---|
| zod | 3.23.8 | MIT | Shared data contracts & validators |
| pdf-lib | 1.17.9 | MIT | Imposition & resume generation |

## 3. Windows Print Agent (apps/agent)
| Component | Version | License | Purpose |
|---|---|---|---|
| .NET 8 LTS | 8.0.x | MIT | Windows runtime platform |
| Microsoft.Data.Sqlite | 8.0.8 | MIT | Durable local attempt journal |
| System.Drawing.Common | 8.0.8 | MIT | GDI+ Spooler printing & page rendering |
| System.Security.Cryptography.ProtectedData | 8.0.0 | MIT | Windows DPAPI device credential protection |

## 4. Licensing Invariants
- Zero Unlicensed Proprietary SDKs: Every library used is licensed under standard open-source licenses (MIT, Apache-2.0, ISC).
- No Commercial Cloud Conversion Subscriptions: Office document conversion and imposition run via open-source OpenXML parsing and local renderers without recurring third-party SaaS fees.
