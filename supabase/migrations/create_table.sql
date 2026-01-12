-- Create projects table
create table projects (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  name text not null
);
-- Create secrets table (renamed from previous, now linked to projects)
create table secrets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  project_id uuid references projects on delete cascade not null,
  key text not null,
  value text not null,
  is_secret boolean default true,
  
  constraint unique_secret_key_project unique (project_id, key)
);
-- Enable RLS on projects
alter table projects enable row level security;
create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);
create policy "Users can insert their own projects"
  on projects for insert
  with check (auth.uid() = user_id);
create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);
create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);
-- Enable RLS on secrets
alter table secrets enable row level security;
create policy "Users can view their own secrets"
  on secrets for select
  using (auth.uid() = user_id);
create policy "Users can insert their own secrets"
  on secrets for insert
  with check (auth.uid() = user_id);
create policy "Users can update their own secrets"
  on secrets for update
  using (auth.uid() = user_id);
create policy "Users can delete their own secrets"
  on secrets for delete
  using (auth.uid() = user_id);