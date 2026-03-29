-- Reschedule rotate-keys cron to authenticate with x-cron-secret.
-- IMPORTANT:
-- Replace REPLACE_WITH_ROTATE_KEYS_CRON_SECRET with your real secret and
-- keep it aligned with the Edge Function env var ROTATE_KEYS_CRON_SECRET.

create extension if not exists pg_net;
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('weekly-key-rotation');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'weekly-key-rotation',
  '0 0 * * 0',
  $$
  select net.http_post(
      url:='https://peioebtllfssseibffos.supabase.co/functions/v1/rotate-keys',
      headers:='{"Content-Type": "application/json", "x-cron-secret": "REPLACE_WITH_ROTATE_KEYS_CRON_SECRET"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;
  $$
);
