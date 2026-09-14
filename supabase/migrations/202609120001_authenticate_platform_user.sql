-- =============================================
-- Authentication RPC for internal/platform users
-- =============================================
-- Problem: the webapp LoginForm calls authenticate_platform_user RPC, which
-- did not exist, then falls back to a direct SELECT on public.users. That
-- direct query is blocked by RLS because the caller is unauthenticated, so
-- portería/internal users always get "Correo o contraseña incorrectos".
--
-- Fix: expose a SECURITY DEFINER RPC that bypasses RLS for the explicit
-- purpose of validating an internal user's email/password and returning the
-- matching row. Also grant usage to anon/authenticated callers.
-- =============================================

-- Ensure access_points has email and password columns (migration 007 may
-- not have been applied to production yet).
alter table public.access_points
  add column if not exists email text,
  add column if not exists password text;

-- =============================================
-- Authentication RPC
-- =============================================

create or replace function public.authenticate_platform_user(
  _email text,
  _password text
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  user_record public.users%rowtype;
begin
  -- Exact match, consistent with the previous application fallback logic.
  -- Email and password are stored as plain text in public.users for internal
  -- platform users (portería, contador, etc.).
  select *
  into user_record
  from public.users
  where email = _email
    and password = _password;

  return user_record;
end;
$$;

-- Lock down permissions: only the roles that need to log in can execute it.
revoke all on function public.authenticate_platform_user(text, text) from public;
grant execute on function public.authenticate_platform_user(text, text) to anon;
grant execute on function public.authenticate_platform_user(text, text) to authenticated;

-- Backfill: make sure every access point that already has email/password
-- credentials also has a matching row in public.users. This fixes porterías
-- created before the user-sync logic existed.
insert into public.users (conjunto_id, name, email, password, role, phone_number)
select ap.conjunto_id,
       'Portería ' || ap.name,
       ap.email,
       ap.password,
       'Guard',
       ''
from public.access_points ap
where ap.email is not null
  and ap.password is not null
  and not exists (
    select 1 from public.users u where u.email = ap.email
  );
