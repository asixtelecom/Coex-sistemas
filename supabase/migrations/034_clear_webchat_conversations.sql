-- ============================================================
-- 034_clear_webchat_conversations.sql
--
-- Remove todas as conversas do webchat e suas mensagens.
-- Execute esta migration no Supabase Dashboard se necessário.
-- ============================================================

-- Deletar mensagens de conversas do webchat
DELETE FROM messages
WHERE conversation_id IN (
  SELECT c.id
  FROM conversations c
  JOIN channels ch ON c.channel_id = ch.id
  WHERE ch.type = 'webchat'
);

-- Deletar reações de mensagens de conversas do webchat
DELETE FROM message_reactions
WHERE conversation_id IN (
  SELECT c.id
  FROM conversations c
  JOIN channels ch ON c.channel_id = ch.id
  WHERE ch.type = 'webchat'
);

-- Deletar conversas do webchat
DELETE FROM conversations
WHERE channel_id IN (
  SELECT id FROM channels WHERE type = 'webchat'
);

-- Deletar contatos órfãos que só existiam para webchat
-- (contatos cujo phone começa com 'wc-' ou 'webchat-')
DELETE FROM contacts
WHERE phone LIKE 'wc-%' OR phone LIKE 'webchat-%';
