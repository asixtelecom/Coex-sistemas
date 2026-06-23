-- Migration 027: Fix table grants for authenticated and service_role roles
-- The auto_expose_new_tables setting is disabled, so all tables need
-- explicit INSERT/UPDATE/DELETE grants for authenticated and service_role.
-- Without these, RLS policies can't help — the base privilege is missing.

-- Grant DML on accounts (fixes "Failed to save default currency")
GRANT INSERT, UPDATE, DELETE ON public.accounts TO authenticated, service_role;

-- Grant DML on pipelines (used by pipeline UI client-side)
GRANT INSERT, UPDATE, DELETE ON public.pipelines TO authenticated, service_role;

-- Grant DML on pipeline_stages (used by pipeline UI client-side)
GRANT INSERT, UPDATE, DELETE ON public.pipeline_stages TO authenticated, service_role;

-- Grant DML on deals (used by deal-form client-side)
GRANT INSERT, UPDATE, DELETE ON public.deals TO authenticated, service_role;

-- Grant DML on tags (used by tag-manager client-side)
GRANT INSERT, UPDATE, DELETE ON public.tags TO anon, authenticated, service_role;

-- Grant DML on contact_tags (used by contact-sidebar client-side)
GRANT INSERT, UPDATE, DELETE ON public.contact_tags TO anon, authenticated, service_role;

-- Grant DML on automation tables (used by automation engine admin client)
GRANT INSERT, UPDATE, DELETE ON public.automations TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.automation_steps TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.automation_logs TO authenticated, service_role;

-- Grant DML on template & custom field tables
GRANT INSERT, UPDATE, DELETE ON public.message_templates TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.custom_fields TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.contact_custom_values TO authenticated, service_role;

-- profiles: UPDATE only (INSERT is done via handle_new_user trigger)
GRANT UPDATE ON public.profiles TO authenticated, service_role;
-- Fix account_invitations grants (missing INSERT/UPDATE for invite creation)
GRANT INSERT, UPDATE ON public.account_invitations TO authenticated, service_role;