-- The previous job only published PWA rows and could not send email or push.
-- The protected Edge Function run-communication-campaigns owns the complete execution.
do $block$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'pwa-publish-due-campaigns';
  end if;
exception when others then null;
end
$block$;
