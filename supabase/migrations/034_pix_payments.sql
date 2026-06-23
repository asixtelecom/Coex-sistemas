-- ============================================================
-- 034_pix_payments.sql
-- PIX payment integration tables
-- ============================================================

CREATE TABLE IF NOT EXISTS pix_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  pix_key TEXT,
  pix_key_type VARCHAR(20) DEFAULT 'cpf',
  provider VARCHAR(50) DEFAULT 'generic',
  provider_payment_id TEXT,
  qr_code TEXT,
  qr_code_url TEXT,
  copy_paste_key TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pix_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY pix_payments_select ON pix_payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = pix_payments.account_id AND p.user_id = auth.uid()));

CREATE POLICY pix_payments_insert ON pix_payments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = pix_payments.account_id AND p.user_id = auth.uid()));

CREATE POLICY pix_payments_update ON pix_payments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = pix_payments.account_id AND p.user_id = auth.uid()));

CREATE POLICY pix_payments_delete ON pix_payments FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = pix_payments.account_id AND p.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS pix_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'generic',
  api_key TEXT,
  api_url TEXT,
  pix_key TEXT,
  pix_key_type VARCHAR(20) DEFAULT 'cpf',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id)
);

ALTER TABLE pix_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY pix_settings_select ON pix_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = pix_settings.account_id AND p.user_id = auth.uid()));

CREATE POLICY pix_settings_insert ON pix_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = pix_settings.account_id AND p.user_id = auth.uid() AND p.account_role IN ('owner', 'admin')));

CREATE POLICY pix_settings_update ON pix_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = pix_settings.account_id AND p.user_id = auth.uid() AND p.account_role IN ('owner', 'admin')));
