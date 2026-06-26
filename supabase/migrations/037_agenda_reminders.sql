ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS reminders JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  "to" TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'notification',
  reminder_minutes INT NOT NULL DEFAULT 15,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY event_notifications_select ON event_notifications FOR SELECT
  USING (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = event_notifications.account_id AND am.user_id = auth.uid()));

CREATE POLICY event_notifications_insert ON event_notifications FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = event_notifications.account_id AND am.user_id = auth.uid()));
