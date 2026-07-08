ALTER TABLE inventarios
  ADD COLUMN IF NOT EXISTS origin_address TEXT,
  ADD COLUMN IF NOT EXISTS destination_address TEXT;
