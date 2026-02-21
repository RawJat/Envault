alter table public.passkeys add column "name" text;
update public.passkeys set name = 'Initial Passkey' where name is null;
alter table public.passkeys alter column "name" set not null;
