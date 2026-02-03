-- ============================================
-- FIX SECURITY WARNINGS
-- ============================================
-- 1. Fix mutable search paths on functions
-- 2. restrict service role RLS policy

-- 1. Fix mutable search paths
-- Set search_path = public to prevent hijacking
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_icon VARCHAR,
  p_variant VARCHAR DEFAULT 'default',
  p_metadata JSONB DEFAULT '{}',
  p_action_url VARCHAR DEFAULT NULL,
  p_action_type VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    icon,
    variant,
    metadata,
    action_url,
    action_type
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_icon,
    p_variant,
    p_metadata,
    p_action_url,
    p_action_type
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete read notifications older than 7 days
  DELETE FROM public.notifications
  WHERE is_read = TRUE
    AND read_at < NOW() - INTERVAL '7 days';
  
  -- Delete unread notifications older than 15 days
  DELETE FROM public.notifications
  WHERE is_read = FALSE
    AND created_at < NOW() - INTERVAL '15 days';
  
  -- Delete expired notifications
  DELETE FROM public.notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. Restrict service role policy
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- Create a stricter policy that only allows the service_role
CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);
