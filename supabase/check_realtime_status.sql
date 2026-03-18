-- ==============================================================================
-- SUPABASE REALTIME VERIFICATION SCRIPT (v2)
-- Run this in the Supabase SQL Editor.
-- ==============================================================================

-- 1. Check if Replica Identity is set correctly (required for complete UPDATE/DELETE payloads)
-- 'd' = default (primary key only), 'f' = full (all columns)
-- Supabase Realtime requires 'f' (full) or 'd' depending on if you need the 'old' record payload.
SELECT 
    relname AS table_name,
    CASE relreplident
        WHEN 'd' THEN 'default (primary key only)'
        WHEN 'n' THEN 'nothing'
        WHEN 'f' THEN 'full (all columns - BEST for Realtime)'
        WHEN 'i' THEN 'index'
    END AS replica_identity
FROM pg_class
WHERE relname IN ('projects', 'project_members', 'secrets', 'notifications')
  AND relkind = 'r';

-- ==============================================================================
-- FIX: SET ALL TABLES TO 'FULL' SO UI UPDATES WORK PROPERLY
-- ==============================================================================

ALTER TABLE projects REPLICA IDENTITY FULL;
ALTER TABLE project_members REPLICA IDENTITY FULL;
ALTER TABLE secrets REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
