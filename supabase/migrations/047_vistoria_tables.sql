-- ============================================================
-- 047_vistoria_tables.sql — Vistoria (Inspection) system
--
-- Tables for the inspection flow:
--   1. vistorias — main inspection record
--   2. vistoria_comodos — rooms/areas inspected with cubagem
--   3. vistoria_almoxarifado — storage items for the inspection
-- ============================================================

-- ============================================================
-- 1. vistorias — main inspection record
-- ============================================================
CREATE TABLE IF NOT EXISTS vistorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  vistoriador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_document TEXT,
  contact_email TEXT,
  contact_company TEXT,
  contact_obs TEXT,
  tipo_servico TEXT NOT NULL CHECK (tipo_servico IN ('residencial', 'comercial', 'interestadual')),
  tipo_residencia TEXT,
  tipo_imovel TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  data_vistoria DATE DEFAULT CURRENT_DATE,
  horario_vistoria TIME,
  total_cubagem NUMERIC DEFAULT 0,
  total_valor_almoxarifado NUMERIC DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vistorias_account_id ON vistorias(account_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_contact_id ON vistorias(contact_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_vistoriador_id ON vistorias(vistoriador_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_data ON vistorias(data_vistoria DESC);
CREATE INDEX IF NOT EXISTS idx_vistorias_status ON vistorias(status);

ALTER TABLE vistorias ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE vistorias TO postgres, anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can view vistorias from their account" ON vistorias;
CREATE POLICY "Users can view vistorias from their account"
  ON vistorias
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert vistorias in their account" ON vistorias;
CREATE POLICY "Users can insert vistorias in their account"
  ON vistorias
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update vistorias in their account" ON vistorias;
CREATE POLICY "Users can update vistorias in their account"
  ON vistorias
  FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete vistorias in their account" ON vistorias;
CREATE POLICY "Users can delete vistorias in their account"
  ON vistorias
  FOR DELETE
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 2. vistoria_comodos — rooms/areas with cubagem items
-- ============================================================
CREATE TABLE IF NOT EXISTS vistoria_comodos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vistoria_id UUID NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
  comodo TEXT NOT NULL,
  item_name TEXT NOT NULL,
  cubagem_m3 NUMERIC(10,4) NOT NULL DEFAULT 0,
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vistoria_comodos_vistoria_id ON vistoria_comodos(vistoria_id);

ALTER TABLE vistoria_comodos ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE vistoria_comodos TO postgres, anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can manage vistoria_comodos via vistoria" ON vistoria_comodos;
CREATE POLICY "Users can manage vistoria_comodos via vistoria"
  ON vistoria_comodos
  FOR ALL
  USING (
    vistoria_id IN (
      SELECT v.id FROM vistorias v
      WHERE v.account_id IN (
        SELECT account_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 3. vistoria_almoxarifado — storage items for inspection
-- ============================================================
CREATE TABLE IF NOT EXISTS vistoria_almoxarifado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vistoria_id UUID NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_custo NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vistoria_almoxarifado_vistoria_id ON vistoria_almoxarifado(vistoria_id);

ALTER TABLE vistoria_almoxarifado ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE vistoria_almoxarifado TO postgres, anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can manage vistoria_almoxarifado via vistoria" ON vistoria_almoxarifado;
CREATE POLICY "Users can manage vistoria_almoxarifado via vistoria"
  ON vistoria_almoxarifado
  FOR ALL
  USING (
    vistoria_id IN (
      SELECT v.id FROM vistorias v
      WHERE v.account_id IN (
        SELECT account_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- 4. Default comodos list helper (seed data)
-- ============================================================
CREATE TABLE IF NOT EXISTS vistoria_default_comodos (
  id BIGSERIAL PRIMARY KEY,
  comodo TEXT NOT NULL UNIQUE,
  ordem INTEGER NOT NULL DEFAULT 0
);

INSERT INTO vistoria_default_comodos (comodo, ordem) VALUES
  ('Sala', 1),
  ('Cozinha', 2),
  ('Quarto', 3),
  ('Banheiro', 4),
  ('Corredor', 5),
  ('Área de Serviço', 6),
  ('Varanda', 7),
  ('Garagem', 8),
  ('Escritório', 9),
  ('Depósito', 10),
  ('Hall de Entrada', 11),
  ('Jardim', 12),
  ('Piscina', 13),
  ('Sala de Jantar', 14),
  ('Suite', 15),
  ('Closet', 16)
ON CONFLICT (comodo) DO NOTHING;

ALTER TABLE vistoria_default_comodos ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE vistoria_default_comodos TO postgres, anon, authenticated, service_role;
CREATE POLICY "Anyone can read default comodos" ON vistoria_default_comodos FOR SELECT USING (true);
