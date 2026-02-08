-- Fix function_search_path_mutable linter warning for get_user_email_by_id
-- Original warning: Function `public.get_user_email_by_id` has a role mutable search_path

create or replace function get_user_email_by_id(user_id_input uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  user_email text;
begin
  select email into user_email
  from auth.users
  where id = user_id_input;

  return user_email;
end;
$$;
