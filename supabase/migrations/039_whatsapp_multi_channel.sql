-- ============================================================
-- 039_whatsapp_multi_channel.sql
--
-- Multi-number WhatsApp support: each number gets its own
-- channel_token for webhook routing, display metadata, and a
-- channels entry. Drops UNIQUE(account_id) on whatsapp_config
-- (which limited one number per account) and UNIQUE(account_id,
-- type) on channels so multiple whatsapp channels are allowed.
-- ============================================================

-- 1. whatsapp_config: add multi-number columns
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS channel_token UUID UNIQUE DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS display_phone TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. whatsapp_config: drop UNIQUE(account_id) — was added by
--    017_account_sharing.sql. Allow multiple numbers per account;
--    phone_number_id uniqueness is already enforced by
--    whatsapp_config_phone_number_id_key (migration 013).
ALTER TABLE whatsapp_config DROP CONSTRAINT IF EXISTS whatsapp_config_account_id_key;

-- Keep the plain index on account_id for fast lookups.
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_account_id ON whatsapp_config(account_id);

-- Index for channel_token lookups (webhook routing).
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_channel_token ON whatsapp_config(channel_token);

-- 3. channels: drop UNIQUE(account_id, type) so multiple whatsapp
--    channels can coexist. The index name was idx_channels_account_type
--    (024_channels.sql).
DROP INDEX IF EXISTS idx_channels_account_type;
CREATE INDEX IF NOT EXISTS idx_channels_account_type ON channels(account_id, type);

-- 4. Backfill: create a channels entry for every existing
--    whatsapp_config row that doesn't already have one. Uses
--    the phone_number_id as display_phone and "WhatsApp" as the
--    default name.
INSERT INTO channels (account_id, type, name, config, status, is_active)
  SELECT
    wc.account_id,
    'whatsapp',
    COALESCE(wc.name, 'WhatsApp'),
    jsonb_build_object('whatsapp_config_id', wc.id),
    wc.status,
    true
  FROM whatsapp_config wc
  WHERE NOT EXISTS (
    SELECT 1 FROM channels ch
    WHERE ch.account_id = wc.account_id
      AND ch.type = 'whatsapp'
      AND ch.config->>'whatsapp_config_id' = wc.id::text
  )
  ON CONFLICT DO NOTHING;
