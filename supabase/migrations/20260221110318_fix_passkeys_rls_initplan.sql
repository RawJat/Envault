-- Re-create passkeys RLS policies to fix initplan performance warnings
-- By using (select auth.uid()) instead of auth.uid() directly, Postgres can cache the result

drop policy if exists "Users can view their own passkeys" on public.passkeys;
create policy "Users can view their own passkeys" on public.passkeys
    for select using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own passkeys" on public.passkeys;
create policy "Users can delete their own passkeys" on public.passkeys
    for delete using ((select auth.uid()) = user_id);
