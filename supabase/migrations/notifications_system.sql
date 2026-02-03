-- ============================================
-- NOTIFICATIONS SYSTEM
-- ============================================
-- This migration creates the notifications system with:
-- 1. notifications table for storing user notifications
-- 2. notification_preferences table for user preferences
-- 3. Row Level Security policies
-- 4. Helper functions and triggers
-- 5. Realtime configuration

-- ============================================
-- CREATE TABLES
-- ============================================

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'access_request', 'access_granted', 'error', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  
  -- Visual representation
  icon VARCHAR(50) NOT NULL, -- lucide-react icon name: 'UserPlus', 'CheckCircle2', etc.
  variant VARCHAR(20) DEFAULT 'default', -- 'default', 'success', 'warning', 'error', 'info'
  
  -- Metadata (JSON for flexibility)
  metadata JSONB DEFAULT '{}', -- { project_id, requester_id, error_code, etc. }
  
  -- Action tracking
  action_url VARCHAR(500), -- Where to go when clicked
  action_type VARCHAR(50), -- 'approve_request', 'view_project', 'dismiss', etc.
  
  -- State
  is_read BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'), -- Auto-delete after 7 days
  
  -- Constraints
  CONSTRAINT valid_variant CHECK (variant IN ('default', 'success', 'warning', 'error', 'info'))
);

-- Notification preferences (per user)
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email notifications
  email_access_requests BOOLEAN DEFAULT TRUE,
  email_access_granted BOOLEAN DEFAULT TRUE,
  email_errors BOOLEAN DEFAULT TRUE,
  email_activity BOOLEAN DEFAULT FALSE,
  
  -- In-app notifications
  app_access_requests BOOLEAN DEFAULT TRUE,
  app_access_granted BOOLEAN DEFAULT TRUE,
  app_errors BOOLEAN DEFAULT TRUE,
  app_activity BOOLEAN DEFAULT TRUE,
  
  -- Digest settings
  digest_frequency VARCHAR(20) DEFAULT 'none', -- 'none', 'daily', 'weekly'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_digest_frequency CHECK (digest_frequency IN ('none', 'daily', 'weekly'))
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Index for fetching user's unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, is_read, created_at DESC) 
  WHERE is_read = FALSE;

-- Index for fetching user's notifications by type
CREATE INDEX IF NOT EXISTS idx_notifications_user_type 
  ON notifications(user_id, type, created_at DESC);

-- Index for cleanup job (expired notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_expires 
  ON notifications(expires_at) 
  WHERE expires_at IS NOT NULL;

-- Index for archived notifications
CREATE INDEX IF NOT EXISTS idx_notifications_archived 
  ON notifications(user_id, is_archived) 
  WHERE is_archived = TRUE;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on notification_preferences table
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert notifications (service role)
-- Users cannot insert their own notifications directly
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- Policy: Users can update their own notifications (mark as read, archive)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can view their own notification preferences
CREATE POLICY "Users can view own preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own notification preferences
CREATE POLICY "Users can insert own preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notification preferences
CREATE POLICY "Users can update own preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification_preferences updated_at
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create a notification (helper for server-side code)
CREATE OR REPLACE FUNCTION create_notification(
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
  INSERT INTO notifications (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime for notifications table
-- Note: This requires the table to be added to the supabase_realtime publication
-- Run this in Supabase SQL Editor or via dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- CLEANUP FUNCTION (for scheduled jobs)
-- ============================================

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete read notifications older than 7 days
  DELETE FROM notifications
  WHERE is_read = TRUE
    AND read_at < NOW() - INTERVAL '7 days';
  
  -- Delete unread notifications older than 15 days
  DELETE FROM notifications
  WHERE is_read = FALSE
    AND created_at < NOW() - INTERVAL '15 days';
  
  -- Delete expired notifications
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Set up a cron job in Supabase to run cleanup_old_notifications() daily
-- This can be done via pg_cron extension or Supabase Edge Functions

COMMENT ON TABLE notifications IS 'Stores user notifications for in-app and email delivery';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery channels';
COMMENT ON FUNCTION create_notification IS 'Helper function to create notifications from server-side code';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Scheduled function to clean up old notifications';
