-- Consolidate multiple permissive policies on projects table
-- Original warning: Multiple permissive policies are suboptimal for performance as each policy must be executed for every relevant query.
-- Policies to consolidate: "projects_select_policy", "Users access projects with shared secrets"

-- Drop existing policies
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "Users access projects with shared secrets" ON projects;

-- Create single consolidated policy
CREATE POLICY "projects_select_policy"
ON projects FOR SELECT
USING (
  -- 1. Project Owner
  user_id = (SELECT auth.uid())
  OR
  -- 2. Project Member (using SECURITY DEFINER function to avoid recursion)
  public.user_is_project_member(id, (SELECT auth.uid()))
  OR
  -- 3. Shared Secrets (Direct access via secret shares)
  id IN (
    SELECT s.project_id
    FROM secrets s
    JOIN secret_shares ss ON ss.secret_id = s.id
    WHERE ss.user_id = (SELECT auth.uid())
  )
);
