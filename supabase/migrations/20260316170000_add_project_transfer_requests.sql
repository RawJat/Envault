-- Two-step project ownership transfer handshake.
-- Owners initiate, target users accept/reject, and acceptance executes atomically.

create table if not exists public.project_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  current_owner_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  initiated_by uuid not null references auth.users(id) on delete cascade,
  current_owner_action text not null default 'demote_to_editor'
    check (current_owner_action in ('demote_to_editor', 'remove_from_project')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'expired')),
  expires_at timestamptz not null default (timezone('utc'::text, now()) + interval '48 hours'),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  responded_at timestamptz,

  constraint project_transfer_requests_target_not_owner
    check (current_owner_id <> target_user_id)
);

-- Prevent overlapping pending transfers for the same project.
create unique index if not exists uq_project_transfer_pending_per_project
  on public.project_transfer_requests(project_id)
  where status = 'pending';

create index if not exists idx_project_transfer_target_status
  on public.project_transfer_requests(target_user_id, status, expires_at desc);

create index if not exists idx_project_transfer_project_status
  on public.project_transfer_requests(project_id, status, created_at desc);

create or replace function public.set_project_transfer_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

DROP TRIGGER IF EXISTS trg_project_transfer_updated_at ON public.project_transfer_requests;
create trigger trg_project_transfer_updated_at
before update on public.project_transfer_requests
for each row execute function public.set_project_transfer_updated_at();

alter table public.project_transfer_requests enable row level security;

-- Owner and target can view their own transfer records.
drop policy if exists "project_transfer_requests_select_policy" on public.project_transfer_requests;
create policy "project_transfer_requests_select_policy"
  on public.project_transfer_requests for select
  to authenticated
  using (
    initiated_by = (select auth.uid())
    or target_user_id = (select auth.uid())
    or public.user_owns_project(project_id, (select auth.uid()))
  );

-- Inserts are restricted to the current owner initiating for their project.
drop policy if exists "project_transfer_requests_insert_policy" on public.project_transfer_requests;
create policy "project_transfer_requests_insert_policy"
  on public.project_transfer_requests for insert
  to authenticated
  with check (
    initiated_by = (select auth.uid())
    and current_owner_id = (select auth.uid())
    and public.user_owns_project(project_id, (select auth.uid()))
  );

-- Updates/deletes are blocked for authenticated clients; server-side uses service role.

-- Transactional acceptance path.
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

  -- Lock request row.
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

  -- Lock project row.
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
  set user_id = v_request.target_user_id,
      last_updated_at = timezone('utc'::text, now())
  where id = p_project_id;

  -- Remove target from members table if present (owner should not be a member).
  delete from public.project_members
  where project_id = p_project_id
    and user_id = v_request.target_user_id;

  -- Demote or remove original owner.
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

  -- Transfer liability of all secrets (including legacy/orphaned ownership rows) to new owner.
  update public.secrets
  set user_id = v_request.target_user_id,
      last_updated_by = v_request.target_user_id,
      last_updated_by_user_id_snapshot = v_request.target_user_id,
      last_updated_at = timezone('utc'::text, now())
  where project_id = p_project_id;

  get diagnostics v_secret_count = row_count;

  -- Mark accepted for traceability, then remove pending record per business rule.
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

-- Expire stale pending transfers every 15 minutes.
create extension if not exists pg_cron;

do $$
begin
  perform cron.unschedule('project_transfer_expiration');
exception
  when others then
    null;
end $$;

select cron.schedule(
  'project_transfer_expiration',
  '*/15 * * * *',
  $$
    update public.project_transfer_requests
    set status = 'expired',
        responded_at = timezone('utc'::text, now())
    where status = 'pending'
      and expires_at <= timezone('utc'::text, now());
  $$
);
