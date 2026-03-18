-- Create per-user GitHub App installations table (1-to-many relationship)
-- This replaces the single github_installation_id column on the projects table.
-- A project retains github_repo_full_name (which repo is linked) while the
-- installation itself is resolved through this table.

CREATE TABLE IF NOT EXISTS public.github_installations (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installation_id BIGINT NOT NULL,
  account_login   TEXT,        -- GitHub username or org name for display
  account_type    TEXT,        -- 'User' or 'Organization'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, installation_id)
);

ALTER TABLE public.github_installations ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own installations
CREATE POLICY "Users manage own installations"
  ON public.github_installations
  FOR ALL
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_github_installations_user_id
  ON public.github_installations (user_id);

-- Remove the now-redundant column from projects.
-- Projects keep github_repo_full_name (which repo is linked).
-- The installation is resolved through github_installations.
ALTER TABLE public.projects
  DROP COLUMN IF EXISTS github_installation_id;
