-- Optimize RLS Performance by wrapping auth.uid() in SELECT
-- This prevents re-evaluation of auth.uid() for each row

-- Drop existing policies
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_insert_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_update_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_delete_policy" ON project_members;
DROP POLICY IF EXISTS "secrets_select_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_insert_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_update_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_delete_policy" ON secrets;

-- PROJECTS: Optimized policy
CREATE POLICY "projects_select_policy"
  ON projects FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR
    public.is_project_member(id, (SELECT auth.uid()))
  );

-- PROJECT_MEMBERS: Optimized policies
CREATE POLICY "project_members_select_policy"
  ON project_members FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR
    public.is_project_owner(project_id, (SELECT auth.uid()))
  );

CREATE POLICY "project_members_insert_policy"
  ON project_members FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "project_members_update_policy"
  ON project_members FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "project_members_delete_policy"
  ON project_members FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- SECRETS: Optimized policies
CREATE POLICY "secrets_select_policy"
  ON secrets FOR SELECT
  USING (
    public.is_project_owner(project_id, (SELECT auth.uid()))
    OR
    public.is_project_member(project_id, (SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM secret_shares
      WHERE secret_shares.secret_id = secrets.id
      AND secret_shares.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "secrets_insert_policy"
  ON secrets FOR INSERT
  WITH CHECK (
    public.is_project_owner(project_id, (SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = secrets.project_id
      AND project_members.user_id = (SELECT auth.uid())
      AND project_members.role = 'editor'
    )
  );

CREATE POLICY "secrets_update_policy"
  ON secrets FOR UPDATE
  USING (
    public.is_project_owner(project_id, (SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = secrets.project_id
      AND project_members.user_id = (SELECT auth.uid())
      AND project_members.role = 'editor'
    )
  );

CREATE POLICY "secrets_delete_policy"
  ON secrets FOR DELETE
  USING (
    public.is_project_owner(project_id, (SELECT auth.uid()))
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = secrets.project_id
      AND project_members.user_id = (SELECT auth.uid())
      AND project_members.role = 'editor'
    )
  );
