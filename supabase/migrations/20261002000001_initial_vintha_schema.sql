-- ====================================================================
-- VINTHA PRINT SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- Scan • Upload • Pay • Print
-- Complete Multi-tenant Automatic Print Shop SaaS Schema
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'staff', 'owner', 'platform_admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'DRAFT', 'AWAITING_PAYMENT', 'PAYMENT_PENDING', 'PAID',
    'QUEUED', 'CLAIMED', 'DOWNLOADING', 'PRINTING',
    'COMPLETED', 'FAILED', 'CANCELLED', 'REFUND_PENDING', 'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE print_job_status AS ENUM (
    'QUEUED', 'CLAIMED', 'DOWNLOADING', 'DOWNLOADED',
    'PRINTING', 'SUBMITTED_TO_SPOOLER', 'COMPLETED', 'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_mode AS ENUM ('platform', 'direct');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM ('INITIATED', 'SUCCESS', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'owner',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SHOPS
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  business_category TEXT NOT NULL DEFAULT 'Print & Stationery',
  mobile TEXT NOT NULL,
  whatsapp_number TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pin_code TEXT NOT NULL,
  google_maps_url TEXT,
  logo_url TEXT,
  gst_number TEXT,
  business_hours JSONB NOT NULL DEFAULT '{"monday":{"open":"09:00","close":"21:00","is_closed":false},"tuesday":{"open":"09:00","close":"21:00","is_closed":false},"wednesday":{"open":"09:00","close":"21:00","is_closed":false},"thursday":{"open":"09:00","close":"21:00","is_closed":false},"friday":{"open":"09:00","close":"21:00","is_closed":false},"saturday":{"open":"09:00","close":"21:00","is_closed":false},"sunday":{"open":"10:00","close":"18:00","is_closed":false}}'::jsonb,
  is_open BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);

-- 3. SHOP MEMBERS
CREATE TABLE IF NOT EXISTS shop_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'staff',
  permissions JSONB NOT NULL DEFAULT '{"can_view_jobs":true,"can_reprint":true,"can_manage_printers":false,"can_view_finances":false}'::jsonb,
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, user_id)
);

-- 4. SHOP SETTINGS
CREATE TABLE IF NOT EXISTS shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  max_file_size_mb INT NOT NULL DEFAULT 50,
  max_pages INT NOT NULL DEFAULT 200,
  allowed_file_types TEXT[] NOT NULL DEFAULT ARRAY['application/pdf', 'image/jpeg', 'image/png'],
  auto_print_enabled BOOLEAN NOT NULL DEFAULT true,
  manual_approval_mode BOOLEAN NOT NULL DEFAULT false,
  job_timeout_seconds INT NOT NULL DEFAULT 600,
  retention_hours INT NOT NULL DEFAULT 24,
  low_paper_warning BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRICING RULES
CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  a4_bw_single NUMERIC(8,2) NOT NULL DEFAULT 2.00,
  a4_bw_double NUMERIC(8,2) NOT NULL DEFAULT 1.50,
  a4_color_single NUMERIC(8,2) NOT NULL DEFAULT 10.00,
  a4_color_double NUMERIC(8,2) NOT NULL DEFAULT 8.00,
  a3_bw_single NUMERIC(8,2) NOT NULL DEFAULT 5.00,
  a3_color_single NUMERIC(8,2) NOT NULL DEFAULT 20.00,
  photo_single NUMERIC(8,2) NOT NULL DEFAULT 25.00,
  service_fee NUMERIC(8,2) NOT NULL DEFAULT 2.00,
  min_order_amount NUMERIC(8,2) NOT NULL DEFAULT 5.00,
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  max_allowed_pages INT NOT NULL DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PAYMENT CONFIGS
CREATE TABLE IF NOT EXISTS payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  mode payment_mode NOT NULL DEFAULT 'platform',
  merchant_id TEXT,
  client_id TEXT,
  client_secret_encrypted TEXT,
  client_version TEXT DEFAULT 'v1',
  environment TEXT NOT NULL DEFAULT 'sandbox',
  callback_url TEXT,
  webhook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. DEVICES (PRINT COMPUTERS)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  device_token_hash TEXT NOT NULL UNIQUE,
  computer_name TEXT NOT NULL,
  os_version TEXT,
  agent_version TEXT NOT NULL DEFAULT '1.0.0',
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  default_printer_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_shop_id ON devices(shop_id);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen_at);

-- 8. PRINTERS
CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  driver_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_online BOOLEAN NOT NULL DEFAULT true,
  is_color_supported BOOLEAN NOT NULL DEFAULT true,
  is_duplex_supported BOOLEAN NOT NULL DEFAULT true,
  supported_paper_sizes TEXT[] NOT NULL DEFAULT ARRAY['A4'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_printers_shop_id ON printers(shop_id);

-- 9. PAIRING CODES
CREATE TABLE IF NOT EXISTS pairing_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_by_device_id UUID REFERENCES devices(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_lookup ON pairing_codes(code, is_used, expires_at);

-- 10. CUSTOMER UPLOADS
CREATE TABLE IF NOT EXISTS customer_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  sha256_checksum TEXT NOT NULL,
  page_count INT NOT NULL DEFAULT 1,
  image_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_shop_id ON customer_uploads(shop_id);
CREATE INDEX IF NOT EXISTS idx_uploads_retention ON customer_uploads(expires_at, is_deleted);

-- 11. ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_upload_id UUID NOT NULL REFERENCES customer_uploads(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  customer_whatsapp TEXT,
  status order_status NOT NULL DEFAULT 'DRAFT',
  total_pages INT NOT NULL,
  printable_sides INT NOT NULL,
  physical_sheets INT NOT NULL,
  copies INT NOT NULL DEFAULT 1,
  color_mode TEXT NOT NULL DEFAULT 'bw',
  paper_size TEXT NOT NULL DEFAULT 'A4',
  is_duplex BOOLEAN NOT NULL DEFAULT false,
  duplex_mode TEXT NOT NULL DEFAULT 'long-edge',
  pages_per_sheet INT NOT NULL DEFAULT 1,
  page_range_text TEXT NOT NULL DEFAULT 'all',
  base_amount NUMERIC(10,2) NOT NULL,
  service_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  final_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  idempotency_key TEXT UNIQUE,
  price_snapshot JSONB NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_mobile ON orders(customer_mobile);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 12. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES customer_uploads(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL DEFAULT 'document',
  page_number_from INT NOT NULL,
  page_number_to INT NOT NULL,
  color_type TEXT NOT NULL,
  copies INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(8,2) NOT NULL,
  total_price NUMERIC(8,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. PRINT JOBS
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id),
  printer_id UUID REFERENCES printers(id),
  status print_job_status NOT NULL DEFAULT 'QUEUED',
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  claim_count INT NOT NULL DEFAULT 0,
  retry_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_dispatch ON print_jobs(shop_id, status, lease_expires_at);

-- 14. JOB EVENTS
CREATE TABLE IF NOT EXISTS job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  print_job_id UUID REFERENCES print_jobs(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_events_order_id ON job_events(order_id);

-- 15. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  phonepe_order_id TEXT NOT NULL UNIQUE,
  phonepe_transaction_id TEXT,
  amount_paise BIGINT NOT NULL,
  status payment_status NOT NULL DEFAULT 'PENDING',
  payment_method TEXT,
  checksum_verified BOOLEAN NOT NULL DEFAULT false,
  webhook_event_id TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_phonepe_order ON payments(phonepe_order_id);

-- 16. REFUNDS
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL,
  reason TEXT NOT NULL,
  status refund_status NOT NULL DEFAULT 'INITIATED',
  phonepe_refund_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. EARNINGS LEDGER
CREATE TABLE IF NOT EXISTS earnings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gross_amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_gateway_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  net_earnings NUMERIC(10,2) NOT NULL,
  settlement_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_shop_id ON earnings_ledger(shop_id);

-- 18. SETTLEMENTS
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  bank_account_last4 TEXT,
  transaction_ref TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. PLANS
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_price_monthly NUMERIC(8,2) NOT NULL,
  monthly_order_limit INT NOT NULL,
  max_printers INT NOT NULL DEFAULT 1,
  max_staff INT NOT NULL DEFAULT 0,
  auto_print_allowed BOOLEAN NOT NULL DEFAULT true,
  advanced_reports BOOLEAN NOT NULL DEFAULT false,
  custom_branding BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO plans (id, name, display_price_monthly, monthly_order_limit, max_printers, max_staff, auto_print_allowed, advanced_reports, custom_branding)
VALUES
  ('free', 'Free Starter', 0.00, 50, 1, 0, true, false, false),
  ('pro', 'Pro Shop', 399.00, 1000, 2, 2, true, true, true),
  ('business', 'Business Enterprise', 599.00, 999999, 10, 10, true, true, true)
ON CONFLICT (id) DO NOTHING;

-- 20. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'order',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_shop_read ON notifications(shop_id, is_read);

-- 22. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 23. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24. WEBHOOK EVENTS
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'phonepe',
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  signature TEXT,
  is_processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_id ON webhook_events(event_id);

-- ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairing_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public shops can be viewed by slug" ON shops FOR SELECT USING (is_active = true);
CREATE POLICY "Public pricing rules viewable" ON pricing_rules FOR SELECT USING (true);
CREATE POLICY "Public shop settings viewable" ON shop_settings FOR SELECT USING (true);
CREATE POLICY "Customers can insert upload metadata" ON customer_uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers can insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers can view orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Owners manage own shop" ON shops FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Owners manage own settings" ON shop_settings FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_settings.shop_id AND shops.owner_id = auth.uid()));
CREATE POLICY "Owners manage own pricing" ON pricing_rules FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = pricing_rules.shop_id AND shops.owner_id = auth.uid()));
CREATE POLICY "Owners manage own orders" ON orders FOR ALL USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = orders.shop_id AND shops.owner_id = auth.uid()));
