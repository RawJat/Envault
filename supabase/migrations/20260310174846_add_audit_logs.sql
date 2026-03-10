-- Phase 1: Database Schema

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL,
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('user', 'machine')),
    action VARCHAR(255) NOT NULL,
    target_resource_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON public.audit_logs(project_id);

-- Phase 2: Owner-Only RLS & Immutability

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to handle idempotency
DROP POLICY IF EXISTS "Owner-Only SELECT Policy" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON public.audit_logs;

-- Owner-Only SELECT Policy
-- Note: Project owners are defined via `public.user_owns_project()`, as the `project_members` 
-- table `role` column only validates against ('viewer', 'editor').
CREATE POLICY "Owner-Only SELECT Policy"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.user_owns_project(project_id, (select auth.uid())));

-- The INSERT policy has been removed to satisfy lint rule 0024_permissive_rls_policy.
-- The API uses the Service Role key exclusively for asynchronous inserts.

-- Explicitly noting that UPDATE and DELETE policies are omitted to enforce immutability for the API.

-- Phase 3: Automated Data Retention (pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule in case of rerun/idempotency
DO $$
BEGIN
  PERFORM cron.unschedule('audit_logs_cleanup');
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore error if job does not exist
END $$;

-- Schedule nightly cleanup at midnight
SELECT cron.schedule(
  'audit_logs_cleanup',
  '0 0 * * *',
  $$ DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '7 days'; $$
);
