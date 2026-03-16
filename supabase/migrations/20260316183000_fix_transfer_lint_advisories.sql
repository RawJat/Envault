-- Address linter findings for ownership transfer objects.

-- 1) SECURITY: function_search_path_mutable
create or replace function public.set_project_transfer_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

-- 2) PERFORMANCE: unindexed foreign keys on project_transfer_requests
create index if not exists idx_project_transfer_current_owner_id
  on public.project_transfer_requests(current_owner_id);

create index if not exists idx_project_transfer_initiated_by
  on public.project_transfer_requests(initiated_by);
