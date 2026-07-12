-- Fix coach registration failing with "Database error saving new user".
-- The deployed handle_new_user's coach branch errors (signInWithOtp 500s for
-- role=coach, player works), so redefine it from source. Two changes vs the
-- old repo version:
--
-- 1. profiles.full_name is only set when the signup provides one — NOT derived
--    from the email prefix. The verify page and middleware use a null
--    full_name to mean "onboarding incomplete"; deriving a name made every
--    new player skip /auth/setup/player and land on /home as "taiwo483".
--    (coaches/players sub-rows keep a derived placeholder for NOT NULL safety.)
--
-- 2. The whole body is wrapped in an exception handler: a failure creating
--    public rows must never block the auth user itself — the repair backfill
--    below (and 20260628000001) recovers missing rows.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  user_role     public.user_role;
  provided_name text;
  fallback_name text;
  user_phone    text;
begin
  user_role     := coalesce(new.raw_user_meta_data->>'role', 'player')::public.user_role;
  provided_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  fallback_name := coalesce(provided_name, nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Member');
  user_phone    := new.phone;

  insert into public.profiles (id, phone_number, email, role, full_name)
  values (new.id, user_phone, new.email, user_role, provided_name)
  on conflict (id) do nothing;

  if user_role = 'coach' then
    insert into public.coaches (id, full_name, status)
    values (new.id, fallback_name, 'draft')
    on conflict (id) do nothing;
  elsif user_role = 'player' then
    insert into public.players (id, full_name)
    values (new.id, fallback_name)
    on conflict (id) do nothing;
  end if;

  return new;
exception when others then
  -- Never block auth signup on public-row creation; backfill repairs later.
  raise warning 'handle_new_user failed for % (role %): %', new.id, user_role, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Backfill: repair users created while the trigger was broken ──────────────

insert into public.profiles (id, email, role, full_name)
select
  u.id,
  lower(u.email),
  case u.raw_user_meta_data->>'role'
    when 'coach' then 'coach'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'player'::public.user_role
  end,
  nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

insert into public.coaches (id, full_name, status)
select
  p.id,
  coalesce(p.full_name, nullif(split_part(p.email, '@', 1), ''), 'Coach'),
  'draft'
from public.profiles p
left join public.coaches c on c.id = p.id
where p.role = 'coach'
  and c.id is null
on conflict (id) do nothing;

insert into public.players (id, full_name)
select
  p.id,
  coalesce(p.full_name, nullif(split_part(p.email, '@', 1), ''), 'Player')
from public.profiles p
left join public.players pl on pl.id = p.id
where p.role = 'player'
  and pl.id is null
on conflict (id) do nothing;

-- Users whose full_name is clearly the derived email prefix (old trigger
-- behaviour) never chose a name — null it so they get routed through
-- onboarding and pick a real one.
update public.profiles
set full_name = null
where full_name is not null
  and full_name = split_part(coalesce(email, ''), '@', 1);
