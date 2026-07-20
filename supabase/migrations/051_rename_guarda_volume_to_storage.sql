-- 051_rename_guarda_volume_to_storage.sql
-- ============================================================
-- Renomear pipeline "Guarda Volume" para "Storage"
-- ============================================================

-- Atualizar o nome do pipeline
UPDATE pipelines 
SET name = 'Storage' 
WHERE name = 'Guarda Volume';

-- Atualizar o nome na tabela de templates de pipeline (se existir)
UPDATE pipeline_templates 
SET name = 'Storage' 
WHERE name = 'Guarda Volume';

-- Atualizar referências em deals que usam o nome do pipeline como título
UPDATE deals 
SET title = 'Storage' 
WHERE title = 'Guarda Volume';
