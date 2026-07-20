-- ============================================================
-- 048_tipos_servico.sql — Shared service/property type lookups
-- Used by both pipelines (Tipo de imóvel) and vistoria (Tipo de Serviço)
-- ============================================================

CREATE TABLE IF NOT EXISTS tipos_servico (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'imovel' CHECK (categoria IN ('imovel', 'servico')),
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO tipos_servico (slug, nome, categoria, ordem) VALUES
  -- Tipos de imóvel (used in pipelines + vistoria)
  ('residencia-terrea', 'Residencia terrea', 'imovel', 1),
  ('apto-com-elevador', 'Apto c/ Elevador', 'imovel', 2),
  ('apto-sem-elevador', 'apto s/ elevador', 'imovel', 3),
  ('galpao', 'galpao', 'imovel', 4),
  ('industria', 'industria', 'imovel', 5),
  -- Tipos de serviço (used in pipelines Serviços dropdown)
  ('mudanca-residencial', 'Mudança residencial', 'servico', 1),
  ('mudanca-comercial', 'Mudança Comercial', 'servico', 2),
  ('mudanca-interestadual', 'Mudança Interestadual', 'servico', 3),
  ('icamento', 'Içamento', 'servico', 4),
  ('guarda-volume', 'Guarda Volume', 'servico', 5),
  ('transportes-cargas', 'Transportes de Cargas', 'servico', 6),
  ('montagem-desmontagem', 'Montagem + Desmontagem', 'servico', 7),
  ('montagem', 'Montagem', 'servico', 8),
  ('desmontagem', 'Desmontagem', 'servico', 9),
  ('armazenamento', 'armazenamento', 'servico', 10),
  ('transporte', 'Transporte', 'servico', 11)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE tipos_servico ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE tipos_servico TO postgres, anon, authenticated, service_role;
CREATE POLICY "Anyone can read tipos_servico" ON tipos_servico FOR SELECT USING (true);
CREATE POLICY "Agents can insert tipos_servico" ON tipos_servico FOR INSERT WITH CHECK (true);
CREATE POLICY "Agents can update tipos_servico" ON tipos_servico FOR UPDATE USING (true);
CREATE POLICY "Agents can delete tipos_servico" ON tipos_servico FOR DELETE USING (true);

-- Remove the hardcoded CHECK constraint on vistorias.tipo_servico
ALTER TABLE vistorias DROP CONSTRAINT IF EXISTS vistorias_tipo_servico_check;
