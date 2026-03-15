-- Allow project owners and project members to read audit logs
DROP POLICY IF EXISTS "Owner-Only SELECT Policy" ON public.audit_logs;
DROP POLICY IF EXISTS "Project Members SELECT Policy" ON public.audit_logs;

CREATE POLICY "Project Members SELECT Policy"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  public.user_owns_project(project_id, (select auth.uid()))
  OR public.user_is_project_member(project_id, (select auth.uid()))
);
