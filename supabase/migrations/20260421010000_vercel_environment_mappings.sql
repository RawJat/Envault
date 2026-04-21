CREATE TABLE IF NOT EXISTS public.vercel_environment_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envault_project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  configuration_id TEXT NOT NULL REFERENCES public.vercel_installations(configuration_id) ON DELETE CASCADE,
  vercel_project_id TEXT NOT NULL,
  envault_environment_slug TEXT NOT NULL CHECK (envault_environment_slug IN ('development', 'preview', 'production')),
  vercel_target TEXT NOT NULL CHECK (vercel_target IN ('development', 'preview', 'production')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(envault_project_id, configuration_id, vercel_project_id, envault_environment_slug, vercel_target)
);

ALTER TABLE public.vercel_environment_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow members to view vercel environment mappings"
  ON public.vercel_environment_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = vercel_environment_mappings.envault_project_id
      AND project_members.user_id = auth.uid()
    )
  );
