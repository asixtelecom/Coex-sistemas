-- ============================================================
-- 036_agenda.sql
-- Calendar / Agenda events
-- ============================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_type VARCHAR(30) NOT NULL DEFAULT 'event',
  color VARCHAR(7) DEFAULT '#3b82f6',
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY calendar_events_select ON calendar_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = calendar_events.account_id AND p.user_id = auth.uid()));

CREATE POLICY calendar_events_insert ON calendar_events FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = calendar_events.account_id AND p.user_id = auth.uid()));

CREATE POLICY calendar_events_update ON calendar_events FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = calendar_events.account_id AND p.user_id = auth.uid()));

CREATE POLICY calendar_events_delete ON calendar_events FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.account_id = calendar_events.account_id AND p.user_id = auth.uid()));
