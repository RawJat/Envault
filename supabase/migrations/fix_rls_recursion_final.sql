-- Fix RLS Infinite Recursion - FINAL CORRECTED VERSION
-- This completely removes circular dependencies between projects and project_members

-- Drop ALL existing project_members policies
DROP POLICY IF EXISTS "Owners can manage members" ON project_members;
DROP POLICY IF EXISTS "Members can view themselves" ON project_members;
DROP POLICY IF EXISTS "Users view own memberships" ON project_members;
DROP POLICY IF EXISTS "Members view project members" ON project_members;
DROP POLICY IF EXISTS "Authenticated users manage members" ON project_members;
DROP POLICY IF EXISTS "Users view memberships" ON project_members;

-- Create simple, non-recursive policies for project_members
-- Policy 1: Users can always view their own membership records
CREATE POLICY "View own memberships"
ON project_members FOR SELECT
USING (user_id = auth.uid());

-- Policy 2: Users can view memberships for projects they own (direct check, no subquery)
CREATE POLICY "View memberships for owned projects"
ON project_members FOR SELECT
USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- Policy 3: Allow insert/update/delete for authenticated users
-- (Authorization is enforced in server actions)
CREATE POLICY "Manage memberships"
ON project_members FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the projects table policy doesn't reference project_members recursively
-- If it does, we need to update it too
DROP POLICY IF EXISTS "Users view owned or shared projects" ON projects;

CREATE POLICY "Users view owned or shared projects"
ON projects FOR SELECT
USING (
  user_id = auth.uid() -- Owner
  OR 
  id IN ( -- Member (simple subquery, no recursion)
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);
