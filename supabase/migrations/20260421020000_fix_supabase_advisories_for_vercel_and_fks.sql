-- Fix actionable Supabase advisories for Vercel integration and FK performance.

-- 1) Add missing RLS policy for vercel_installations.
-- This resolves: rls_enabled_no_policy on public.vercel_installations
DROP POLICY IF EXISTS "Allow access to vercel installations" ON public.vercel_installations;
CREATE POLICY "Allow access to vercel installations"
  ON public.vercel_installations
  FOR SELECT USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.vercel_project_links vpl
      JOIN public.project_members pm
        ON pm.project_id = vpl.envault_project_id
      WHERE vpl.configuration_id = vercel_installations.configuration_id
        AND pm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.vercel_project_links vpl
      JOIN public.projects p
        ON p.id = vpl.envault_project_id
      WHERE vpl.configuration_id = vercel_installations.configuration_id
        AND p.user_id = (SELECT auth.uid())
    )
  );

-- 2) Optimize RLS policy expressions to avoid per-row auth initplan overhead.
-- This resolves: auth_rls_initplan warnings.

DROP POLICY IF EXISTS "Allow members to view vercel links" ON public.vercel_project_links;
CREATE POLICY "Allow members to view vercel links"
  ON public.vercel_project_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.project_members
      WHERE project_members.project_id = vercel_project_links.envault_project_id
        AND project_members.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = vercel_project_links.envault_project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Allow members to view vercel environment mappings" ON public.vercel_environment_mappings;
CREATE POLICY "Allow members to view vercel environment mappings"
  ON public.vercel_environment_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.project_members
      WHERE project_members.project_id = vercel_environment_mappings.envault_project_id
        AND project_members.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = vercel_environment_mappings.envault_project_id
        AND projects.user_id = (SELECT auth.uid())
    )
  );

-- 3) Add missing indexes for foreign key columns.
-- This resolves: unindexed_foreign_keys advisories.
CREATE INDEX IF NOT EXISTS idx_service_tokens_created_by
  ON public.service_tokens (created_by);

CREATE INDEX IF NOT EXISTS idx_vercel_installations_created_by
  ON public.vercel_installations (created_by);

CREATE INDEX IF NOT EXISTS idx_vercel_project_links_configuration_id
  ON public.vercel_project_links (configuration_id);

CREATE INDEX IF NOT EXISTS idx_vercel_environment_mappings_configuration_id
  ON public.vercel_environment_mappings (configuration_id);
