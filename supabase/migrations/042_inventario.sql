-- 042_inventario.sql
-- ============================================================
-- Inventário (Inventory) table
-- Stores inventory records with contact info and items
-- ============================================================

CREATE TABLE IF NOT EXISTS inventarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_document TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  cubagem_total NUMERIC DEFAULT 0,
  valor_total NUMERIC DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventarios_account_id ON inventarios(account_id);
CREATE INDEX IF NOT EXISTS idx_inventarios_contact_id ON inventarios(contact_id);
CREATE INDEX IF NOT EXISTS idx_inventarios_created_at ON inventarios(created_at DESC);

ALTER TABLE inventarios ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE inventarios TO postgres, anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can manage own account inventarios" ON inventarios;
CREATE POLICY "Users can manage own account inventarios"
  ON inventarios
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );
