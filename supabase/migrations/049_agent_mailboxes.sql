-- ============================================================
-- 049_agent_mailboxes.sql
--
-- Junction table linking agents (profiles) to mailboxes they
-- are authorized to send from. When an agent is assigned to a
-- mailbox, their email_signature auto-applies on compose.
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_mailboxes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mailbox_id INT NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mailbox_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_mailboxes_user ON agent_mailboxes(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_mailboxes_mailbox ON agent_mailboxes(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_agent_mailboxes_account ON agent_mailboxes(account_id);

ALTER TABLE agent_mailboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_mailboxes_select ON agent_mailboxes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.account_id = agent_mailboxes.account_id AND p.user_id = auth.uid()
  ));

CREATE POLICY agent_mailboxes_insert ON agent_mailboxes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.account_id = agent_mailboxes.account_id AND p.user_id = auth.uid()
      AND p.account_role IN ('owner', 'admin')
  ));

CREATE POLICY agent_mailboxes_delete ON agent_mailboxes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.account_id = agent_mailboxes.account_id AND p.user_id = auth.uid()
      AND p.account_role IN ('owner', 'admin')
  ));
