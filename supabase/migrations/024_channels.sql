-- ============================================================
-- 024_channels.sql
--
-- Multi-channel support: Instagram, Messenger, Telegram, Webchat.
-- Creates the channels table and adds channel_id to conversations
-- and messages.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'instagram', 'messenger', 'telegram', 'webchat')),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'disconnected',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_account_id ON channels(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_account_type ON channels(account_id, type);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own channels" ON channels;
CREATE POLICY "Users can manage own channels" ON channels FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.account_id = channels.account_id
  )
);

DROP TRIGGER IF EXISTS set_updated_at ON channels;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_channel_id ON conversations(channel_id);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES channels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ig_id TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS messenger_psid TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

CREATE INDEX IF NOT EXISTS idx_contacts_ig_id ON contacts(ig_id);
CREATE INDEX IF NOT EXISTS idx_contacts_messenger_psid ON contacts(messenger_psid);
CREATE INDEX IF NOT EXISTS idx_contacts_telegram_chat_id ON contacts(telegram_chat_id);

ALTER PUBLICATION supabase_realtime ADD TABLE channels;
