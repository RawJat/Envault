-- Fix RLS Infinite Recursion
-- Create a helper function to check ownership without triggering RLS on projects table

CREATE OR REPLACE FUNCTION is_project_owner(project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id
    AND user_id = auth.uid()
  );
$$;

-- Update project_members policies to use the function
-- First, drop existing policy if it exists (or we can use create or replace logic if supported for policies, usually need drop)
DROP POLICY IF EXISTS "Users view memberships" ON project_members;

CREATE POLICY "Users view memberships"
ON project_members FOR SELECT
USING (
  user_id = auth.uid() -- View own memberships
  OR
  is_project_owner(project_id) -- Check if user is owner of the project (safe)
);
