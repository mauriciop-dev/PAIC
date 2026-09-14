-- Migration: create authenticate_platform_user RPC
-- Problem: internal platform users (portería, contador, etc.) could not log in
-- because the fallback direct SELECT on public.users is blocked by RLS for
-- unauthenticated callers.
--
-- Fix: expose a SECURITY DEFINER RPC that validates email/password against
-- public.users and returns the matching row.

CREATE OR REPLACE FUNCTION public.authenticate_platform_user(
  _email text,
  _password text
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record public.users%rowtype;
BEGIN
  SELECT *
  INTO user_record
  FROM public.users
  WHERE email = _email
    AND password = _password;

  RETURN user_record;
END;
$$;

REVOKE ALL ON FUNCTION public.authenticate_platform_user(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.authenticate_platform_user(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.authenticate_platform_user(text, text) TO authenticated;

-- Backfill: ensure existing access_points with credentials have a users row.
INSERT INTO public.users (conjunto_id, name, email, password, role, phone_number)
SELECT ap.conjunto_id,
       'Portería ' || ap.name,
       ap.email,
       ap.password,
       'Guard',
       ''
FROM public.access_points ap
WHERE ap.email IS NOT NULL
  AND ap.password IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.email = ap.email
  );
