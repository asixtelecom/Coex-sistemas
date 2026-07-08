-- 041_feature_permissions.sql

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions JSONB;

UPDATE profiles
SET permissions = CASE
  WHEN account_role IN ('owner', 'admin') THEN
    '{"broadcasts": true, "automations": true, "flows": true, "pedidos": true, "pagamentos": true, "assinaturas": true, "inventario": true}'::jsonb
  ELSE
    '{"broadcasts": false, "automations": false, "flows": false, "pedidos": false, "pagamentos": false, "assinaturas": false, "inventario": false}'::jsonb
END
WHERE permissions IS NULL;

CREATE OR REPLACE FUNCTION public.set_member_permissions(
  p_user_id UUID,
  p_permissions JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_account_id UUID;
  v_caller_role TEXT;
BEGIN
  SELECT account_role INTO v_caller_role
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only admins can change permissions'
      USING ERRCODE = '42501';
  END IF;

  SELECT account_id INTO v_target_account_id
  FROM profiles
  WHERE user_id = p_user_id;

  IF v_target_account_id IS NULL THEN
    RAISE EXCEPTION 'Target user not found'
      USING ERRCODE = '22023';
  END IF;

  IF v_target_account_id != (SELECT account_id FROM profiles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Target user is not in your account'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id AND account_role = 'owner') THEN
    RAISE EXCEPTION 'Cannot change permissions of the account owner'
      USING ERRCODE = '42501';
  END IF;

  UPDATE profiles
  SET permissions = p_permissions
  WHERE user_id = p_user_id;
END;
$$;

ALTER FUNCTION public.set_member_permissions(UUID, JSONB) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.set_member_permissions(UUID, JSONB) TO authenticated, service_role;