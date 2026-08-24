create type public.pwa_visit_authorization_status as enum ('pendiente','aprobada','rechazada','usada','expirada');

create table public.pwa_visit_authorizations (
  id uuid primary key default gen_random_uuid(),
  conjunto_id text not null references public.conjuntos(id) on delete cascade,
  apartment text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  visitor_name text not null,
  visitor_phone text,
  visit_date date not null,
  notes text,
  status public.pwa_visit_authorization_status not null default 'pendiente',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index pwa_visit_auth_conjunto_date_idx on public.pwa_visit_authorizations(conjunto_id, visit_date, status);
create index pwa_visit_auth_user_idx on public.pwa_visit_authorizations(user_id, created_at desc);

alter table public.pwa_visit_authorizations enable row level security;
create policy pwa_visit_auth_select_own on public.pwa_visit_authorizations for select to authenticated using (user_id = (select auth.uid()));
create policy pwa_visit_auth_insert_member on public.pwa_visit_authorizations for insert to authenticated with check (user_id = (select auth.uid()) and public.pwa_is_member(conjunto_id, apartment));
create policy pwa_visit_auth_admin_select on public.pwa_visit_authorizations for select to authenticated using (public.pwa_is_admin(conjunto_id));
create policy pwa_visit_auth_admin_update on public.pwa_visit_authorizations for update to authenticated using (public.pwa_is_admin(conjunto_id)) with check (public.pwa_is_admin(conjunto_id));
