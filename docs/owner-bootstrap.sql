-- Run privately in your own Supabase SQL editor after signup + email verification.
-- Replace OWNER_AUTH_USER_UUID with the verified auth.users.id, never a guessed email.
-- This script does not auto-grant the store's public support address.
begin;
do $$begin
 if not exists(select 1 from auth.users where id='OWNER_AUTH_USER_UUID'::uuid and email_confirmed_at is not null) then raise exception 'The selected owner account must have a verified email';end if;
end$$;
insert into public.owner_roles(user_id) values('OWNER_AUTH_USER_UUID'::uuid) on conflict(user_id) do nothing;
commit;
-- Sign in, open Account > Security, and complete TOTP MFA before opening /admin.
