-- ============================================================
-- 026_default_pipelines.sql
--
-- Creates a default pipeline with stages for every new account
-- at signup, and backfills pipelines for existing accounts.
-- ============================================================

-- 1. Update handle_new_user to also create a default pipeline
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name TEXT;
  v_account_id UUID;
  v_pipeline_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  INSERT INTO public.accounts (name, owner_user_id)
  VALUES (COALESCE(NULLIF(v_full_name, ''), NEW.email, 'My account'), NEW.id)
  RETURNING id INTO v_account_id;

  INSERT INTO public.profiles (user_id, full_name, email, account_id, account_role)
  VALUES (NEW.id, v_full_name, NEW.email, v_account_id, 'owner');

  -- Default pipeline
  INSERT INTO public.pipelines (name, account_id, user_id)
  VALUES ('Sales Pipeline', v_account_id, NEW.id)
  RETURNING id INTO v_pipeline_id;

  INSERT INTO public.pipeline_stages (pipeline_id, name, position, color) VALUES
    (v_pipeline_id, 'New Lead',      0, '#3b82f6'),
    (v_pipeline_id, 'Qualified',     1, '#eab308'),
    (v_pipeline_id, 'Proposal Sent', 2, '#f97316'),
    (v_pipeline_id, 'Negotiation',   3, '#8b5cf6'),
    (v_pipeline_id, 'Won',           4, '#22c55e');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to bootstrap account/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- 2. Backfill pipelines for existing accounts that have none
INSERT INTO public.pipelines (name, account_id, user_id)
SELECT 'Sales Pipeline', a.id, a.owner_user_id
FROM public.accounts a
WHERE NOT EXISTS (SELECT 1 FROM public.pipelines p WHERE p.account_id = a.id);

-- 3. Backfill stages for any pipeline that has none
INSERT INTO public.pipeline_stages (pipeline_id, name, position, color)
SELECT p.id, s.name, s.position, s.color
FROM public.pipelines p
CROSS JOIN (VALUES
  ('New Lead',      0, '#3b82f6'),
  ('Qualified',     1, '#eab308'),
  ('Proposal Sent', 2, '#f97316'),
  ('Negotiation',   3, '#8b5cf6'),
  ('Won',           4, '#22c55e')
) AS s(name, position, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.pipeline_stages ps
  WHERE ps.pipeline_id = p.id
);
