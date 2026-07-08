CREATE TABLE IF NOT EXISTS cubagem_master_items (
  id BIGSERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  default_m3 NUMERIC(10,4) NOT NULL DEFAULT 0,
  item_value NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cubagem_master_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read master items"
  ON cubagem_master_items FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage master items"
  ON cubagem_master_items FOR ALL
  USING (true)
  WITH CHECK (true);
