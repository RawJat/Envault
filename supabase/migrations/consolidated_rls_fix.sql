-- ==========================================
-- CONSOLIDATED RLS FIX (RECURSION-FREE & OPTIMIZED)
-- ==========================================

-- 1. DROP ALL OLD HELPER FUNCTIONS
DROP FUNCTION IF EXISTS public.is_project_member CASCADE;
DROP FUNCTION IF EXISTS public.is_project_owner CASCADE;
DROP FUNCTION IF EXISTS public.is_project_editor CASCADE;
DROP FUNCTION IF EXISTS public.user_owns_project CASCADE;
DROP FUNCTION IF EXISTS public.user_is_project_member CASCADE;
DROP FUNCTION IF EXISTS public.user_is_project_editor CASCADE;
DROP FUNCTION IF EXISTS public.user_has_granular_secret_share CASCADE;
DROP FUNCTION IF EXISTS public.user_can_manage_secret_shares CASCADE;
DROP FUNCTION IF EXISTS public.is_admin CASCADE;

-- 2. DROP ALL POTENTIAL COLLIDING POLICIES
DROP POLICY IF EXISTS "projects_select_policy" ON projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON projects;
DROP POLICY IF EXISTS "projects_update_policy" ON projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON projects;
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_insert_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_update_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_delete_policy" ON project_members;
DROP POLICY IF EXISTS "secrets_select_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_insert_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_update_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_delete_policy" ON secrets;
DROP POLICY IF EXISTS "secret_shares_select_policy" ON secret_shares;
DROP POLICY IF EXISTS "secret_shares_insert_policy" ON secret_shares;
DROP POLICY IF EXISTS "secret_shares_delete_policy" ON secret_shares;
DROP POLICY IF EXISTS "access_requests_select_policy" ON access_requests;
DROP POLICY IF EXISTS "access_requests_insert_policy" ON access_requests;
DROP POLICY IF EXISTS "access_requests_update_policy" ON access_requests;
DROP POLICY IF EXISTS "access_requests_delete_policy" ON access_requests;

-- 3. CREATE STANDARDIZED NON-RECURSIVE HELPERS (SECURITY DEFINER)

-- Check if user owns the project
CREATE OR REPLACE FUNCTION public.user_owns_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = p_user_id);
$$;

-- Check if user is a project member (any role)
CREATE OR REPLACE FUNCTION public.user_is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = p_user_id);
$$;

-- Check if user is a project editor
CREATE OR REPLACE FUNCTION public.user_is_project_editor(p_project_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p_project_id AND user_id = p_user_id AND role = 'editor');
$$;

-- Check if user has granular share access to a secret (BYPASSES RLS)
CREATE OR REPLACE FUNCTION public.user_has_granular_secret_share(p_secret_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.secret_shares WHERE secret_id = p_secret_id AND user_id = p_user_id);
$$;

-- Check if user can manage shares for a secret (must own project)
CREATE OR REPLACE FUNCTION public.user_can_manage_secret_shares(p_secret_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.secrets s
    JOIN public.projects p ON s.project_id = p.id
    WHERE s.id = p_secret_id AND p.user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_project TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_project_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_project_editor TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_granular_secret_share TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_secret_shares TO authenticated;


-- 4. IMPLEMENT CLEAN POLICIES WITH PERFORMANCE OPTIMIZATIONS (SELECT auth.uid())

-- PROJECTS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select_policy" ON projects FOR SELECT 
USING (user_id = (SELECT auth.uid()) OR public.user_is_project_member(id, (SELECT auth.uid())));

CREATE POLICY "projects_insert_policy" ON projects FOR INSERT 
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "projects_update_policy" ON projects FOR UPDATE 
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "projects_delete_policy" ON projects FOR DELETE 
USING (user_id = (SELECT auth.uid()));


-- SECRETS
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "secrets_select_policy" ON secrets FOR SELECT 
USING (
  public.user_owns_project(project_id, (SELECT auth.uid())) OR 
  public.user_is_project_member(project_id, (SELECT auth.uid())) OR
  public.user_has_granular_secret_share(id, (SELECT auth.uid()))
);

CREATE POLICY "secrets_insert_policy" ON secrets FOR INSERT 
WITH CHECK (
  public.user_owns_project(project_id, (SELECT auth.uid())) OR 
  public.user_is_project_editor(project_id, (SELECT auth.uid()))
);

CREATE POLICY "secrets_update_policy" ON secrets FOR UPDATE 
USING (
  public.user_owns_project(project_id, (SELECT auth.uid())) OR 
  public.user_is_project_editor(project_id, (SELECT auth.uid()))
);

CREATE POLICY "secrets_delete_policy" ON secrets FOR DELETE 
USING (
  public.user_owns_project(project_id, (SELECT auth.uid())) OR 
  public.user_is_project_editor(project_id, (SELECT auth.uid()))
);


-- PROJECT MEMBERS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_members_select_policy" ON project_members FOR SELECT 
USING (user_id = (SELECT auth.uid()) OR public.user_owns_project(project_id, (SELECT auth.uid())));

CREATE POLICY "project_members_insert_policy" ON project_members FOR INSERT 
WITH CHECK (public.user_owns_project(project_id, (SELECT auth.uid())));

CREATE POLICY "project_members_update_policy" ON project_members FOR UPDATE 
USING (public.user_owns_project(project_id, (SELECT auth.uid())));

CREATE POLICY "project_members_delete_policy" ON project_members FOR DELETE 
USING (public.user_owns_project(project_id, (SELECT auth.uid())));


-- SECRET SHARES
ALTER TABLE secret_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "secret_shares_select_policy" ON secret_shares FOR SELECT 
USING (
  user_id = (SELECT auth.uid()) OR 
  public.user_can_manage_secret_shares(secret_id, (SELECT auth.uid()))
);

CREATE POLICY "secret_shares_insert_policy" ON secret_shares FOR INSERT 
WITH CHECK (public.user_can_manage_secret_shares(secret_id, (SELECT auth.uid())));

CREATE POLICY "secret_shares_delete_policy" ON secret_shares FOR DELETE 
USING (public.user_can_manage_secret_shares(secret_id, (SELECT auth.uid())));


-- ACCESS REQUESTS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "access_requests_select_policy" ON access_requests FOR SELECT 
USING (
  user_id = (SELECT auth.uid()) OR 
  public.user_owns_project(project_id, (SELECT auth.uid())) OR
  EXISTS (
    SELECT 1 FROM public.secrets s
    WHERE s.id = access_requests.secret_id
    AND public.user_owns_project(s.project_id, (SELECT auth.uid()))
  )
);

CREATE POLICY "access_requests_insert_policy" ON access_requests FOR INSERT 
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "access_requests_update_policy" ON access_requests FOR UPDATE 
USING (
  user_id = (SELECT auth.uid()) OR 
  public.user_owns_project(project_id, (SELECT auth.uid())) OR
  EXISTS (
    SELECT 1 FROM public.secrets s
    WHERE s.id = access_requests.secret_id
    AND public.user_owns_project(s.project_id, (SELECT auth.uid()))
  )
);

CREATE POLICY "access_requests_delete_policy" ON access_requests FOR DELETE 
USING (
  user_id = (SELECT auth.uid()) OR 
  public.user_owns_project(project_id, (SELECT auth.uid())) OR
  EXISTS (
    SELECT 1 FROM public.secrets s
    WHERE s.id = access_requests.secret_id
    AND public.user_owns_project(s.project_id, (SELECT auth.uid()))
  )
);
