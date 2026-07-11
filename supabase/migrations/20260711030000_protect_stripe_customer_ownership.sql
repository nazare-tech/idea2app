-- Stripe customer linkage is server-owned billing state. Users may continue
-- editing normal profile fields but cannot insert or replace customer IDs.

REVOKE INSERT, UPDATE ON TABLE public.profiles FROM anon;
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM authenticated;

GRANT INSERT (
  id,
  full_name,
  username,
  avatar_url,
  created_at,
  updated_at
) ON TABLE public.profiles TO authenticated;

GRANT UPDATE (
  full_name,
  username,
  avatar_url,
  updated_at
) ON TABLE public.profiles TO authenticated;
