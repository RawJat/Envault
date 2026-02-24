-- Native project environments for CLI scoping

-- 1) Project environments
create table if not exists project_environments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  slug text not null,
  name text not null,
  is_default boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  constraint project_environments_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  constraint unique_project_environment_slug unique (project_id, slug)
);

create unique index if not exists unique_project_default_environment
on project_environments(project_id)
where is_default = true;

create index if not exists idx_project_environments_project_id
on project_environments(project_id);

insert into project_environments (project_id, slug, name, is_default)
select p.id, env.slug, env.name, env.is_default
from projects p
cross join (
  values
    ('development', 'Development', true),
    ('preview', 'Preview', false),
    ('production', 'Production', false)
) as env(slug, name, is_default)
on conflict (project_id, slug) do update
set
  name = excluded.name,
  is_default = case
    when project_environments.slug = 'development' then true
    else project_environments.is_default
  end;

-- Ensure every project has a single default environment
update project_environments pe
set is_default = (pe.slug = 'development')
where pe.project_id in (
  select project_id
  from project_environments
  group by project_id
  having sum(case when is_default then 1 else 0 end) = 0
);

create or replace function public.create_default_project_environments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_environments (project_id, slug, name, is_default)
  values
    (new.id, 'development', 'Development', true),
    (new.id, 'preview', 'Preview', false),
    (new.id, 'production', 'Production', false)
  on conflict (project_id, slug) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_projects_create_default_environments on projects;
create trigger trg_projects_create_default_environments
after insert on projects
for each row
execute function public.create_default_project_environments();

-- 2) Secrets environment scoping
alter table secrets
add column if not exists environment_id uuid references project_environments(id) on delete cascade;

-- Backfill existing secrets into project's default environment
with defaults as (
  select distinct on (project_id) project_id, id as environment_id
  from project_environments
  where is_default = true
  order by project_id, created_at asc
)
update secrets s
set environment_id = d.environment_id
from defaults d
where s.project_id = d.project_id
  and s.environment_id is null;

create or replace function public.assign_default_secret_environment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.environment_id is null then
    select pe.id into new.environment_id
    from public.project_environments pe
    where pe.project_id = new.project_id
      and pe.is_default = true
    order by pe.created_at asc
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_secrets_assign_default_environment on secrets;
create trigger trg_secrets_assign_default_environment
before insert on secrets
for each row
execute function public.assign_default_secret_environment();

alter table secrets
alter column environment_id set not null;

-- Replace old uniqueness (project_id, key) with environment-scoped uniqueness
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'secrets'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE '%(project_id, key)%'
  LOOP
    EXECUTE format('ALTER TABLE public.secrets DROP CONSTRAINT IF EXISTS %I', con.conname);
  END LOOP;
END $$;

alter table secrets
add constraint unique_secret_key_project_environment unique (project_id, environment_id, key);

create index if not exists idx_secrets_project_environment
on secrets(project_id, environment_id);
