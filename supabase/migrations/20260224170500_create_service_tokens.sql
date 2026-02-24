-- Create service_tokens table
create table if not exists public.service_tokens (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  name text not null,
  token_hash text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone,
  last_used_at timestamp with time zone,
  
  constraint unique_token_name_per_project unique (project_id, name)
);

-- Enable RLS
alter table public.service_tokens enable row level security;

-- Policies
create policy "Users can view service tokens for their projects"
  on public.service_tokens for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = service_tokens.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can insert service tokens for their projects"
  on public.service_tokens for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete service tokens for their projects"
  on public.service_tokens for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = service_tokens.project_id
      and projects.user_id = auth.uid()
    )
  );
