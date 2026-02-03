-- Consolidate Multiple Permissive Policies
-- Combines multiple SELECT policies into single policies to improve performance
-- This addresses Supabase linter warning: multiple_permissive_policies

-- ============================================================================
-- 1. ACCESS_REQUESTS TABLE
-- Consolidate 3 SELECT policies into 1
-- ============================================================================

-- Drop the three separate SELECT policies
DROP POLICY IF EXISTS "Users manage own requests" ON access_requests;
DROP POLICY IF EXISTS "Owners view project requests" ON access_requests;
DROP POLICY IF EXISTS "Owners view secret requests" ON access_requests;

-- Create a single consolidated SELECT policy
CREATE POLICY "access_requests_select_policy"
  ON access_requests FOR SELECT
  USING (
    -- Users can see their own requests
    user_id = (SELECT auth.uid())
    OR
    -- Owners can view requests for their projects
    project_id IN (
      SELECT id FROM projects WHERE user_id = (SELECT auth.uid())
    )
    OR
    -- Owners can view requests for secrets in their projects
    secret_id IN (
      SELECT s.id FROM secrets s
      JOIN projects p ON p.id = s.project_id
      WHERE p.user_id = (SELECT auth.uid())
    )
  );

-- Create separate policies for INSERT, UPDATE, DELETE (users manage their own)
CREATE POLICY "access_requests_insert_policy"
  ON access_requests FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "access_requests_update_policy"
  ON access_requests FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "access_requests_delete_policy"
  ON access_requests FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 2. PROJECT_MEMBERS TABLE
-- Consolidate 2 SELECT policies into 1
-- ============================================================================

-- Drop the two separate policies
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_modify_policy" ON project_members;

-- Create a single consolidated SELECT policy
CREATE POLICY "project_members_select_policy"
  ON project_members FOR SELECT
  USING (
    -- Users can see their own memberships
    user_id = (SELECT auth.uid())
    OR
    -- Users can see memberships for projects they own
    public.user_owns_project(project_id, (SELECT auth.uid()))
  );

-- Create separate policies for INSERT, UPDATE, DELETE
-- Only project owners can modify memberships
CREATE POLICY "project_members_insert_policy"
  ON project_members FOR INSERT
  WITH CHECK (public.user_owns_project(project_id, (SELECT auth.uid())));

CREATE POLICY "project_members_update_policy"
  ON project_members FOR UPDATE
  USING (public.user_owns_project(project_id, (SELECT auth.uid())));

CREATE POLICY "project_members_delete_policy"
  ON project_members FOR DELETE
  USING (public.user_owns_project(project_id, (SELECT auth.uid())));

-- ============================================================================
-- 3. SECRET_SHARES TABLE
-- Consolidate 2 SELECT policies into 1
-- ============================================================================

-- Drop the two separate SELECT policies
DROP POLICY IF EXISTS "Owners can manage secret shares" ON secret_shares;
DROP POLICY IF EXISTS "Users view their own secret shares" ON secret_shares;

-- Create a single consolidated SELECT policy
CREATE POLICY "secret_shares_select_policy"
  ON secret_shares FOR SELECT
  USING (
    -- Users can view their own secret shares
    user_id = (SELECT auth.uid())
    OR
    -- Owners can view all shares for secrets in their projects
    EXISTS (
      SELECT 1 FROM secrets
      JOIN projects ON projects.id = secrets.project_id
      WHERE secrets.id = secret_shares.secret_id
      AND projects.user_id = (SELECT auth.uid())
    )
  );

-- Create separate policies for INSERT, UPDATE, DELETE
-- Only project owners can manage secret shares
CREATE POLICY "secret_shares_insert_policy"
  ON secret_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM secrets
      JOIN projects ON projects.id = secrets.project_id
      WHERE secrets.id = secret_shares.secret_id
      AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "secret_shares_update_policy"
  ON secret_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM secrets
      JOIN projects ON projects.id = secrets.project_id
      WHERE secrets.id = secret_shares.secret_id
      AND projects.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "secret_shares_delete_policy"
  ON secret_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM secrets
      JOIN projects ON projects.id = secrets.project_id
      WHERE secrets.id = secret_shares.secret_id
      AND projects.user_id = (SELECT auth.uid())
    )
  );
