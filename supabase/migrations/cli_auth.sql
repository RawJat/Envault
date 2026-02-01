
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

create policy "Users can view their own tokens"
on public.personal_access_tokens for select
using (auth.uid() = user_id);

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

-- No RLS needed for device sessions as they are accessed by server-side API mainly, 
-- but if we want client-side polling from CLI without auth, we might need public insert/select?
-- Actually, the CLI polls with `device_code`. The User enters `user_code` in browser (authed).
-- So the browser part needs RLS or Service Role. 
-- We will use Service Role for the API interactions to keep it simple and secure.
