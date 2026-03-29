-- Schedule daily account deletion purge through Supabase Edge Function.
-- IMPORTANT:
-- Replace REPLACE_WITH_ACCOUNT_DELETION_CRON_SECRET with your real secret
-- and keep it aligned with the Edge Function env var ACCOUNT_DELETION_CRON_SECRET.

create extension if not exists pg_net;
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('account-deletion-purge-daily');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'account-deletion-purge-daily',
  '0 0 * * *',
  $$
  select net.http_post(
      url:='https://peioebtllfssseibffos.supabase.co/functions/v1/process-account-deletions',
      headers:='{"Content-Type": "application/json", "x-cron-secret": "REPLACE_WITH_ACCOUNT_DELETION_CRON_SECRET"}'::jsonb,
      body:='{}'::jsonb,
      timeout_milliseconds:=60000
  ) as request_id;
  $$
);
