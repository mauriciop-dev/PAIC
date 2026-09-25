create type public.communication_channel as enum ('email', 'pwa', 'both');
create type public.communication_recurrence as enum ('none', 'weekly', 'monthly');
create type public.communication_campaign_status as enum ('active', 'paused', 'completed', 'cancelled');

create table public.communication_campaigns (
  id uuid primary key default gen_random_uuid(),
  conjunto_id text not null references public.conjuntos(id) on delete cascade,
  channel public.communication_channel not null default 'email',
  title text not null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  audience text not null default 'manual',
  recurrence public.communication_recurrence not null default 'none',
  scheduled_at timestamptz,
  recurrence_day integer,
  timezone text not null default 'America/Bogota',
  next_run_at timestamptz,
  last_run_at timestamptz,
  status public.communication_campaign_status not null default 'active',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recurrence_day is null or recurrence_day between 1 and 31)
);

create table public.communication_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.communication_campaigns(id) on delete cascade,
  conjunto_id text not null references public.conjuntos(id) on delete cascade,
  apartment text not null,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(campaign_id, apartment, email)
);

create table public.communication_campaign_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.communication_campaigns(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'completed', 'partial', 'failed')),
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  error text
);

create index communication_campaign_schedule_idx on public.communication_campaigns(status, next_run_at) where next_run_at is not null;
create index communication_campaign_recipients_campaign_idx on public.communication_campaign_recipients(campaign_id, apartment);

alter table public.communication_campaigns enable row level security;
alter table public.communication_campaign_recipients enable row level security;
alter table public.communication_campaign_runs enable row level security;

create policy communication_campaigns_admin_access on public.communication_campaigns for all to authenticated
using (conjunto_id = get_my_conjunto_id()) with check (conjunto_id = get_my_conjunto_id());
create policy communication_campaign_recipients_admin_access on public.communication_campaign_recipients for all to authenticated
using (conjunto_id = get_my_conjunto_id()) with check (conjunto_id = get_my_conjunto_id());
create policy communication_campaign_runs_admin_access on public.communication_campaign_runs for select to authenticated
using (exists (select 1 from public.communication_campaigns c where c.id = campaign_id and c.conjunto_id = get_my_conjunto_id()));

alter table public.pwa_communications add column if not exists audience text not null default 'all_residents';
alter table public.pwa_communications add column if not exists target_apartments text[] not null default '{}'::text[];

drop policy if exists pwa_communications_select_member on public.pwa_communications;
create policy pwa_communications_select_member on public.pwa_communications for select to authenticated
using (
  status = 'publicado'
  and public.pwa_is_member(conjunto_id)
  and (audience = 'all_residents' or target_apartments = '{}'::text[] or exists (
    select 1 from public.pwa_memberships membership
    where membership.user_id = (select auth.uid())
      and membership.conjunto_id = pwa_communications.conjunto_id
      and membership.apartment = any(pwa_communications.target_apartments)
      and membership.status = 'activo'
  ))
);

create or replace function public.communication_next_run(current_run timestamptz, recurrence_value public.communication_recurrence)
returns timestamptz language sql immutable as $$
  select case recurrence_value
    when 'weekly' then current_run + interval '7 days'
    when 'monthly' then current_run + interval '1 month'
    else null
  end;
$$;

create or replace function public.pwa_publish_due_campaigns() returns integer
language plpgsql security invoker set search_path = public as $func$
declare
  campaign record;
  affected integer := 0;
begin
  for campaign in
    select c.*, array_agg(r.apartment order by r.apartment) filter (where r.apartment is not null) as apartments
    from public.communication_campaigns c
    left join public.communication_campaign_recipients r on r.campaign_id = c.id
    where c.channel in ('pwa', 'both') and c.status = 'active' and c.next_run_at is not null and c.next_run_at <= now()
    group by c.id
  loop
    insert into public.pwa_communications (conjunto_id, title, body, attachment_url, status, published_at, created_by, audience, target_apartments)
    values (campaign.conjunto_id, campaign.title, campaign.body, null, 'publicado', now(), campaign.created_by, campaign.audience, coalesce(campaign.apartments, '{}'::text[]));
    update public.communication_campaigns
      set last_run_at = now(),
          next_run_at = public.communication_next_run(campaign.next_run_at, campaign.recurrence),
          status = case when campaign.recurrence = 'none' then 'completed'::public.communication_campaign_status else status end,
          updated_at = now()
      where id = campaign.id;
    affected := affected + 1;
  end loop;
  return affected;
end;
$func$;

do $block$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'pwa-publish-due-campaigns';
    perform cron.schedule('pwa-publish-due-campaigns', '*/5 * * * *', 'select public.pwa_publish_due_campaigns();');
  end if;
exception when others then null;
end
$block$;
