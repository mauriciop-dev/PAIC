alter table public.pwa_communications add column if not exists scheduled_at timestamptz;
create index if not exists pwa_communications_schedule_idx on public.pwa_communications(status, scheduled_at) where scheduled_at is not null;

create or replace function public.pwa_publish_scheduled_communications() returns integer language plpgsql security invoker set search_path = public as $func$
declare affected integer;
begin
  update public.pwa_communications set status='publicado', published_at=coalesce(published_at,now()), updated_at=now() where status='borrador' and scheduled_at is not null and scheduled_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$func$;

create or replace function public.pwa_expire_visit_authorizations() returns integer language plpgsql security invoker set search_path = public as $func$
declare affected integer;
begin
  update public.pwa_visit_authorizations set status='expirada' where status in ('pendiente','aprobada') and visit_date < current_date;
  get diagnostics affected = row_count;
  return affected;
end;
$func$;

do $block$
begin
  if exists (select 1 from pg_extension where extname='pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname in ('pwa-publish-scheduled-communications','pwa-expire-visit-authorizations');
    perform cron.schedule('pwa-publish-scheduled-communications','*/5 * * * *','select public.pwa_publish_scheduled_communications();');
    perform cron.schedule('pwa-expire-visit-authorizations','*/30 * * * *','select public.pwa_expire_visit_authorizations();');
  end if;
exception when others then null;
end
$block$;
