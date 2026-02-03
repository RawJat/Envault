-- Optimize RLS Policy Performance
-- Fix auth.uid() re-evaluation by wrapping in subqueries
-- This addresses Supabase linter warning: auth_rls_initplan

-- ============================================================================
-- 1. SECRET_SHARES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Owners can manage secret shares" ON secret_shares;
CREATE POLICY "Owners can manage secret shares"
  ON secret_shares
  USING (
    EXISTS (
      SELECT 1 FROM secrets
      JOIN projects ON projects.id = secrets.project_id
      WHERE secrets.id = secret_shares.secret_id
      AND projects.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users view their own secret shares" ON secret_shares;
CREATE POLICY "Users view their own secret shares"
  ON secret_shares FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 2. ACCESS_REQUESTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users manage own requests" ON access_requests;
CREATE POLICY "Users manage own requests"
  ON access_requests
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Owners view project requests" ON access_requests;
CREATE POLICY "Owners view project requests"
  ON access_requests FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners view secret requests" ON access_requests;
CREATE POLICY "Owners view secret requests"
  ON access_requests FOR SELECT
  USING (
    secret_id IN (
      SELECT s.id FROM secrets s
      JOIN projects p ON p.id = s.project_id
      WHERE p.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 3. SECRETS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users view allowed secrets" ON secrets;
CREATE POLICY "Users view allowed secrets"
  ON secrets FOR SELECT
  USING (
    -- 1. Owner of project
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = secrets.project_id 
        AND projects.user_id = (SELECT auth.uid())
    )
    OR
    -- 2. Member of project
    EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = secrets.project_id
        AND project_members.user_id = (SELECT auth.uid())
    )
    OR
    -- 3. Granular Share
    EXISTS (
        SELECT 1 FROM secret_shares
        WHERE secret_shares.secret_id = secrets.id
        AND secret_shares.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users update allowed secrets" ON secrets;
CREATE POLICY "Users update allowed secrets"
  ON secrets FOR UPDATE
  USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = secrets.project_id 
        AND projects.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = secrets.project_id
        AND project_members.user_id = (SELECT auth.uid())
        AND project_members.role = 'editor'
    )
  );

DROP POLICY IF EXISTS "Users insert allowed secrets" ON secrets;
CREATE POLICY "Users insert allowed secrets"
  ON secrets FOR INSERT
  WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = secrets.project_id 
        AND projects.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = secrets.project_id
        AND project_members.user_id = (SELECT auth.uid())
        AND project_members.role = 'editor'
    )
  );

DROP POLICY IF EXISTS "Users delete allowed secrets" ON secrets;
CREATE POLICY "Users delete allowed secrets"
  ON secrets FOR DELETE
  USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = secrets.project_id 
        AND projects.user_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = secrets.project_id
        AND project_members.user_id = (SELECT auth.uid())
        AND project_members.role = 'editor'
    )
  );

-- ============================================================================
-- 4. PROJECT_MEMBERS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;
CREATE POLICY "project_members_select_policy"
  ON project_members FOR SELECT
  USING (
    -- Users can see their own memberships
    user_id = (SELECT auth.uid())
    OR
    -- Users can see memberships for projects they own
    public.user_owns_project(project_id, (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "project_members_modify_policy" ON project_members;
CREATE POLICY "project_members_modify_policy"
  ON project_members FOR ALL
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- 5. PROJECTS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "projects_select_policy" ON projects;
CREATE POLICY "projects_select_policy"
  ON projects FOR SELECT
  USING (
    -- Owner
    user_id = (SELECT auth.uid())
    OR
    -- Member (simple IN subquery)
    id IN (SELECT project_id FROM project_members WHERE user_id = (SELECT auth.uid()))
  );

-- ============================================================================
-- 6. PERSONAL_ACCESS_TOKENS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own tokens" ON personal_access_tokens;
CREATE POLICY "Users can view their own tokens"
  ON personal_access_tokens FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own tokens" ON personal_access_tokens;
CREATE POLICY "Users can delete their own tokens"
  ON personal_access_tokens FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 7. DEVICE_FLOW_SESSIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own device sessions" ON device_flow_sessions;
CREATE POLICY "Users can view their own device sessions"
  ON device_flow_sessions FOR SELECT
  USING ((SELECT auth.uid()) = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update their own device sessions" ON device_flow_sessions;
CREATE POLICY "Users can update their own device sessions"
  ON device_flow_sessions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);
