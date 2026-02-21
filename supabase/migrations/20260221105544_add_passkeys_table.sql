create table if not exists public.passkeys (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    credential_id text unique not null,
    public_key bytea not null,
    counter bigint not null default 0,
    transports text[] default array[]::text[],
    last_used_at timestamp with time zone default now(),
    created_at timestamp with time zone default now()
);

-- Set up RLS
alter table public.passkeys enable row level security;

-- Policies
create policy "Users can view their own passkeys" on public.passkeys
    for select using (auth.uid() = user_id);

create policy "Users can delete their own passkeys" on public.passkeys
    for delete using (auth.uid() = user_id);
