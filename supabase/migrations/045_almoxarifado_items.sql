-- 045_almoxarifado_items.sql
-- ============================================================
-- Almoxerifado (Warehouse/Stock) table
-- Stores stock items with quantities, locations, and min stock
-- ============================================================

CREATE TABLE IF NOT EXISTS almoxarifado_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'un',
  location TEXT DEFAULT '',
  min_stock NUMERIC NOT NULL DEFAULT 0,
  obs TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_almoxarifado_items_account_id ON almoxarifado_items(account_id);
CREATE INDEX IF NOT EXISTS idx_almoxarifado_items_name ON almoxarifado_items(name);

ALTER TABLE almoxarifado_items ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE almoxarifado_items TO postgres, anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can manage own account almoxarifado items" ON almoxarifado_items;
CREATE POLICY "Users can manage own account almoxarifado items"
  ON almoxarifado_items
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );
