-- Phase 1: Database Architecture (Supabase Schema) for Vercel Integration

CREATE TABLE IF NOT EXISTS public.vercel_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id TEXT NOT NULL UNIQUE,
  vercel_team_id TEXT, -- Optional, if installed on a Vercel Team instead of Personal Account
  access_token TEXT NOT NULL, -- Encrypted Token
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vercel_project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envault_project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  vercel_project_id TEXT NOT NULL,
  vercel_project_name TEXT,
  configuration_id TEXT NOT NULL REFERENCES public.vercel_installations(configuration_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure one Vercel project cannot be linked to the same Envault project multiple times
  UNIQUE(envault_project_id, vercel_project_id) 
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.vercel_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vercel_project_links ENABLE ROW LEVEL SECURITY;

-- Allow admins/owners to view installations
CREATE POLICY "Allow members to view vercel links" ON public.vercel_project_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = vercel_project_links.envault_project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Backend service role (for callbacks) handles inserts.
