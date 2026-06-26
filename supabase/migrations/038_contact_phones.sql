-- ============================================================
-- 038_contact_phones.sql
--
-- Allow multiple phone numbers per contact via a separate table,
-- while keeping `contacts.phone` as the primary number for
-- backward compatibility.
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_phones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  phone_normalized TEXT GENERATED ALWAYS AS (regexp_replace(phone, '\D', '', 'g')) STORED,
  label TEXT DEFAULT 'other' CHECK (label IN ('primary', 'commercial', 'home', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, phone_normalized)
);

CREATE INDEX IF NOT EXISTS idx_contact_phones_contact ON contact_phones(contact_id);

ALTER TABLE contact_phones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage contact phones" ON contact_phones;
CREATE POLICY "Users can manage contact phones" ON contact_phones FOR ALL
  USING (EXISTS (SELECT 1 FROM contacts WHERE contacts.id = contact_phones.contact_id AND contacts.user_id = auth.uid()));
