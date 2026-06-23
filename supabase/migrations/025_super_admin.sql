-- ============================================================
-- 025_super_admin.sql
--
-- Adds a global system-level admin role that spans across all
-- accounts. A user with system_role = 'super_admin' can
-- impersonate any account, view all data, and manage the system.
-- ============================================================

-- Add system_role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS system_role TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_system_role ON profiles(system_role);

-- Function to check if current user is a system admin
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND system_role = 'super_admin'
  );
$$;

-- RPC to set/unset a user as system admin (only existing system admins can call this)
CREATE OR REPLACE FUNCTION public.set_system_admin(target_user_id UUID, should_be_admin BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (SELECT public.is_system_admin()) THEN
    RAISE EXCEPTION 'Only a super admin can manage system admins';
  END IF;

  IF should_be_admin THEN
    UPDATE public.profiles
    SET system_role = 'super_admin'
    WHERE user_id = target_user_id;
  ELSE
    UPDATE public.profiles
    SET system_role = NULL
    WHERE user_id = target_user_id;
  END IF;
END;
$$;

-- Enable RPC access
GRANT EXECUTE ON FUNCTION public.is_system_admin TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_system_admin TO authenticated, service_role;
