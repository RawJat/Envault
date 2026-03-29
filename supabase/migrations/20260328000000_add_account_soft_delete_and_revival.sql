-- Account soft-delete foundation + DB-driven revival.

alter table public.profiles
  add column if not exists deletion_scheduled_at timestamptz;

alter table public.profiles
  add column if not exists last_revived_at timestamptz;

comment on column public.profiles.deletion_scheduled_at is
  'UTC timestamp when account deletion was requested. Purged after 7 days if not revived.';

comment on column public.profiles.last_revived_at is
  'UTC timestamp when a scheduled-for-deletion account was revived by signing in.';

create index if not exists idx_profiles_deletion_scheduled_at
  on public.profiles (deletion_scheduled_at)
  where deletion_scheduled_at is not null;

-- Ensure the auth.users -> profiles relationship cascades on auth deletion.
do $$
declare
  v_constraint_name text;
  v_is_cascade boolean := false;
begin
  select
    con.conname,
    con.confdeltype = 'c'
  into
    v_constraint_name,
    v_is_cascade
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
  join pg_class parent_rel on parent_rel.oid = con.confrelid
  join pg_namespace parent_ns on parent_ns.oid = parent_rel.relnamespace
  where con.contype = 'f'
    and rel_ns.nspname = 'public'
    and rel.relname = 'profiles'
    and parent_ns.nspname = 'auth'
    and parent_rel.relname = 'users'
  limit 1;

  if v_constraint_name is null then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id)
      references auth.users(id)
      on delete cascade;
  elsif not v_is_cascade then
    execute format(
      'alter table public.profiles drop constraint %I',
      v_constraint_name
    );
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id)
      references auth.users(id)
      on delete cascade;
  end if;
end $$;

create or replace function public.handle_account_revival_on_sign_in()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.last_sign_in_at is not distinct from old.last_sign_in_at then
    return new;
  end if;

  update public.profiles
  set
    deletion_scheduled_at = null,
    last_revived_at = timezone('utc'::text, now())
  where id = new.id
    and deletion_scheduled_at is not null;

  return new;
end;
$$;

drop trigger if exists on_auth_user_sign_in_revival on auth.users;
create trigger on_auth_user_sign_in_revival
  after update of last_sign_in_at on auth.users
  for each row execute function public.handle_account_revival_on_sign_in();

create or replace function public.schedule_account_deletion(p_user_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scheduled_at timestamptz;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  update public.profiles
  set deletion_scheduled_at = timezone('utc'::text, now())
  where id = p_user_id
  returning deletion_scheduled_at into v_scheduled_at;

  if v_scheduled_at is null then
    raise exception 'profile_not_found';
  end if;

  return v_scheduled_at;
end;
$$;

revoke all on function public.schedule_account_deletion(uuid) from public;
revoke all on function public.schedule_account_deletion(uuid) from anon;
revoke all on function public.schedule_account_deletion(uuid) from authenticated;
grant execute on function public.schedule_account_deletion(uuid) to service_role;
