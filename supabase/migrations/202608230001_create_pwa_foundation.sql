create extension if not exists pgcrypto;

create type public.pwa_member_role as enum ('residente_principal','residente_secundario','propietario_no_residente');
create type public.pwa_member_status as enum ('pendiente','activo','inactivo');
create type public.pwa_communication_status as enum ('borrador','publicado','archivado');
create type public.pwa_reservation_status as enum ('pendiente','aprobada','rechazada','expirada');
create type public.pwa_pqr_status as enum ('pendiente','en_revision','respondido','cerrado');

create table public.pwa_memberships (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, conjunto_id text not null references public.conjuntos(id) on delete cascade, apartment text not null, role public.pwa_member_role not null, status public.pwa_member_status not null default 'pendiente', invited_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id, conjunto_id, apartment));
create table public.pwa_communications (id uuid primary key default gen_random_uuid(), conjunto_id text not null references public.conjuntos(id) on delete cascade, title text not null, body text not null, attachment_url text, attachment_type text, status public.pwa_communication_status not null default 'borrador', published_at timestamptz, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.pwa_account_status (id uuid primary key default gen_random_uuid(), conjunto_id text not null references public.conjuntos(id) on delete cascade, apartment text not null, status text not null check (status in ('al_dia','pendiente','en_mora')), balance numeric(14,2) not null default 0, observations text, updated_at timestamptz not null default now(), unique(conjunto_id, apartment));
create table public.pwa_reservations (id uuid primary key default gen_random_uuid(), conjunto_id text not null references public.conjuntos(id) on delete cascade, apartment text not null, user_id uuid not null references auth.users(id) on delete cascade, area_name text not null, reservation_date date not null, start_time time not null, end_time time not null, payment_proof_url text not null, status public.pwa_reservation_status not null default 'pendiente', created_at timestamptz not null default now(), expires_at timestamptz not null default (now() + interval '24 hours'), reviewed_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null, check (end_time > start_time));
create table public.pwa_pqrs (id uuid primary key default gen_random_uuid(), conjunto_id text not null references public.conjuntos(id) on delete cascade, apartment text not null, user_id uuid not null references auth.users(id) on delete cascade, type text not null check (type in ('peticion','queja','reclamo','felicitacion','informacion','otros')), title text not null, description text not null, attachment_url text, status public.pwa_pqr_status not null default 'pendiente', response_title text, response_body text, response_attachment_url text, created_at timestamptz not null default now(), responded_at timestamptz, responded_by uuid references auth.users(id) on delete set null);
create table public.pwa_documents (id uuid primary key default gen_random_uuid(), conjunto_id text not null references public.conjuntos(id) on delete cascade, category text not null, name text not null, description text, file_url text not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create table public.pwa_directories (id uuid primary key default gen_random_uuid(), conjunto_id text not null references public.conjuntos(id) on delete cascade, category text not null, entity_name text not null, phone text not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create table public.pwa_invitations (id uuid primary key default gen_random_uuid(), membership_id uuid not null references public.pwa_memberships(id) on delete cascade, email text not null, role public.pwa_member_role not null default 'residente_secundario', status public.pwa_member_status not null default 'pendiente', invited_by uuid not null references auth.users(id), created_at timestamptz not null default now(), accepted_at timestamptz);

create index pwa_memberships_user_idx on public.pwa_memberships(user_id, status);
create index pwa_memberships_unit_idx on public.pwa_memberships(conjunto_id, apartment, status);
create index pwa_communications_conjunto_idx on public.pwa_communications(conjunto_id, status, published_at desc);
create index pwa_reservations_conjunto_date_idx on public.pwa_reservations(conjunto_id, reservation_date);
create index pwa_pqrs_user_idx on public.pwa_pqrs(user_id, created_at desc);

create or replace function public.pwa_is_member(target_conjunto text, target_apartment text default null) returns boolean language sql stable security invoker set search_path = public as $$ select exists (select 1 from public.pwa_memberships m where m.user_id = (select auth.uid()) and m.conjunto_id = target_conjunto and m.status = 'activo' and (target_apartment is null or m.apartment = target_apartment)); $$;
create or replace function public.pwa_is_principal(target_conjunto text, target_apartment text) returns boolean language sql stable security invoker set search_path = public as $$ select exists (select 1 from public.pwa_memberships m where m.user_id = (select auth.uid()) and m.conjunto_id = target_conjunto and m.apartment = target_apartment and m.role = 'residente_principal' and m.status = 'activo'); $$;

alter table public.pwa_memberships enable row level security;
alter table public.pwa_communications enable row level security;
alter table public.pwa_account_status enable row level security;
alter table public.pwa_reservations enable row level security;
alter table public.pwa_pqrs enable row level security;
alter table public.pwa_documents enable row level security;
alter table public.pwa_directories enable row level security;
alter table public.pwa_invitations enable row level security;

create policy pwa_memberships_select_own on public.pwa_memberships for select to authenticated using (user_id = (select auth.uid()) or public.pwa_is_principal(conjunto_id, apartment));
create policy pwa_memberships_insert_self on public.pwa_memberships for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pendiente');
create policy pwa_communications_select_member on public.pwa_communications for select to authenticated using (status = 'publicado' and public.pwa_is_member(conjunto_id));
create policy pwa_account_status_select_member on public.pwa_account_status for select to authenticated using (public.pwa_is_member(conjunto_id, apartment));
create policy pwa_reservations_select_member on public.pwa_reservations for select to authenticated using (public.pwa_is_member(conjunto_id, apartment));
create policy pwa_reservations_insert_member on public.pwa_reservations for insert to authenticated with check (user_id = (select auth.uid()) and public.pwa_is_member(conjunto_id, apartment));
create policy pwa_pqrs_select_owner on public.pwa_pqrs for select to authenticated using (user_id = (select auth.uid()));
create policy pwa_pqrs_insert_member on public.pwa_pqrs for insert to authenticated with check (user_id = (select auth.uid()) and public.pwa_is_member(conjunto_id, apartment));
create policy pwa_documents_select_member on public.pwa_documents for select to authenticated using (public.pwa_is_member(conjunto_id));
create policy pwa_directories_select_member on public.pwa_directories for select to authenticated using (public.pwa_is_member(conjunto_id));
create policy pwa_invitations_select_principal on public.pwa_invitations for select to authenticated using (invited_by = (select auth.uid()));

create or replace function public.pwa_expire_pending_reservations() returns integer language plpgsql security invoker set search_path = public as $$ declare affected integer; begin update public.pwa_reservations set status = 'expirada' where status = 'pendiente' and expires_at < now(); get diagnostics affected = row_count; return affected; end; $$;
