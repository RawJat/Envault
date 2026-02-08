-- Create a function to get user email by ID
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

-- Revoke execute from public to prevent abuse
revoke execute on function get_user_email_by_id from public;
revoke execute on function get_user_email_by_id from anon;
revoke execute on function get_user_email_by_id from authenticated;

-- Grant to service_role
grant execute on function get_user_email_by_id to service_role;