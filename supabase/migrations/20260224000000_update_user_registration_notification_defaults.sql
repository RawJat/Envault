-- ============================================
-- FIX NOTIFICATION PREFERENCES INITIALIZATION
-- ============================================

-- 1. Registration Logic: Update the handle_new_user_profile trigger function 
-- (which acts as the createUser backend flow in our Supabase architecture)
-- to insert a default notification preferences record concurrently with account creation.
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

  -- Insert default notification preferences concurrently with account creation!
  -- Enforcing secure defaults (Access Requests: ON, Critical Errors: ON, Security Activity: ON)
  INSERT INTO public.notification_preferences (
    user_id,
    email_access_requests,
    email_access_granted,
    email_errors,
    email_activity,
    app_access_requests,
    app_access_granted,
    app_errors,
    app_activity
  ) VALUES (
    NEW.id,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    TRUE
  ) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Data Migration: Backfill these secure defaults for all existing users 
-- who currently have null or uninitialized preference records.
INSERT INTO public.notification_preferences (
  user_id,
  email_access_requests,
  email_access_granted,
  email_errors,
  email_activity,
  app_access_requests,
  app_access_granted,
  app_errors,
  app_activity
)
SELECT 
  id,
  TRUE,
  TRUE,
  FALSE,
  FALSE,
  TRUE,
  TRUE,
  TRUE,
  TRUE
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_preferences np WHERE np.user_id = auth.users.id
);
