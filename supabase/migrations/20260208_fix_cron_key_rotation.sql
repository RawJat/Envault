-- ==============================================================================
-- Fix Key Rotation Cron Job
-- ==============================================================================
-- Description: 
-- The previous cron job definition was missing the Authorization header required
-- to invoke the Edge Function (which has 'Verify JWT' enabled by default).
-- This script unschedules the old job and schedules a new one with the correct
-- Service Role Key.
--
-- IMPORTANT:
-- Replace 'YOUR_SERVICE_ROLE_KEY' with your actual service_role key.
-- You can find this in your Supabase Dashboard > Project Settings > API.
-- ==============================================================================

-- 1. Unschedule the existing job if it exists
select cron.unschedule('weekly-key-rotation');

-- 2. Schedule the job with the correct Authorization header
-- https://peioebtllfssseibffos.supabase.co/functions/v1/rotate-keys
select cron.schedule(
  'weekly-key-rotation',
  '0 0 * * 0', -- Weekly on Sunday at midnight
  $$
  select net.http_post(
      url:='https://peioebtllfssseibffos.supabase.co/functions/v1/rotate-keys',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;
  $$
);
