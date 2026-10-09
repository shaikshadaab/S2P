# SOS Print — Shakeel Online Services

Complete single-shop printing website and Windows print system for **Shakeel Online Services**, Guntur, Andhra Pradesh.

## 1. Shop & Software Identity
- **Visible Customer Name:** Shakeel Online Services
- **Internal Software Name:** SOS Print
- **Tagline:** Printing at Shakeel Online Services
- **Location:** Guntur, Andhra Pradesh
- **Confirmed WhatsApp Contact:** +91 95815 29381 ([wa.me/919581529381](https://wa.me/919581529381))
- **Server Shop ID:** shakeel-online-services
- **Firebase Project:** shakeel-online-services-951ec
- **Deployment Repository:** https://github.com/shaikshadaab/shakeel123.git
- **Preferred Vercel Project:** sos-print

## 2. Architecture & Technology Stack
- **Customer Website & Staff APIs:** Next.js App Router + TypeScript (deployed on Vercel)
- **Styling & UI:** Light theme, emerald green accents (#059669), readable charcoal text (#111827), Lucide SVG icons
- **Authentication:** Firebase Authentication (for approved owner/staff)
- **Database:** Google Cloud Firestore (Admin SDK on server with fail-closed RBAC)
- **Document Storage:** Private Firebase Storage bucket with scoped grants and lifecycle purge
- **Payment Gateway:** Razorpay Checkout + server-side HMAC verification + raw webhook processing + Counter Cash & Manual UPI review
- **Windows Print Agent:** .NET 8 LTS Windows user-session tray application using Windows Print Spooler with DPAPI credentials and SQLite journal

## 3. Public Routes & Customer Hub
- / — Public Shop Homepage (Hero, Services, How it Works, Rates, Previews, FAQ, Contact, Footer)
- /services — Complete catalog of 10 printing services
- /rates — Authoritative integer-paise shop pricing and interactive calculator
- /how-to-print — 4-step bilingual customer instructions
- /about — Shop information and privacy commitments
- /contact — Confirmed shop address, business hours, and WhatsApp link
- /privacy — Privacy policy and document retention rules
- /terms — Terms of service and counter refund policies
- /print — Full-featured self-service mobile printing hub
- /photo-studio — Photo editing and passport photo layouts
- /resume — 6 ATS-friendly resume templates with searchable PDF export
- /scan — Phone camera document scanning with contrast enhancement
- /id-card — ID card front and back imposition (CR80 standard)
- /login & /dashboard — Private owner dashboard (Orders, Queue, Rates, Printers, Payments, Settings, Reports, Staff, Diagnostics)

## 4. Local Development & Testing
`ash
# Run automated shared tests (215 tests)
npm.cmd test

# Run .NET agent tests (7 tests)
dotnet test apps/agent/S2P.Agent.sln

# TypeScript typecheck
npm.cmd run typecheck

# Next.js Production Build
npm.cmd --workspace=apps/web run build

# Start local development server
npm.cmd --workspace=apps/web run dev
`

## 5. Windows Agent Package
- **Direct Download:** http://localhost:3000/SOS-Print-Agent-Package.zip (5.0 MB)
- **Prerequisites:** Windows 10/11 (64-bit), .NET 8.0 Windows Desktop Runtime (x64)
- **Contents:** Worker executable, install-agent.bat, start-agent.bat, uninstall-agent.bat, and README.md
