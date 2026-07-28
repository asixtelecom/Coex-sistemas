-- ============================================================
-- 040_pipeline_stages_portuguese.sql
--
-- Renames default pipeline stages from English to Portuguese
-- and updates the handle_new_user trigger for new signups.
-- ============================================================

-- 1. Update the trigger function so new signups get Portuguese names
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
  VALUES ('Funil de Vendas', v_account_id, NEW.id)
  RETURNING id INTO v_pipeline_id;

  INSERT INTO public.pipeline_stages (pipeline_id, name, position, color) VALUES
    (v_pipeline_id, 'Novo',               0, '#3b82f6'),
    (v_pipeline_id, 'Qualificado',        1, '#eab308'),
    (v_pipeline_id, 'Orçamento enviado',  2, '#f97316'),
    (v_pipeline_id, 'Negociando',         3, '#8b5cf6'),
    (v_pipeline_id, 'Ganho',              4, '#22c55e');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to bootstrap account/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- 2. Rename existing English-named stages to Portuguese
UPDATE public.pipeline_stages SET name = 'Novo'               WHERE name = 'New Lead';
UPDATE public.pipeline_stages SET name = 'Qualificado'        WHERE name = 'Qualified';
UPDATE public.pipeline_stages SET name = 'Orçamento enviado'  WHERE name = 'Proposal Sent';
UPDATE public.pipeline_stages SET name = 'Negociando'         WHERE name = 'Negotiation';
UPDATE public.pipeline_stages SET name = 'Ganho'              WHERE name = 'Won';

-- Also normalize the variant Portuguese names from message-thread fallback
UPDATE public.pipeline_stages SET name = 'Novo'               WHERE name = 'Contato';
UPDATE public.pipeline_stages SET name = 'Qualificado'        WHERE name = 'Qualificação';
UPDATE public.pipeline_stages SET name = 'Orçamento enviado'  WHERE name = 'Proposta';
UPDATE public.pipeline_stages SET name = 'Ganho'              WHERE name = 'Fechamento';

-- Normalize the pipelines/page.tsx variant names
UPDATE public.pipeline_stages SET name = 'Novo'               WHERE name = 'Novo Lead';
UPDATE public.pipeline_stages SET name = 'Orçamento enviado'  WHERE name = 'Proposta Enviada';

-- 3. Rename existing pipeline names
UPDATE public.pipelines SET name = 'Funil de Vendas' WHERE name = 'Sales Pipeline';
