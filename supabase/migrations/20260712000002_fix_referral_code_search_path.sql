-- Root cause of coach registration failing: set_coach_referral_code calls
-- gen_random_bytes() unqualified. That function lives in the `extensions`
-- schema, which is on the search_path for API roles but NOT for
-- supabase_auth_admin (search_path = auth) — the role that runs
-- handle_new_user during signup. So the coaches insert failed only inside
-- the auth trigger, killing every coach signup while player signups worked.
--
-- Use gen_random_uuid() from pg_catalog instead (always resolvable, no
-- extension dependency) — same 8-char uppercase hex code shape.

create or replace function public.set_coach_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

-- ─── Backfill: repair coach users whose public rows were rolled back ─────────

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
