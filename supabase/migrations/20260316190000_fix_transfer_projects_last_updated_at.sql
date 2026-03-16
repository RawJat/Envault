-- Fix compatibility: some deployments do not have projects.last_updated_at.
-- Recreate transfer function without referencing that column.

create or replace function public.execute_project_transfer(
  p_transfer_request_id uuid,
  p_project_id uuid,
  p_actor_user_id uuid
)
returns table (
  previous_owner_id uuid,
  new_owner_id uuid,
  owner_action text,
  transferred_secret_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.project_transfer_requests%rowtype;
  v_project public.projects%rowtype;
  v_secret_count bigint := 0;
begin
  if p_transfer_request_id is null or p_project_id is null or p_actor_user_id is null then
    raise exception 'invalid_transfer_args';
  end if;

  select *
  into v_request
  from public.project_transfer_requests
  where id = p_transfer_request_id
    and project_id = p_project_id
  for update;

  if not found then
    raise exception 'transfer_request_not_found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'transfer_request_not_pending';
  end if;

  if v_request.expires_at <= timezone('utc'::text, now()) then
    update public.project_transfer_requests
    set status = 'expired',
        responded_at = timezone('utc'::text, now())
    where id = v_request.id;

    raise exception 'transfer_request_expired';
  end if;

  if v_request.target_user_id <> p_actor_user_id then
    raise exception 'transfer_request_target_mismatch';
  end if;

  select *
  into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'project_not_found';
  end if;

  if v_project.user_id <> v_request.current_owner_id then
    raise exception 'project_owner_changed';
  end if;

  -- Promote target to owner.
  update public.projects
  set user_id = v_request.target_user_id
  where id = p_project_id;

  delete from public.project_members
  where project_id = p_project_id
    and user_id = v_request.target_user_id;

  if v_request.current_owner_action = 'remove_from_project' then
    delete from public.project_members
    where project_id = p_project_id
      and user_id = v_request.current_owner_id;
  else
    insert into public.project_members (project_id, user_id, role, added_by, allowed_environments)
    values (p_project_id, v_request.current_owner_id, 'editor', v_request.target_user_id, null)
    on conflict (project_id, user_id)
    do update
      set role = 'editor',
          added_by = excluded.added_by,
          allowed_environments = null;
  end if;

  update public.secrets
  set user_id = v_request.target_user_id,
      last_updated_by = v_request.target_user_id,
      last_updated_by_user_id_snapshot = v_request.target_user_id,
      last_updated_at = timezone('utc'::text, now())
  where project_id = p_project_id;

  get diagnostics v_secret_count = row_count;

  update public.project_transfer_requests
  set status = 'accepted',
      responded_at = timezone('utc'::text, now())
  where id = v_request.id;

  delete from public.project_transfer_requests
  where id = v_request.id;

  return query
  select
    v_request.current_owner_id,
    v_request.target_user_id,
    v_request.current_owner_action,
    v_secret_count;
end;
$$;

revoke all on function public.execute_project_transfer(uuid, uuid, uuid) from public;
revoke all on function public.execute_project_transfer(uuid, uuid, uuid) from anon;
revoke all on function public.execute_project_transfer(uuid, uuid, uuid) from authenticated;
grant execute on function public.execute_project_transfer(uuid, uuid, uuid) to service_role;
