-- Fix RLS for projects to allow users to see projects with shared secrets
-- This allows the "Shared with Me" tab to display projects

-- Add policy for users to access projects that have secrets shared with them
CREATE POLICY "Users access projects with shared secrets"
  ON projects FOR SELECT
  USING (
    id IN (
      SELECT s.project_id
      FROM secrets s
      JOIN secret_shares ss ON ss.secret_id = s.id
      WHERE ss.user_id = (SELECT auth.uid())
    )
  );