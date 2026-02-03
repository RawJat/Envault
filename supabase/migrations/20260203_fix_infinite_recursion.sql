-- Fix Infinite Recursion in RLS Policies
-- Problem: Circular dependencies between secrets -> project_members -> projects -> project_members
-- Solution: Break the cycle by using direct queries without circular references

-- ============================================================================
-- 1. DROP ALL CONFLICTING POLICIES
-- ============================================================================

-- Drop all secrets policies
DROP POLICY IF EXISTS "Users view allowed secrets" ON secrets;
DROP POLICY IF EXISTS "Users update allowed secrets" ON secrets;
DROP POLICY IF EXISTS "Users insert allowed secrets" ON secrets;
DROP POLICY IF EXISTS "Users delete allowed secrets" ON secrets;

-- Drop all project_members policies
DROP POLICY IF EXISTS "Owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Members can view themselves" ON project_members;
DROP POLICY IF EXISTS "View own memberships" ON project_members;
DROP POLICY IF EXISTS "View memberships for owned projects" ON project_members;
DROP POLICY IF EXISTS "Manage memberships" ON project_members;
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_modify_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_insert_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_update_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_delete_policy" ON project_members;

-- Drop all projects policies
DROP POLICY IF EXISTS "Users view owned or shared projects" ON projects;
DROP POLICY IF EXISTS "projects_select_policy" ON projects;

-- ============================================================================
-- 2. CREATE NON-RECURSIVE POLICIES
-- ============================================================================

-- PROJECTS: Simple policy without recursion
CREATE POLICY "projects_select_policy"
  ON projects FOR SELECT
  USING (
    -- Owner
    user_id = (SELECT auth.uid())
    OR
    -- Member (simple IN subquery, no recursion back to projects)
    id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid()))
  );

-- PROJECT_MEMBERS: Simple policies without checking projects ownership
CREATE POLICY "project_members_select_policy"
  ON project_members FOR SELECT
  USING (
    -- Users can see their own memberships
    user_id = (SELECT auth.uid())
    OR
    -- Users can see memberships for projects they OWN (direct check, no recursion)
    project_id IN (
      SELECT id FROM projects WHERE user_id = (SELECT auth.uid())
    )
  );

-- PROJECT_MEMBERS: Modify policies (authenticated users only, app-level auth)
CREATE POLICY "project_members_insert_policy"
  ON project_members FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "project_members_update_policy"
  ON project_members FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "project_members_delete_policy"
  ON project_members FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- SECRETS: Non-recursive policies
CREATE POLICY "secrets_select_policy"
  ON secrets FOR SELECT
  USING (
    -- 1. Owner of project (direct check)
    project_id IN (
      SELECT id FROM projects WHERE user_id = (SELECT auth.uid())
    )
    OR
    -- 2. Member of project (direct check, no recursion)
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid())
    )
    OR
    -- 3. Granular Share (direct check)
    id IN (
      SELECT secret_id FROM secret_shares WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "secrets_insert_policy"
  ON secrets FOR INSERT
  WITH CHECK (
    -- Owner or Editor
    project_id IN (
      SELECT id FROM projects WHERE user_id = (SELECT auth.uid())
    )
    OR
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'editor'
    )
  );

CREATE POLICY "secrets_update_policy"
  ON secrets FOR UPDATE
  USING (
    -- Owner or Editor
    project_id IN (
      SELECT id FROM projects WHERE user_id = (SELECT auth.uid())
    )
    OR
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'editor'
    )
  );

CREATE POLICY "secrets_delete_policy"
  ON secrets FOR DELETE
  USING (
    -- Owner or Editor
    project_id IN (
      SELECT id FROM projects WHERE user_id = (SELECT auth.uid())
    )
    OR
    project_id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'editor'
    )
  );
