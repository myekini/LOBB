-- Repair Auth users that do not have the public rows required by the app.
-- Idempotent: safe to apply more than once.

insert into public.profiles (id, email, role, full_name)
select
  u.id,
  lower(u.email),
  case u.raw_user_meta_data->>'role'
    when 'coach' then 'coach'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'player'::public.user_role
  end,
  null
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

insert into public.coaches (id, full_name, status)
select
  p.id,
  coalesce(nullif(split_part(p.email, '@', 1), ''), 'Coach'),
  'draft'
from public.profiles p
left join public.coaches c on c.id = p.id
where p.role = 'coach'
  and c.id is null
on conflict (id) do nothing;

insert into public.players (id, full_name)
select
  p.id,
  coalesce(nullif(split_part(p.email, '@', 1), ''), 'Player')
from public.profiles p
left join public.players pl on pl.id = p.id
where p.role = 'player'
  and pl.id is null
on conflict (id) do nothing;
