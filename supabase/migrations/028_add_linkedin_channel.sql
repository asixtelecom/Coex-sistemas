-- Add LinkedIn to allowed channel types
ALTER TABLE channels DROP CONSTRAINT IF EXISTS channels_type_check;
ALTER TABLE channels ADD CONSTRAINT channels_type_check CHECK (type IN ('whatsapp', 'instagram', 'messenger', 'telegram', 'webchat', 'linkedin'));
