-- Seed para estoque_items
-- Insere 10 unidades de cada item
-- ATENÇÃO: rode somente após a migration 050 ter sido aplicada

-- Ajuste o ACCOUNT_ID para o UUID da sua conta
-- Para obter o account_id: SELECT id FROM accounts LIMIT 1;

WITH account AS (
  SELECT id FROM accounts LIMIT 1
)
INSERT INTO estoque_items (account_id, name, quantity, unit, min_stock, location)
SELECT
  (SELECT id FROM account),
  name,
  10,
  'un',
  2,
  ''
FROM (VALUES
  ('POLIBOLHAS'),
  ('STRECH'),
  ('FITAS FRAGIL'),
  ('FITAS'),
  ('CABIDEIRO'),
  ('CAIXA CRISTAL'),
  ('CAIXA PRIME'),
  ('MANILHA'),
  ('ONDULADO'),
  ('FITILHO'),
  ('EMBALAGENS'),
  ('EMBALAGENS ESPECIAIS'),
  ('ESCADA')
) AS t(name)
WHERE EXISTS (SELECT 1 FROM account);
