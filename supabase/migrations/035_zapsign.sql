-- ============================================================
-- 035_zapsign.sql
-- Zapsign digital signature integration
-- ============================================================

CREATE TABLE IF NOT EXISTS signature_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  signer_name TEXT,
  signer_email TEXT,
  signer_phone TEXT,
  provider_document_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE signature_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY signature_documents_select ON signature_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = signature_documents.account_id AND p.user_id = auth.uid()));

CREATE POLICY signature_documents_insert ON signature_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = signature_documents.account_id AND p.user_id = auth.uid()));

CREATE POLICY signature_documents_update ON signature_documents FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = signature_documents.account_id AND p.user_id = auth.uid()));

CREATE POLICY signature_documents_delete ON signature_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = signature_documents.account_id AND p.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS zapsign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  api_key TEXT,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id)
);

ALTER TABLE zapsign_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY zapsign_settings_select ON zapsign_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = zapsign_settings.account_id AND p.user_id = auth.uid()));

CREATE POLICY zapsign_settings_insert ON zapsign_settings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = zapsign_settings.account_id AND p.user_id = auth.uid() AND p.account_role IN ('owner', 'admin')));

CREATE POLICY zapsign_settings_update ON zapsign_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = zapsign_settings.account_id AND p.user_id = auth.uid() AND p.account_role IN ('owner', 'admin')));
