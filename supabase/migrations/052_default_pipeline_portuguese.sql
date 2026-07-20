-- 052_default_pipeline_portuguese.sql
-- ============================================================
-- Pipeline padrão em português para todos os agentes
-- Estágios: Qualificado, Orçamento enviado, Negociando, Ganho
-- ============================================================

-- 1. Atualizar handle_new_user para criar pipeline com estágios em português
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_account_id UUID;
  v_pipeline_id UUID;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  INSERT INTO public.accounts (name, owner_user_id)
  VALUES (COALESCE(NULLIF(v_full_name, ''), NEW.email, 'Minha conta'), NEW.id)
  RETURNING id INTO v_account_id;

  INSERT INTO public.profiles (user_id, full_name, email, account_id, account_role)
  VALUES (NEW.id, v_full_name, NEW.email, v_account_id, 'owner');

  -- Pipeline padrão em português
  INSERT INTO public.pipelines (name, account_id, user_id)
  VALUES ('Funil de Vendas', v_account_id, NEW.id)
  RETURNING id INTO v_pipeline_id;

  INSERT INTO public.pipeline_stages (pipeline_id, name, position, color) VALUES
    (v_pipeline_id, 'Qualificado',        0, '#3b82f6'),
    (v_pipeline_id, 'Orçamento enviado',  1, '#eab308'),
    (v_pipeline_id, 'Negociando',         2, '#f97316'),
    (v_pipeline_id, 'Ganho',              3, '#22c55e');

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to bootstrap account/profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Atualizar redeem_invitation para criar pipeline para agente convidado
CREATE OR REPLACE FUNCTION public.redeem_invitation(
  p_token_hash TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_inv account_invitations%ROWTYPE;
  v_old_account_id UUID;
  v_old_account_owner UUID;
  v_has_data BOOLEAN;
  v_pipeline_id UUID;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inv
  FROM account_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '22023';
  END IF;
  IF v_inv.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitation has already been redeemed'
      USING ERRCODE = '22023';
  END IF;
  IF v_inv.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = '22023';
  END IF;

  SELECT p.account_id, a.owner_user_id
  INTO v_old_account_id, v_old_account_owner
  FROM profiles p
  JOIN accounts a ON a.id = p.account_id
  WHERE p.user_id = v_caller_id;

  IF v_old_account_id IS NULL THEN
    RAISE EXCEPTION 'Caller has no profile' USING ERRCODE = '42501';
  END IF;

  IF v_old_account_id = v_inv.account_id THEN
    RAISE EXCEPTION 'You are already a member of this account'
      USING ERRCODE = '23505';
  END IF;

  IF v_old_account_owner <> v_caller_id THEN
    RAISE EXCEPTION 'You are already in a shared account; sign up with a different email to join this one'
      USING ERRCODE = '23505';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM contacts WHERE account_id = v_old_account_id
    UNION ALL SELECT 1 FROM conversations WHERE account_id = v_old_account_id
    UNION ALL SELECT 1 FROM broadcasts WHERE account_id = v_old_account_id
    UNION ALL SELECT 1 FROM automations WHERE account_id = v_old_account_id
    UNION ALL SELECT 1 FROM flows WHERE account_id = v_old_account_id
    UNION ALL SELECT 1 FROM pipelines WHERE account_id = v_old_account_id
    UNION ALL SELECT 1 FROM message_templates WHERE account_id = v_old_account_id
    UNION ALL SELECT 1 FROM tags WHERE account_id = v_old_account_id
    UNION ALL SELECT 1 FROM custom_fields WHERE account_id = v_old_account_id
    UNION ALL SELECT 1 FROM contact_notes WHERE account_id = v_old_account_id
    UNION ALL SELECT 1 FROM whatsapp_config WHERE account_id = v_old_account_id
    LIMIT 1
  ) INTO v_has_data;

  IF v_has_data THEN
    RAISE EXCEPTION 'Your account already contains data; sign up with a different email to join this one'
      USING ERRCODE = '23505';
  END IF;

  -- Mover perfil para a conta do convidador
  UPDATE profiles
  SET account_id = v_inv.account_id,
      account_role = v_inv.role
  WHERE user_id = v_caller_id;

  UPDATE account_invitations
  SET accepted_at = NOW(),
      accepted_by_user_id = v_caller_id
  WHERE id = v_inv.id;

  -- Criar pipeline padrão em português para o agente convidado
  INSERT INTO public.pipelines (name, account_id, user_id)
  VALUES ('Funil de Vendas', v_inv.account_id, v_caller_id)
  RETURNING id INTO v_pipeline_id;

  INSERT INTO public.pipeline_stages (pipeline_id, name, position, color) VALUES
    (v_pipeline_id, 'Qualificado',        0, '#3b82f6'),
    (v_pipeline_id, 'Orçamento enviado',  1, '#eab308'),
    (v_pipeline_id, 'Negociando',         2, '#f97316'),
    (v_pipeline_id, 'Ganho',              3, '#22c55e');

  -- Limpar conta pessoal órfã
  DELETE FROM accounts WHERE id = v_old_account_id;

  RETURN v_inv.account_id;
END;
$$;

ALTER FUNCTION public.redeem_invitation(TEXT) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.redeem_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_invitation(TEXT) TO authenticated;

-- 3. Backfill: Criar pipeline padrão para usuários existentes que não têm
INSERT INTO public.pipelines (name, account_id, user_id)
SELECT 'Funil de Vendas', p.account_id, p.user_id
FROM public.profiles p
WHERE p.account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.pipelines pl
    WHERE pl.user_id = p.user_id
  );

-- 4. Backfill: Criar estágios para pipelines que não têm
INSERT INTO public.pipeline_stages (pipeline_id, name, position, color)
SELECT pl.id, s.name, s.position, s.color
FROM public.pipelines pl
CROSS JOIN (VALUES
  ('Qualificado',        0, '#3b82f6'),
  ('Orçamento enviado',  1, '#eab308'),
  ('Negociando',         2, '#f97316'),
  ('Ganho',              3, '#22c55e')
) AS s(name, position, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.pipeline_stages ps
  WHERE ps.pipeline_id = pl.id
);
