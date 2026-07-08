-- Add per-agent email signature to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_signature TEXT;

-- Add company phone number to accounts
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS phone TEXT;
