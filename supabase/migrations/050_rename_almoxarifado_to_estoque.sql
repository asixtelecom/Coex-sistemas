-- 050_rename_almoxarifado_to_estoque.sql
-- ============================================================
-- Renomear tabela almoxarifado_items para estoque_items
-- ============================================================

ALTER TABLE IF EXISTS almoxarifado_items RENAME TO estoque_items;

-- Renomear índices se existirem
ALTER INDEX IF EXISTS idx_almoxarifado_items_account_id RENAME TO idx_estoque_items_account_id;
ALTER INDEX IF EXISTS idx_almoxarifado_items_name RENAME TO idx_estoque_items_name;

-- Renomear política se existir
DROP POLICY IF EXISTS "Users can manage own account almoxarifado items" ON estoque_items;
CREATE POLICY "Users can manage own account estoque items"
  ON estoque_items
  FOR ALL
  USING (
    account_id IN (
      SELECT account_id FROM profiles WHERE user_id = auth.uid()
    )
  );
