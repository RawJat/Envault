-- Create project_members table
create table project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects on delete cascade not null,
  user_id uuid references auth.users not null,
  role text not null check (role in ('viewer', 'editor')),
  added_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint unique_project_member unique (project_id, user_id)
);

-- Create secret_shares table (Granular Sharing)
create table secret_shares (
  id uuid default gen_random_uuid() primary key,
  secret_id uuid references secrets on delete cascade not null,
  user_id uuid references auth.users not null,
  role text not null check (role in ('viewer')), -- Only viewer needed for now
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint unique_secret_share unique (secret_id, user_id)
);

-- Create access_requests table
create table access_requests (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects on delete cascade, 
  secret_id uuid references secrets on delete cascade,
  user_id uuid references auth.users not null, -- The user requesting access
  status text not null check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Ensure only one pending request per user per resource
  constraint unique_pending_project_request unique nulls not distinct (project_id, user_id),
  constraint unique_pending_secret_request unique nulls not distinct (secret_id, user_id),
  -- Ensure request is either for project OR secret, not both (for now)
  constraint check_resource_target check (
    (project_id is not null and secret_id is null) or 
    (project_id is null and secret_id is not null)
  )
);

-- Update secrets table
alter table secrets 
add column last_updated_by uuid references auth.users,
add column last_updated_at timestamp with time zone;

-- Create Indexes
create index idx_project_members_user on project_members(user_id);
create index idx_project_members_project on project_members(project_id);
create index idx_secret_shares_user on secret_shares(user_id);
create index idx_secret_shares_secret on secret_shares(secret_id);
create index idx_access_requests_user on access_requests(user_id);

-- Enable RLS
alter table project_members enable row level security;
alter table secret_shares enable row level security;
alter table access_requests enable row level security;

-- POLICIES --

-- 1. Project Members Policies
-- Owners can view/manage members of their projects
create policy "Owners can manage members"
  on project_members
  using (
    exists (
      select 1 from projects 
      where projects.id = project_members.project_id 
      and projects.user_id = auth.uid()
    )
  );

-- Members can view themselves
create policy "Members can view themselves"
  on project_members for select
  using (user_id = auth.uid());

-- 2. Secret Shares Policies
-- Owners/Editors can manage shares? (Editors might need permission logic in app layer, simplified here to Owners or Self)
create policy "Owners can manage secret shares"
  on secret_shares
  using (
    exists (
      select 1 from secrets
      join projects on projects.id = secrets.project_id
      where secrets.id = secret_shares.secret_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users view their own secret shares"
  on secret_shares for select
  using (user_id = auth.uid());

-- 3. Access Requests Policies
-- Users can see/create their own requests
create policy "Users manage own requests"
  on access_requests
  using (user_id = auth.uid());

-- Owners can view requests for their projects
create policy "Owners view project requests"
  on access_requests for select
  using (
    project_id in (
      select id from projects where user_id = auth.uid()
    )
  );
-- (And for secrets, owner of the project containing the secret)
create policy "Owners view secret requests"
  on access_requests for select
  using (
    secret_id in (
      select s.id from secrets s
      join projects p on p.id = s.project_id
      where p.user_id = auth.uid()
    )
  );

-- 4. UPDATE EXISTING POLICIES (Secrets & Projects)
-- We need to drop existing simple policies and replace with "Member Aware" policies
-- NOTE: We will handle dropping existing policies carefully or just create new ones that cover the gaps if possible.
-- Dropping by name is safer if we know names. From `create_table.sql`:
-- "Users can view their own projects", etc.

-- PROJECTS: Select
drop policy if exists "Users can view their own projects" on projects;
create policy "Users view owned or shared projects"
  on projects for select
  using (
    user_id = auth.uid() -- Owner
    or 
    exists ( -- Member
      select 1 from project_members 
      where project_members.project_id = projects.id 
      and project_members.user_id = auth.uid()
    )
  );

-- SECRETS: Select
drop policy if exists "Users can view their own secrets" on secrets;
create policy "Users view allowed secrets"
  on secrets for select
  using (
    -- 1. Owner of project
    exists (
        select 1 from projects 
        where projects.id = secrets.project_id 
        and projects.user_id = auth.uid()
    )
    or
    -- 2. Member of project
    exists (
        select 1 from project_members
        where project_members.project_id = secrets.project_id
        and project_members.user_id = auth.uid()
    )
    or
    -- 3. Granular Share
    exists (
        select 1 from secret_shares
        where secret_shares.secret_id = secrets.id
        and secret_shares.user_id = auth.uid()
    )
  );

-- SECRETS: Update/Delete/Insert
-- Handled STRICTLY in Application Layer? 
-- Or RLS: Update allowed if Owner OR Editor.
drop policy if exists "Users can update their own secrets" on secrets;
create policy "Users update allowed secrets"
  on secrets for update
  using (
    exists (
        select 1 from projects 
        where projects.id = secrets.project_id 
        and projects.user_id = auth.uid()
    )
    or
    exists (
        select 1 from project_members
        where project_members.project_id = secrets.project_id
        and project_members.user_id = auth.uid()
        and project_members.role = 'editor'
    )
  );
  
drop policy if exists "Users can insert their own secrets" on secrets;
create policy "Users insert allowed secrets"
  on secrets for insert
  with check (
    exists (
        select 1 from projects 
        where projects.id = secrets.project_id 
        and projects.user_id = auth.uid()
    )
    or
    exists (
        select 1 from project_members
        where project_members.project_id = secrets.project_id
        and project_members.user_id = auth.uid()
        and project_members.role = 'editor'
    )
  );
  
drop policy if exists "Users can delete their own secrets" on secrets;
create policy "Users delete allowed secrets"
  on secrets for delete
  using (
    exists (
        select 1 from projects 
        where projects.id = secrets.project_id 
        and projects.user_id = auth.uid()
    )
    or
    exists (
        select 1 from project_members
        where project_members.project_id = secrets.project_id
        and project_members.user_id = auth.uid()
        and project_members.role = 'editor'
    )
  );
