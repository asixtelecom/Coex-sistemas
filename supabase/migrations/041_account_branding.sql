-- ============================================================
-- 041_account_branding.sql
--
-- Adds company_name and logo_url columns to accounts table
-- so admins can customize the CRM branding.
-- ============================================================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;
