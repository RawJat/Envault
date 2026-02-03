-- Fix Secrets Policies to Avoid RLS Recursion
-- The issue: secrets policies are checking project_members directly with EXISTS,
-- which triggers RLS on project_members, causing infinite recursion

-- STEP 1: Create a new helper function to check if user is an editor
CREATE OR REPLACE FUNCTION public.is_project_editor(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id 
    AND user_id = p_user_id 
    AND role = 'editor'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_editor TO authenticated;

-- STEP 2: Drop and recreate secrets policies without direct project_members checks

DROP POLICY IF EXISTS "secrets_select_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_insert_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_update_policy" ON secrets;
DROP POLICY IF EXISTS "secrets_delete_policy" ON secrets;

-- SECRETS SELECT: Allow owners, members, and granular shares
CREATE POLICY "secrets_select_policy"
  ON secrets FOR SELECT
  USING (
    public.is_project_owner(project_id, auth.uid())
    OR
    public.is_project_member(project_id, auth.uid())
    OR
    id IN (
      SELECT secret_id FROM secret_shares 
      WHERE user_id = auth.uid()
    )
  );

-- SECRETS INSERT: Allow owners and editors
CREATE POLICY "secrets_insert_policy"
  ON secrets FOR INSERT
  WITH CHECK (
    public.is_project_owner(project_id, auth.uid())
    OR
    public.is_project_editor(project_id, auth.uid())
  );

-- SECRETS UPDATE: Allow owners and editors
CREATE POLICY "secrets_update_policy"
  ON secrets FOR UPDATE
  USING (
    public.is_project_owner(project_id, auth.uid())
    OR
    public.is_project_editor(project_id, auth.uid())
  );

-- SECRETS DELETE: Allow owners and editors
CREATE POLICY "secrets_delete_policy"
  ON secrets FOR DELETE
  USING (
    public.is_project_owner(project_id, auth.uid())
    OR
    public.is_project_editor(project_id, auth.uid())
  );
