
create table if not exists public.personal_access_tokens (
    id uuid not null default gen_random_uuid() primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    token_hash text not null, -- Store sha256 hash of the actual token
    last_used_at timestamptz,
    created_at timestamptz not null default now(),
    expires_at timestamptz,
    unique(user_id, name)
);

alter table public.personal_access_tokens enable row level security;

drop policy if exists "Users can view their own tokens" on public.personal_access_tokens;
create policy "Users can view their own tokens"
on public.personal_access_tokens for select
using (auth.uid() = user_id);

drop policy if exists "Users can delete their own tokens" on public.personal_access_tokens;
create policy "Users can delete their own tokens"
on public.personal_access_tokens for delete
using (auth.uid() = user_id);

-- Device Flow Sessions
create table if not exists public.device_flow_sessions (
    device_code text not null primary key,
    user_code text not null,
    user_id uuid references auth.users(id) on delete cascade,
    status text not null default 'pending', -- pending, approved, expired, denied
    ip_address text,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null
);

-- Index for polling by user_code and device_code
create index if not exists idx_device_sessions_user_code on public.device_flow_sessions(user_code);

-- Enable RLS on device_flow_sessions
alter table public.device_flow_sessions enable row level security;

-- RLS Policies for device_flow_sessions
-- Users should be able to view and update their own device flow sessions
-- The CLI polls with device_code (unauthenticated), but approval requires auth

-- Allow users to view their own device flow sessions
drop policy if exists "Users can view their own device sessions" on public.device_flow_sessions;
create policy "Users can view their own device sessions"
on public.device_flow_sessions for select
using (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to update their own device flow sessions (for approval/denial)
drop policy if exists "Users can update their own device sessions" on public.device_flow_sessions;
create policy "Users can update their own device sessions"
on public.device_flow_sessions for update
using (auth.uid() = user_id);

-- Allow unauthenticated insert for device flow initiation (CLI)
-- But validate that required fields are present to prevent abuse
drop policy if exists "Allow insert for device flow" on public.device_flow_sessions;
create policy "Allow insert for device flow"
on public.device_flow_sessions for insert
with check (
  device_code is not null 
  and user_code is not null 
  and status is not null
  and expires_at is not null
  and user_id is null  -- Must be null on insert, gets set during approval
);
