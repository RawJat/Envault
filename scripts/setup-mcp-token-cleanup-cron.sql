-- Schedule automatic cleanup for expired MCP web tokens.
-- Requires pg_cron + pg_net in your Supabase database.

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Remove prior schedules if present (safe if missing).
DO $$
BEGIN
  PERFORM cron.unschedule('mcp-token-cleanup-daily');
  PERFORM cron.unschedule('mcp-token-cleanup-hourly');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Unschedule ignored: %', SQLERRM;
END $$;

-- Daily cleanup run at 00:20 UTC.
select cron.schedule(
  'mcp-token-cleanup-daily',
  '20 0 * * *',
  $$
  select net.http_get(
      url:='https://envault.tech/api/cron/mcp-token-cleanup',
      headers:=jsonb_build_object(
        'Authorization', 'Bearer <CRON_SECRET>'
      )
  ) as request_id;
  $$
);

-- Verify
select * from cron.job where jobname = 'mcp-token-cleanup-daily';
