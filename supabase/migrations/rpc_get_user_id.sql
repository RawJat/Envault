-- Create a function to look up user ID by email
-- security definer allows it to run with privileges of the creator (postgres/admin)
-- accessible only to service_role or specific roles if revoked.

create or replace function get_user_id_by_email(email_input text)
returns uuid
language plpgsql
security definer
as $$
declare
  target_id uuid;
begin
  select id into target_id
  from auth.users
  where email = email_input;
  
  return target_id;
end;
$$;

-- Revoke execute from public to prevent abuse (user enumeration)
revoke execute on function get_user_id_by_email from public;
revoke execute on function get_user_id_by_email from anon;
revoke execute on function get_user_id_by_email from authenticated;

-- Grant to service_role (which our Admin client uses)
grant execute on function get_user_id_by_email to service_role;
