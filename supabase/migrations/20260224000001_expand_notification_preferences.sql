-- ============================================================
-- EXPAND NOTIFICATION PREFERENCES TO 14 GRANULAR COLUMNS
-- ============================================================
-- Replaces the 4 broad email/app booleans with 7 per channel:
--   access_requests, access_granted, device_activity,
--   security_alerts, project_activity, cli_activity, system_updates
--
-- Email defaults for new users (per spec):
--   access_requests:   TRUE
--   access_granted:    TRUE
--   device_activity:   TRUE   <-- new device / unknown login
--   security_alerts:   FALSE
--   project_activity:  FALSE
--   cli_activity:      FALSE
--   system_updates:    FALSE
--
-- In-app defaults:
--   access_requests:   TRUE
--   access_granted:    TRUE
--   device_activity:   TRUE
--   security_alerts:   TRUE
--   project_activity:  TRUE
--   cli_activity:      TRUE
--   system_updates:    TRUE

-- ============================================================
-- STEP 1: Add the 10 new granular columns
-- (keep the 4 old ones live until data is migrated)
-- ============================================================

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_device_activity   BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_security_alerts   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_project_activity  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_cli_activity      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_system_updates    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS app_device_activity     BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS app_security_alerts     BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS app_project_activity    BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS app_cli_activity        BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS app_system_updates      BOOLEAN DEFAULT TRUE;

-- ============================================================
-- STEP 2: Rename old broad columns to the new granular names.
--         email_errors   -> email_security_alerts
--         email_activity -> email_project_activity
--         app_errors     -> app_security_alerts
--         app_activity   -> app_project_activity
-- We keep email_access_requests, email_access_granted,
--            app_access_requests, app_access_granted unchanged.
-- ============================================================

-- Backfill from old broad columns where they exist
UPDATE public.notification_preferences
SET
  email_security_alerts  = email_errors,
  email_project_activity = email_activity,
  app_security_alerts    = app_errors,
  app_project_activity   = app_activity;

-- Now drop the old broad columns that have been replaced
ALTER TABLE public.notification_preferences
  DROP COLUMN IF EXISTS email_errors,
  DROP COLUMN IF EXISTS email_activity,
  DROP COLUMN IF EXISTS app_errors,
  DROP COLUMN IF EXISTS app_activity;

-- ============================================================
-- STEP 3: Backfill all existing users who already have a row
-- (new columns already got DEFAULT values above; but ensure
--  specific columns that had no default match our intent)
-- ============================================================

UPDATE public.notification_preferences
SET
  email_device_activity  = TRUE,
  app_device_activity    = TRUE,
  app_security_alerts    = TRUE,
  app_project_activity   = TRUE,
  app_cli_activity       = TRUE,
  app_system_updates     = TRUE
WHERE email_device_activity IS NULL
   OR app_security_alerts IS NULL;

-- ============================================================
-- STEP 4: Backfill existing users who have NO prefs row at all
-- ============================================================

INSERT INTO public.notification_preferences (
  user_id,
  email_access_requests, email_access_granted,
  email_device_activity, email_security_alerts,
  email_project_activity, email_cli_activity, email_system_updates,
  app_access_requests, app_access_granted,
  app_device_activity, app_security_alerts,
  app_project_activity, app_cli_activity, app_system_updates
)
SELECT
  id,
  TRUE, TRUE,
  TRUE, FALSE,
  FALSE, FALSE, FALSE,
  TRUE, TRUE,
  TRUE, TRUE,
  TRUE, TRUE, TRUE
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_preferences np WHERE np.user_id = auth.users.id
);

-- ============================================================
-- STEP 5: Update the registration trigger to use new columns
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  extracted_username TEXT;
  base_username TEXT;
  suffix INTEGER := 1;
BEGIN
  -- Attempt to get specialized 'username' from metadata
  extracted_username := NEW.raw_user_meta_data->>'username';

  -- Fallback: Use email prefix (e.g. xyz@gmail.com -> xyz)
  IF extracted_username IS NULL OR extracted_username = '' THEN
    base_username := SPLIT_PART(NEW.email, '@', 1);
    extracted_username := base_username;

    -- Collision handler: If the auto-generated username exists, increment a suffix
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = extracted_username) LOOP
      extracted_username := base_username || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
  END IF;

  -- Insert or Update the profile
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    extracted_username,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  -- Insert default notification preferences with granular secure defaults
  INSERT INTO public.notification_preferences (
    user_id,
    email_access_requests, email_access_granted,
    email_device_activity, email_security_alerts,
    email_project_activity, email_cli_activity, email_system_updates,
    app_access_requests,  app_access_granted,
    app_device_activity,  app_security_alerts,
    app_project_activity, app_cli_activity, app_system_updates,
    digest_frequency
  ) VALUES (
    NEW.id,
    TRUE,  TRUE,
    TRUE,  FALSE,
    FALSE, FALSE, FALSE,
    TRUE,  TRUE,
    TRUE,  TRUE,
    TRUE,  TRUE, TRUE,
    'none'
  ) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger is still attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- ============================================================
-- STEP 6: Cron instructions (run manually in Supabase dashboard)
-- ============================================================
-- To schedule the digest email cron, run in the SQL editor:
--
-- SELECT cron.schedule(
--   'daily-digest',
--   '0 8 * * *',   -- every day at 8am UTC
--   $$SELECT net.http_get(
--       url      := 'https://<your-app-url>/api/cron/digest?frequency=daily',
--       headers  := '{"Authorization": "Bearer <your-cron-secret>"}'::jsonb
--   )$$
-- );
--
-- SELECT cron.schedule(
--   'weekly-digest',
--   '0 8 * * 1',   -- every Monday at 8am UTC
--   $$SELECT net.http_get(
--       url      := 'https://<your-app-url>/api/cron/digest?frequency=weekly',
--       headers  := '{"Authorization": "Bearer <your-cron-secret>"}'::jsonb
--   )$$
-- );
