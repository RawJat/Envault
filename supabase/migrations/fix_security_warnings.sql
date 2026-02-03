-- Fix Security Warnings from Supabase Linter
-- 1. Fix function_search_path_mutable for is_project_owner
-- 2. Fix function_search_path_mutable for get_user_id_by_email

-- Fix is_project_owner function with search_path
CREATE OR REPLACE FUNCTION is_project_owner(project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_id
    AND user_id = auth.uid()
  );
$$;

-- Fix get_user_id_by_email function with search_path
CREATE OR REPLACE FUNCTION get_user_id_by_email(email_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
declare
  target_id uuid;
begin
  select id into target_id
  from auth.users
  where email = email_input;
  
  return target_id;
end;
$$;

-- Note: The leaked password protection warning needs to be fixed in Supabase Dashboard
-- Go to: Authentication > Providers > Email > Password Protection
-- Enable "Leaked Password Protection" to check passwords against HaveIBeenPwned.org
