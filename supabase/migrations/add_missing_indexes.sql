-- Add Missing Indexes for Foreign Keys
-- Addresses Supabase linter info: unindexed_foreign_keys
-- Foreign keys without indexes can cause performance issues during JOINs and CASCADE operations

-- ============================================================================
-- 1. DEVICE_FLOW_SESSIONS - Add index on user_id
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_device_flow_sessions_user_id 
ON device_flow_sessions(user_id);

-- ============================================================================
-- 2. PROJECT_MEMBERS - Add index on added_by
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_project_members_added_by 
ON project_members(added_by);

-- ============================================================================
-- 3. SECRETS - Add index on last_updated_by
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_secrets_last_updated_by 
ON secrets(last_updated_by);

-- ============================================================================
-- NOTES ON UNUSED INDEXES
-- ============================================================================
-- The linter reports several "unused" indexes. These are likely unused because:
-- 1. The database is new/in development with minimal query traffic
-- 2. These indexes WILL be used by RLS policies and application queries
--
-- DO NOT DROP these indexes:
-- - idx_project_members_user (used by RLS policies for membership checks)
-- - idx_project_members_project (used by RLS policies for ownership checks)
-- - idx_secret_shares_user (used by RLS policies for share checks)
-- - idx_secret_shares_secret (used by RLS policies for secret access)
-- - idx_access_requests_user (used by RLS policies for request checks)
-- - idx_projects_user_id (used by RLS policies for ownership checks)
-- - idx_key_rotation_jobs_status (will be used for job processing queries)
-- - idx_key_rotation_jobs_new_key_id (will be used for key rotation lookups)
-- - idx_notifications_user_unread (used for fetching unread notifications count)
-- - idx_notifications_expires (used by cleanup job for expired notifications)
-- - idx_notifications_archived (used for filtering archived notifications)
--
-- These indexes are essential for RLS policy performance and will be utilized
-- as the application scales and query patterns emerge.
