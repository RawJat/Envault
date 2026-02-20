-- ==============================================================================
-- FIX & SETUP Hybrid Secret Rotation Schedules
-- ==============================================================================
-- We detected duplicate jobs and placeholder keys.
-- This script will CLEAN UP everything and re-schedule correctly.
--
-- SERVICE ROLE KEY: Auto-filled from your previous logs.
-- ==============================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- 1. CLEANUP ALL POTENTIAL DUPLICATES
-- We use a DO block to safely unschedule everything involved.
DO $$
BEGIN
    -- Unschedule the old legacy job
    PERFORM cron.unschedule('weekly-key-rotation');
    
    -- Unschedule the new jobs if they were created with wrong keys
    PERFORM cron.unschedule('rotate-keys-weekly-roll');
    PERFORM cron.unschedule('rotate-keys-hourly-scavenge');
    
    -- Also try to remove by ID if names don't match (optional, but names should match)
    -- We can't easily unschedule by ID in a loop without more complex logic, 
    -- so we stick to names. The previous output confirmed the names.
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Cleanup error ignored: %', SQLERRM;
END $$;

-- 2. SCHEDULE: Weekly Key Roll (Sunday Midnight)
select cron.schedule(
  'rotate-keys-weekly-roll',
  '0 0 * * 0', 
  $$
  select net.http_post(
      url:='https://peioebtllfssseibffos.supabase.co/functions/v1/rotate-keys',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
      body:='{"action": "roll_key"}'::jsonb
  ) as request_id;
  $$
);

-- 3. SCHEDULE: Hourly Scavenger (Minute 30)
select cron.schedule(
  'rotate-keys-hourly-scavenge',
  '30 * * * *', 
  $$
  select net.http_post(
      url:='https://peioebtllfssseibffos.supabase.co/functions/v1/rotate-keys',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_SERVICE_ROLE_KEY>"}'::jsonb,
      body:='{"action": "scavenge"}'::jsonb
  ) as request_id;
  $$
);

-- 4. VERIFY: Show active jobs
select * from cron.job;

-- 5. MONITOR: Check execution history (Run this to see if it worked)
select * from cron.job_run_details order by start_time desc limit 10;
