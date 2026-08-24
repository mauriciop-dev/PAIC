-- Secure resident onboarding: invitations are independent from auth users and
-- are consumed only after a verified OAuth session is established.
create type public.pwa_resident_status as enum
  ('pending_invite', 'invited', 'active', 'pending_approval', 'blocked', 'revoked');

alter table public.residents
  add column if not exists pwa_status public.pwa_resident_status not null default 'pending_invite',
  add column if not exists pwa_invited_at timestamptz,
  add column if not exists pwa_activated_at timestamptz,
  add column if not exists pwa_revoked_at timestamptz,
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create table if not exists public.pwa_resident_invitations (
  id uuid primary key default gen_random_uuid(),
  conjunto_id text not null references public.conjuntos(id) on delete cascade,
  apartment text not null,
  email_normalized text not null,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  sent_at timestamptz,
  resend_count integer not null default 0,
  last_send_status text,
  created_at timestamptz not null default now(),
  unique (conjunto_id, apartment, email_normalized, created_at)
);

create index if not exists pwa_resident_invites_token_idx
  on public.pwa_resident_invitations(token_hash) where used_at is null and revoked_at is null;
create index if not exists residents_pwa_access_idx
  on public.residents(conjunto_id, pwa_status, email);

alter table public.pwa_resident_invitations enable row level security;

create or replace function public.pwa_normalize_email(value text)
returns text language sql immutable strict as $$ select lower(trim(value)); $$;

create or replace function public.pwa_issue_resident_invitation(
  target_conjunto text, target_apartment text, target_email text, target_token_hash text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid();
  resident_row public.residents%rowtype;
  invitation_id uuid;
begin
  if actor is null then raise exception 'No autenticado'; end if;
  if not exists (select 1 from public.user_profiles p where p.id = actor and p.conjunto_id = target_conjunto and p.role in ('admin','subscriber','internal')) then
    raise exception 'Sin permisos para este conjunto';
  end if;
  select * into resident_row from public.residents where conjunto_id = target_conjunto and apartment = target_apartment for update;
  if not found or resident_row.email is null or lower(trim(resident_row.email)) <> lower(trim(target_email)) then
    raise exception 'Residente o correo no válido';
  end if;
  update public.pwa_resident_invitations set revoked_at = now()
    where conjunto_id = target_conjunto and apartment = target_apartment and used_at is null and revoked_at is null;
  insert into public.pwa_resident_invitations (conjunto_id, apartment, email_normalized, token_hash, created_by)
    values (target_conjunto, target_apartment, public.pwa_normalize_email(target_email), target_token_hash, actor)
    returning id into invitation_id;
  update public.residents set pwa_status = 'invited', pwa_invited_at = now(), pwa_revoked_at = null
    where conjunto_id = target_conjunto and apartment = target_apartment;
  return jsonb_build_object('invitation_id', invitation_id, 'expires_at', now() + interval '7 days');
end; $$;

create or replace function public.pwa_consume_resident_invitation(target_token_hash text)
returns public.pwa_memberships language plpgsql security definer set search_path = public as $$
declare
  actor uuid := auth.uid(); inv public.pwa_resident_invitations%rowtype; resident_row public.residents%rowtype; membership_row public.pwa_memberships%rowtype;
begin
  if actor is null then raise exception 'No autenticado'; end if;
  select * into inv from public.pwa_resident_invitations where token_hash = target_token_hash and used_at is null and revoked_at is null and expires_at > now() for update;
  if not found then raise exception 'Invitación inválida, expirada o ya utilizada'; end if;
  if lower(trim(coalesce((select email from auth.users where id = actor), ''))) <> inv.email_normalized then raise exception 'El correo autenticado no coincide con la invitación'; end if;
  select * into resident_row from public.residents where conjunto_id = inv.conjunto_id and apartment = inv.apartment for update;
  if not found or resident_row.pwa_status in ('blocked','revoked') then raise exception 'El acceso del residente no está habilitado'; end if;
  insert into public.pwa_memberships (user_id, conjunto_id, apartment, role, status, invited_by)
    values (actor, inv.conjunto_id, inv.apartment, 'residente_principal', 'activo', inv.created_by)
    on conflict (user_id, conjunto_id, apartment) do update set status = 'activo', updated_at = now()
    returning * into membership_row;
  update public.pwa_resident_invitations set used_at = now(), last_send_status = 'accepted' where id = inv.id;
  update public.residents set user_id = actor, pwa_status = 'active', pwa_activated_at = now(), pwa_revoked_at = null
    where conjunto_id = inv.conjunto_id and apartment = inv.apartment;
  return membership_row;
end; $$;

revoke all on function public.pwa_issue_resident_invitation(text,text,text,text) from public;
revoke all on function public.pwa_consume_resident_invitation(text) from public;
grant execute on function public.pwa_issue_resident_invitation(text,text,text,text) to authenticated;
grant execute on function public.pwa_consume_resident_invitation(text) to authenticated;
