-- ============================================================
-- Migration 033: Internal chat between team members
-- ============================================================

-- Conversations (direct messages between two people)
CREATE TABLE IF NOT EXISTS internal_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE internal_conversations ENABLE ROW LEVEL SECURITY;

-- Participants in each conversation
CREATE TABLE IF NOT EXISTS internal_conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES internal_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_internal_conv_participants_user ON internal_conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_conv_participants_conv ON internal_conversation_participants(conversation_id);

ALTER TABLE internal_conversation_participants ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE IF NOT EXISTS internal_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES internal_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_internal_messages_conv ON internal_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_created ON internal_messages(created_at DESC);

ALTER TABLE internal_messages ENABLE ROW LEVEL SECURITY;

-- Track online status (ephemeral, refreshed on each page load / visibility)
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away'))
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Internal conversations: user can see conversations they participate in
DROP POLICY IF EXISTS "Users can view their internal conversations" ON internal_conversations;
CREATE POLICY "Users can view their internal conversations" ON internal_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM internal_conversation_participants
      WHERE conversation_id = internal_conversations.id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create internal conversations" ON internal_conversations;
CREATE POLICY "Users can create internal conversations" ON internal_conversations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.account_id = internal_conversations.account_id
    )
  );

DROP POLICY IF EXISTS "Users can update their internal conversations" ON internal_conversations;
CREATE POLICY "Users can update their internal conversations" ON internal_conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM internal_conversation_participants
      WHERE conversation_id = internal_conversations.id
        AND user_id = auth.uid()
    )
  );

-- Participants: user can see participants in conversations they're in
DROP POLICY IF EXISTS "Users can view participants" ON internal_conversation_participants;
CREATE POLICY "Users can view participants" ON internal_conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM internal_conversation_participants AS my_participation
      WHERE my_participation.conversation_id = internal_conversation_participants.conversation_id
        AND my_participation.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert participants" ON internal_conversation_participants;
CREATE POLICY "Users can insert participants" ON internal_conversation_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.account_id = (
          SELECT ic.account_id FROM internal_conversations ic
          WHERE ic.id = internal_conversation_participants.conversation_id
        )
    )
  );

-- Messages: user can see messages in their conversations
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON internal_messages;
CREATE POLICY "Users can view messages in their conversations" ON internal_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM internal_conversation_participants
      WHERE conversation_id = internal_messages.conversation_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON internal_messages;
CREATE POLICY "Users can insert messages in their conversations" ON internal_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM internal_conversation_participants
      WHERE conversation_id = internal_messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- Presence: all members of the same account can see each other's presence
DROP POLICY IF EXISTS "Users can view presence of account members" ON user_presence;
CREATE POLICY "Users can view presence of account members" ON user_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.account_id = p2.account_id
      WHERE p1.user_id = user_presence.user_id
        AND p2.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can upsert their own presence" ON user_presence;
CREATE POLICY "Users can upsert their own presence" ON user_presence
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own presence" ON user_presence;
CREATE POLICY "Users can update their own presence" ON user_presence
  FOR UPDATE USING (user_id = auth.uid());

-- Grant access to authenticated users
GRANT ALL ON internal_conversations TO authenticated;
GRANT ALL ON internal_conversation_participants TO authenticated;
GRANT ALL ON internal_messages TO authenticated;
GRANT ALL ON user_presence TO authenticated;
