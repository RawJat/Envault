-- Fix RLS Infinite Recursion - V3 with Security Definer Functions
-- This approach uses security definer functions to bypass RLS and break recursion

-- First, drop all existing problematic policies
DROP POLICY IF EXISTS "Owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Members can view themselves" ON project_members;
DROP POLICY IF EXISTS "Users view own memberships" ON project_members;
DROP POLICY IF EXISTS "Members view project members" ON project_members;
DROP POLICY IF EXISTS "Authenticated users manage members" ON project_members;
DROP POLICY IF EXISTS "Users view memberships" ON project_members;
DROP POLICY IF EXISTS "View own memberships" ON project_members;
DROP POLICY IF EXISTS "View memberships for owned projects" ON project_members;
DROP POLICY IF EXISTS "Manage memberships" ON project_members;

-- Create a security definer function to check project ownership
-- This bypasses RLS, preventing recursion
CREATE OR REPLACE FUNCTION public.user_owns_project(project_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND projects.user_id = user_id
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_owns_project TO authenticated;

-- Now create simple policies for project_members that don't cause recursion
CREATE POLICY "project_members_select_policy"
ON project_members FOR SELECT
USING (
  -- Users can see their own memberships
  user_id = auth.uid()
  OR
  -- Users can see memberships for projects they own (using security definer function)
  public.user_owns_project(project_id, auth.uid())
);

-- Allow insert/update/delete (authorization in server actions)
CREATE POLICY "project_members_modify_policy"
ON project_members FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure the projects policy is simple
DROP POLICY IF EXISTS "Users view owned or shared projects" ON projects;

CREATE POLICY "projects_select_policy"
ON projects FOR SELECT
USING (
  -- Owner
  user_id = auth.uid()
  OR
  -- Member (simple IN subquery)
  id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
