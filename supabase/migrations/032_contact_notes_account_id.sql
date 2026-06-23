-- Add account_id to contact_notes and update RLS policies

-- Step 1: Add account_id column (allow NULL initially)
ALTER TABLE contact_notes ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 2: Backfill existing notes with the contact's account_id
UPDATE contact_notes 
SET account_id = contacts.account_id
FROM contacts
WHERE contact_notes.contact_id = contacts.id;

-- Step 3: Make account_id NOT NULL after backfilling
ALTER TABLE contact_notes ALTER COLUMN account_id SET NOT NULL;

-- Step 4: Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_notes_account_id ON contact_notes(account_id);

-- Step 5: Update RLS policies
DROP POLICY IF EXISTS "Users can manage own notes" ON contact_notes;

CREATE POLICY "Users can manage account notes" ON contact_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM account_members
      WHERE account_members.account_id = contact_notes.account_id
      AND account_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM account_members
      WHERE account_members.account_id = contact_notes.account_id
      AND account_members.user_id = auth.uid()
    )
  );
