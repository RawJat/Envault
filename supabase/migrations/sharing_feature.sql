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

-- SECURITY DEFINER FUNCTIONS --
-- These bypass RLS to prevent recursion loops

CREATE OR REPLACE FUNCTION public.user_owns_project(project_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_id AND projects.user_id = user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_project TO authenticated;

-- POLICIES --

-- 1. Project Members Policies
-- Consolidated SELECT: Users can see themselves OR Owners can see everyone in their project
drop policy if exists "Owners can manage members" on project_members;
drop policy if exists "Members can view themselves" on project_members;
drop policy if exists "project_members_owner_policy" on project_members;
drop policy if exists "project_members_self_policy" on project_members;
drop policy if exists "project_members_select_policy" on project_members;

create policy "project_members_select_policy"
  on project_members for select
  using (
    user_id = (select auth.uid())
    or
    public.user_owns_project(project_id, (select auth.uid()))
  );

-- Consolidated Modifications: Only Project Owners can manage memberships
drop policy if exists "project_members_insert_policy" on project_members;
create policy "project_members_insert_policy"
  on project_members for insert
  with check (public.user_owns_project(project_id, (select auth.uid())));

drop policy if exists "project_members_update_policy" on project_members;
create policy "project_members_update_policy"
  on project_members for update
  using (public.user_owns_project(project_id, (select auth.uid())));

drop policy if exists "project_members_delete_policy" on project_members;
create policy "project_members_delete_policy"
  on project_members for delete
  using (public.user_owns_project(project_id, (select auth.uid())));

-- 2. Secret Shares Policies
-- Consolidated SELECT: Users can see their own shares OR Project Owners can see all shares in their project
drop policy if exists "Owners can manage secret shares" on secret_shares;
drop policy if exists "Users view their own secret shares" on secret_shares;
drop policy if exists "secret_shares_owner_policy" on secret_shares;
drop policy if exists "secret_shares_self_policy" on secret_shares;
drop policy if exists "secret_shares_select_policy" on secret_shares;

create policy "secret_shares_select_policy"
  on secret_shares for select
  using (
    user_id = (select auth.uid())
    or
    exists (
      select 1 from secrets
      where secrets.id = secret_shares.secret_id
      and public.user_owns_project(secrets.project_id, (select auth.uid()))
    )
  );

-- Consolidated Modifications: Only Project Owners can manage secret shares
drop policy if exists "secret_shares_insert_policy" on secret_shares;
create policy "secret_shares_insert_policy"
  on secret_shares for insert
  with check (
    exists (
      select 1 from secrets
      where secrets.id = secret_shares.secret_id
      and public.user_owns_project(secrets.project_id, (select auth.uid()))
    )
  );

drop policy if exists "secret_shares_update_policy" on secret_shares;
create policy "secret_shares_update_policy"
  on secret_shares for update
  using (
    exists (
      select 1 from secrets
      where secrets.id = secret_shares.secret_id
      and public.user_owns_project(secrets.project_id, (select auth.uid()))
    )
  );

drop policy if exists "secret_shares_delete_policy" on secret_shares;
create policy "secret_shares_delete_policy"
  on secret_shares for delete
  using (
    exists (
      select 1 from secrets
      where secrets.id = secret_shares.secret_id
      and public.user_owns_project(secrets.project_id, (select auth.uid()))
    )
  );

-- 3. Access Requests Policies
-- Consolidated SELECT policy for access_requests
drop policy if exists "Users manage own requests" on access_requests;
drop policy if exists "Owners view project requests" on access_requests;
drop policy if exists "Owners view secret requests" on access_requests;
drop policy if exists "access_requests_select_policy" on access_requests;

create policy "access_requests_select_policy"
  on access_requests for select
  using (
    user_id = (select auth.uid())
    or
    public.user_owns_project(project_id, (select auth.uid()))
    or
    exists (
      select 1 from secrets s
      where s.id = access_requests.secret_id
      and public.user_owns_project(s.project_id, (select auth.uid()))
    )
  );

-- Separate policies for modification
drop policy if exists "access_requests_insert_policy" on access_requests;
create policy "access_requests_insert_policy"
  on access_requests for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "access_requests_update_policy" on access_requests;
create policy "access_requests_update_policy"
  on access_requests for update
  using (user_id = (select auth.uid()));

drop policy if exists "access_requests_delete_policy" on access_requests;
create policy "access_requests_delete_policy"
  on access_requests for delete
  using (user_id = (select auth.uid()));

-- 4. UPDATE EXISTING POLICIES (Secrets & Projects)
-- We need to drop existing simple policies and replace with "Member Aware" policies
-- NOTE: We will handle dropping existing policies carefully or just create new ones that cover the gaps if possible.
-- Dropping by name is safer if we know names. From `create_table.sql`:
-- "Users can view their own projects", etc.

-- PROJECTS: Select
drop policy if exists "Users can view their own projects" on projects;
drop policy if exists "Users view owned or shared projects" on projects;
drop policy if exists "projects_select_policy" on projects;
create policy "projects_select_policy"
  on projects for select
  using (
    user_id = (select auth.uid()) -- Owner
    or 
    id in ( -- Member (Simple IN to avoid recursion)
      select project_id from project_members 
      where user_id = (select auth.uid())
    )
  );

-- SECRETS: Select
drop policy if exists "Users can view their own secrets" on secrets;
drop policy if exists "Users view allowed secrets" on secrets;
create policy "secrets_select_policy"
  on secrets for select
  using (
    -- 1. Owner of project
    public.user_owns_project(project_id, (select auth.uid()))
    or
    -- 2. Member of project
    exists (
        select 1 from project_members
        where project_members.project_id = secrets.project_id
        and project_members.user_id = (select auth.uid())
    )
    or
    -- 3. Granular Share
    exists (
        select 1 from secret_shares
        where secret_shares.secret_id = secrets.id
        and secret_shares.user_id = (select auth.uid())
    )
  );

-- SECRETS: Update/Delete/Insert
drop policy if exists "Users can update their own secrets" on secrets;
drop policy if exists "Users update allowed secrets" on secrets;
create policy "secrets_update_policy"
  on secrets for update
  using (
    public.user_owns_project(project_id, (select auth.uid()))
    or
    exists (
        select 1 from project_members
        where project_members.project_id = secrets.project_id
        and project_members.user_id = (select auth.uid())
        and project_members.role = 'editor'
    )
  );
  
drop policy if exists "Users can insert their own secrets" on secrets;
drop policy if exists "Users insert allowed secrets" on secrets;
create policy "secrets_insert_policy"
  on secrets for insert
  with check (
    public.user_owns_project(project_id, (select auth.uid()))
    or
    exists (
        select 1 from project_members
        where project_members.project_id = secrets.project_id
        and project_members.user_id = (select auth.uid())
        and project_members.role = 'editor'
    )
  );
  
drop policy if exists "Users can delete their own secrets" on secrets;
drop policy if exists "Users delete allowed secrets" on secrets;
create policy "secrets_delete_policy"
  on secrets for delete
  using (
    public.user_owns_project(project_id, (select auth.uid()))
    or
    exists (
        select 1 from project_members
        where project_members.project_id = secrets.project_id
        and project_members.user_id = (select auth.uid())
        and project_members.role = 'editor'
    )
  );
