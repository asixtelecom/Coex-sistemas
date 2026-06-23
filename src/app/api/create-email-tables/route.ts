import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CREATE_TABLES_SQL = `
-- Create mailboxes table
CREATE TABLE IF NOT EXISTS public.mailboxes (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL,
  title TEXT NOT NULL,
  color TEXT DEFAULT '#2563eb',
  imap_authorized BOOLEAN DEFAULT false,
  smtp_authorized BOOLEAN DEFAULT false,
  imap_host TEXT,
  imap_port INTEGER,
  imap_username TEXT,
  imap_password TEXT,
  imap_ssl BOOLEAN DEFAULT true,
  imap_type TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password TEXT,
  smtp_ssl BOOLEAN DEFAULT true,
  signature TEXT,
  send_bcc_to TEXT,
  permitted_users TEXT,
  use_global_email BOOLEAN DEFAULT true,
  email_provider TEXT,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create mailbox_templates table
CREATE TABLE IF NOT EXISTS public.mailbox_templates (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  body TEXT,
  created_by UUID,
  is_public BOOLEAN DEFAULT true,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailbox_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.mailboxes;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.mailbox_templates;

-- Create policies
CREATE POLICY "Allow all for authenticated" ON public.mailboxes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON public.mailbox_templates
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mailboxes_account_id ON public.mailboxes(account_id);
CREATE INDEX IF NOT EXISTS idx_mailbox_templates_account_id ON public.mailbox_templates(account_id);
`;

export async function GET() {
  try {
    // Try to use the RPC to execute raw SQL
    // Since we don't have direct SQL execution, we'll check if tables exist
    const { data: mailboxesData, error: mailboxesError } = await supabase
      .from('mailboxes')
      .select('id')
      .limit(1);

    if (mailboxesError && mailboxesError.code === 'PGRST116') {
      // Table doesn't exist - return instructions
      return NextResponse.json({
        success: false,
        message: 'As tabelas não existem. Execute o SQL manualmente no Supabase.',
        sql: CREATE_TABLES_SQL
      }, { status: 400 });
    }

    const { data: templatesData, error: templatesError } = await supabase
      .from('mailbox_templates')
      .select('id')
      .limit(1);

    if (templatesError && templatesError.code === 'PGRST116') {
      return NextResponse.json({
        success: false,
        message: 'Tabela mailbox_templates não existe. Execute o SQL manualmente.',
        sql: CREATE_TABLES_SQL
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Tabelas já existem!',
      mailboxesExists: !mailboxesError,
      templatesExists: !templatesError
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Erro ao verificar tabelas',
      details: error instanceof Error ? error.message : 'Unknown error',
      sql: CREATE_TABLES_SQL
    }, { status: 500 });
  }
}
