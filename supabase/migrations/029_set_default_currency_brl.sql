-- ============================================================
-- 029_set_default_currency_brl
--
-- Set default currency to Brazilian Real (BRL)
-- ============================================================

-- Update existing accounts' default currency to BRL
UPDATE accounts
SET default_currency = 'BRL'
WHERE default_currency = 'USD';

-- Change the column default to BRL for new accounts
ALTER TABLE accounts
  ALTER COLUMN default_currency SET DEFAULT 'BRL';
