-- ============================================================
-- 031_email_module.sql
--
-- Adds email module tables (mailboxes, mailbox_emails, mailbox_templates, mailbox_settings)
-- ============================================================

-- ---- mailbox_settings ----------------------------------------
CREATE TABLE IF NOT EXISTS mailbox_settings (
  setting_name VARCHAR(100) NOT NULL,
  setting_value TEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'app',
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (setting_name)
);

ALTER TABLE mailbox_settings ENABLE ROW LEVEL SECURITY;


-- ---- mailboxes ------------------------------------------------
CREATE TABLE IF NOT EXISTS mailboxes (
  id SERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  color VARCHAR(7) NOT NULL,
  imap_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  smtp_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  send_bcc_to TEXT,
  signature TEXT,
  permitted_users TEXT,
  use_global_email BOOLEAN NOT NULL DEFAULT TRUE,
  email_provider VARCHAR(50) NOT NULL DEFAULT 'mail', -- 'mail', 'smtp', 'microsoft_outlook', 'gmail_smtp'
  imap_type VARCHAR(50) NOT NULL DEFAULT 'general_imap', -- 'general_imap', 'microsoft_outlook', 'gmail_imap'
  
  -- IMAP settings
  imap_host VARCHAR(255),
  imap_port INT,
  imap_username VARCHAR(255),
  imap_password TEXT,
  imap_ssl BOOLEAN DEFAULT TRUE,
  
  -- SMTP settings
  smtp_host VARCHAR(255),
  smtp_port INT,
  smtp_username VARCHAR(255),
  smtp_password TEXT,
  smtp_ssl BOOLEAN DEFAULT TRUE,
  
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mailboxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY mailboxes_select ON mailboxes FOR SELECT
  USING (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailboxes.account_id AND am.user_id = auth.uid()));

CREATE POLICY mailboxes_insert ON mailboxes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailboxes.account_id AND am.user_id = auth.uid() AND am.role IN ('owner', 'admin')));

CREATE POLICY mailboxes_update ON mailboxes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailboxes.account_id AND am.user_id = auth.uid() AND am.role IN ('owner', 'admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailboxes.account_id AND am.user_id = auth.uid() AND am.role IN ('owner', 'admin')));

CREATE POLICY mailboxes_delete ON mailboxes FOR DELETE
  USING (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailboxes.account_id AND am.user_id = auth.uid() AND am.role IN ('owner', 'admin')));


-- ---- mailbox_emails -------------------------------------------
CREATE TABLE IF NOT EXISTS mailbox_emails (
  id SERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  mailbox_id INT NOT NULL REFERENCES mailboxes(id) ON DELETE CASCADE,
  "to" TEXT,
  cc TEXT,
  bcc TEXT,
  subject TEXT,
  message TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_name VARCHAR(100),
  creator_email VARCHAR(255),
  email_id INT, -- External email ID
  project_id INT DEFAULT 0,
  email_labels TEXT,
  status VARCHAR(20) DEFAULT '', -- '', 'draft', 'trash'
  read_by TEXT,
  files TEXT,
  encoding_type VARCHAR(20) DEFAULT 'readable', -- 'readable', 'raw', 'base64'
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mailbox_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY mailbox_emails_select ON mailbox_emails FOR SELECT
  USING (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailbox_emails.account_id AND am.user_id = auth.uid()));

CREATE POLICY mailbox_emails_insert ON mailbox_emails FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailbox_emails.account_id AND am.user_id = auth.uid()));

CREATE POLICY mailbox_emails_update ON mailbox_emails FOR UPDATE
  USING (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailbox_emails.account_id AND am.user_id = auth.uid()));

CREATE POLICY mailbox_emails_delete ON mailbox_emails FOR DELETE
  USING (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailbox_emails.account_id AND am.user_id = auth.uid()));


-- ---- mailbox_templates ----------------------------------------
CREATE TABLE IF NOT EXISTS mailbox_templates (
  id SERIAL PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  body TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mailbox_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY mailbox_templates_select ON mailbox_templates FOR SELECT
  USING (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailbox_templates.account_id AND am.user_id = auth.uid()));

CREATE POLICY mailbox_templates_insert ON mailbox_templates FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailbox_templates.account_id AND am.user_id = auth.uid()));

CREATE POLICY mailbox_templates_update ON mailbox_templates FOR UPDATE
  USING (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailbox_templates.account_id AND am.user_id = auth.uid()));

CREATE POLICY mailbox_templates_delete ON mailbox_templates FOR DELETE
  USING (EXISTS (SELECT 1 FROM account_members am WHERE am.account_id = mailbox_templates.account_id AND am.user_id = auth.uid()));


-- ---- Seed initial mailbox settings ---------------------------
INSERT INTO mailbox_settings (setting_name, setting_value, type, deleted)
VALUES ('mailbox_item_purchase_code', 'Mailbox-ITEM-PURCHASE-CODE', 'app', FALSE)
ON CONFLICT (setting_name) DO NOTHING;
