# Database Schema & Relational Architecture
> **PostgreSQL (Supabase Engine)**  
> Migration File: `supabase/migrations/20261002000001_initial_vintha_schema.sql`

The Vintha Print database architecture consists of 24 relational tables enforcing multi-tenant isolation, immutable financial ledgers, audit logs, and hardware device binding.

---

## 1. Core Tables Summary

| # | Table Name | Purpose | Key Constraints |
|---|---|---|---|
| 1 | `profiles` | User accounts (Shop owners, staff, platform admins) | PK `id` -> `auth.users` |
| 2 | `shops` | Registered print shops & unique public URLs | Unique `slug`, Index on `owner_id` |
| 3 | `shop_members` | Staff and manager invitations & roles | Composite Unique `(shop_id, user_id)` |
| 4 | `shop_settings` | Operational toggles (auto-print, file size, retention) | PK `shop_id` |
| 5 | `pricing_rules` | Rates for A4/A3, B&W, Color, Duplex, Service fee | PK `shop_id` |
| 6 | `payment_configs` | Encrypted PhonePe merchant credentials | PK `shop_id` |
| 7 | `devices` | Paired Windows desktop computers | Unique `device_token_hash`, Index on `shop_id` |
| 8 | `printers` | Detected hardware printers per device | Index on `device_id` |
| 9 | `pairing_codes` | Temporary 6-digit codes (10 min TTL) | Unique `code`, Index on `expires_at` |
| 10 | `customer_uploads`| Private document metadata & retention timestamps | Index on `(shop_id, expires_at)` |
| 11 | `orders` | Customer print orders & authoritative price snapshots | Unique `order_number`, Index on `(shop_id, status)` |
| 12 | `order_items` | Granular breakdown per document in an order | Index on `order_id` |
| 13 | `print_jobs` | Hardware queue records & atomic leases | Index on `(shop_id, status, lease_expires_at)` |
| 14 | `job_events` | Immutable state transition audit trail | Index on `(order_id, created_at)` |
| 15 | `payments` | PhonePe payment transactions & gateway IDs | Unique `merchant_transaction_id` |
| 16 | `refunds` | Refund requests, reasons, and gateway states | Index on `order_id` |
| 17 | `earnings_ledger` | Double-entry accounting for shop earnings & fees | Index on `shop_id` |
| 18 | `settlements` | Payout batches and bank transfers | Index on `(shop_id, status)` |
| 19 | `plans` | SaaS tier definitions (Free, Pro, Business) | PK `id` (seeded) |
| 20 | `subscriptions` | Active shop subscription status | Index on `(shop_id, status)` |
| 21 | `notifications` | In-app alerts for orders, offline printers, errors | Index on `(shop_id, is_read)` |
| 22 | `support_tickets` | Customer and owner help desk tickets | Index on `shop_id` |
| 23 | `audit_logs` | Platform-wide security actions (admin access, deletes) | Index on `created_at` |
| 24 | `webhook_events` | Idempotency log for PhonePe webhook payloads | Unique `event_id` |

---

## 2. Enums & Types

- `user_role`: `owner`, `staff`, `admin`
- `order_status`: `DRAFT`, `AWAITING_PAYMENT`, `PAYMENT_PENDING`, `PAID`, `QUEUED`, `CLAIMED`, `DOWNLOADING`, `PRINTING`, `COMPLETED`, `FAILED`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED`
- `print_job_status`: `QUEUED`, `CLAIMED`, `DOWNLOADING`, `DOWNLOADED`, `PRINTING`, `SUBMITTED_TO_SPOOLER`, `COMPLETED`, `FAILED`
- `color_mode`: `bw`, `color`
- `paper_size`: `A4`, `A3`, `Photo`
- `payment_gateway`: `phonepe`, `sandbox`
- `payment_status`: `INITIATED`, `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`

---

## 3. High Performance Indexes

```sql
CREATE INDEX idx_shops_slug ON shops(slug);
CREATE INDEX idx_orders_shop_status ON orders(shop_id, status);
CREATE INDEX idx_orders_customer_mobile ON orders(customer_mobile);
CREATE INDEX idx_print_jobs_queue ON print_jobs(shop_id, status) WHERE status = 'QUEUED';
CREATE INDEX idx_print_jobs_lease ON print_jobs(lease_expires_at) WHERE status = 'CLAIMED';
CREATE INDEX idx_devices_heartbeat ON devices(shop_id, is_online, last_seen_at);
CREATE INDEX idx_customer_uploads_retention ON customer_uploads(expires_at) WHERE is_deleted = false;
```

---

## 4. Row Level Security (RLS) Highlights

- **Tenant Isolation:**
  ```sql
  CREATE POLICY "Owners and Staff can view own shop orders"
  ON orders FOR SELECT
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
      UNION
      SELECT shop_id FROM shop_members WHERE user_id = auth.uid()
    )
  );
  ```
- **Device Isolation:**
  Agents authenticate using the cryptographically hashed `device_token_hash` passed in the `x-device-token` request header.