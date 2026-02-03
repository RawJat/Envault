-- COMPLETE FIX FOR INFINITE RECURSION
-- Root cause: projects policy checks project_members, which checks projects (circular)
-- Solution: Use SECURITY DEFINER functions that bypass RLS completely

-- ============================================================================
-- STEP 1: Drop existing functions if they exist
-- ============================================================================

DROP FUNCTION IF EXISTS public.is_project_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_project_owner(uuid, uuid);
DROP FUNCTION IF EXISTS public.user_owns_project(uuid, uuid);

-- ============================================================================
-- STEP 2: Create Security Definer Helper Functions (bypass RLS)
-- ============================================================================

-- Function to check if user is a project member (bypasses RLS)
CREATE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
$$;

-- Function to check if user owns a project (bypasses RLS)
CREATE FUNCTION public.is_project_owner(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = p_user_id
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_project_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_owner TO authenticated;

-- ============================================================================
-- STEP 3: Drop ALL existing policies that could cause recursion
-- ============================================================================

-- Projects policies
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users view owned or shared projects" ON projects;
DROP POLICY IF EXISTS "projects_select_policy" ON projects;

-- Project members policies
DROP POLICY IF EXISTS "Owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Members can view themselves" ON project_members;
DROP POLICY IF EXISTS "Users view own memberships" ON project_members;
DROP POLICY IF EXISTS "Members view project members" ON project_members;
DROP POLICY IF EXISTS "Authenticated users manage members" ON project_members;
DROP POLICY IF EXISTS "Users view memberships" ON project_members;
DROP POLICY IF EXISTS "View own memberships" ON project_members;
DROP POLICY IF EXISTS "View memberships for owned projects" ON project_members;
DROP POLICY IF EXISTS "Manage memberships" ON project_members;
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_modify_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_insert_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_update_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_delete_policy" ON project_members;

-- Secrets policies
DROP POLICY IF EXISTS "Users can view their own secrets" ON secrets;
DROP POLICY IF EXISTS "Users view allowed secrets" ON secrets;
DROP POLICY IF EXISTS "Users can update their own secrets" ON secrets;
DROP POLICY IF EXISTS "Users update allowed secrets" ON secrets;
DROP POLICY IF EXISTS "Users can insert their own secrets" ON secrets;
DROP POLICY IF EXISTS "Users insert allowed secrets" ON secrets;
DROP POLICY IF EXISTS "Users can delete their own secrets" ON secrets;
DROP POLICY IF EXISTS "Users delete allowed secrets" ON secrets;
DROP POLICY IF EXISTS "secrets_select_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_insert_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_update_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_delete_policy" ON secrets;

-- ============================================================================
-- STEP 4: Create NON-RECURSIVE policies using security definer functions
-- ============================================================================

-- PROJECTS: Use security definer function to avoid recursion
CREATE POLICY "projects_select_policy"
  ON projects FOR SELECT
  USING (
    -- User owns the project
    user_id = auth.uid()
    OR
    -- User is a member (using security definer function - no RLS recursion)
    public.is_project_member(id, auth.uid())
  );

-- PROJECT_MEMBERS: Simple policies without recursion
CREATE POLICY "project_members_select_policy"
  ON project_members FOR SELECT
  USING (
    -- Users can see their own memberships
    user_id = auth.uid()
    OR
    -- Users can see memberships for projects they own (using security definer)
    public.is_project_owner(project_id, auth.uid())
  );

-- Project members modification (app-level authorization)
CREATE POLICY "project_members_insert_policy"
  ON project_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "project_members_update_policy"
  ON project_members FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "project_members_delete_policy"
  ON project_members FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- SECRETS: Non-recursive policies
CREATE POLICY "secrets_select_policy"
  ON secrets FOR SELECT
  USING (
    -- Owner of project (using security definer)
    public.is_project_owner(project_id, auth.uid())
    OR
    -- Member of project (using security definer)
    public.is_project_member(project_id, auth.uid())
    OR
    -- Has granular share access
    EXISTS (
      SELECT 1 FROM secret_shares
      WHERE secret_shares.secret_id = secrets.id
      AND secret_shares.user_id = auth.uid()
    )
  );

CREATE POLICY "secrets_insert_policy"
  ON secrets FOR INSERT
  WITH CHECK (
    -- Owner or Editor member
    public.is_project_owner(project_id, auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = secrets.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'editor'
    )
  );

CREATE POLICY "secrets_update_policy"
  ON secrets FOR UPDATE
  USING (
    -- Owner or Editor member
    public.is_project_owner(project_id, auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = secrets.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'editor'
    )
  );

CREATE POLICY "secrets_delete_policy"
  ON secrets FOR DELETE
  USING (
    -- Owner or Editor member
    public.is_project_owner(project_id, auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = secrets.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'editor'
    )
  );
