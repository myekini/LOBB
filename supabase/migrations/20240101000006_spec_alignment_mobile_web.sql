-- 3.3 / 4.1 / 4.2 spec alignment
-- Supabase Auth remains the identity source. public.profiles maps to the spec's users table,
-- and public.coaches maps to the spec's coach_profiles table.

alter type public.coach_status add value if not exists 'suspended';

alter table public.profiles
  add column if not exists email text unique,
  add column if not exists is_active boolean not null default true;

alter table public.coaches
  add column if not exists bank_account_number text,
  add column if not exists bank_code text,
  add column if not exists bank_name text;

alter table public.coaches
  drop constraint if exists coaches_bank_account_number_length_check,
  add constraint coaches_bank_account_number_length_check
  check (bank_account_number is null or char_length(bank_account_number) <= 20);

alter table public.coaches
  drop constraint if exists coaches_bank_code_length_check,
  add constraint coaches_bank_code_length_check
  check (bank_code is null or char_length(bank_code) <= 10);

alter table public.coaches
  drop constraint if exists coaches_bank_name_length_check,
  add constraint coaches_bank_name_length_check
  check (bank_name is null or char_length(bank_name) <= 100);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone_number, email, full_name, is_active)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    true
  )
  on conflict (id) do update set
    phone_number = excluded.phone_number,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop view if exists public.users;
create or replace view public.users as
select
  p.id,
  p.phone_number as phone,
  p.email,
  p.full_name,
  p.role,
  p.avatar_url,
  p.is_active,
  p.created_at,
  p.updated_at
from public.profiles p;

drop view if exists public.coach_profiles;
create or replace view public.coach_profiles as
select
  c.id,
  c.id as user_id,
  c.slug,
  c.headline,
  c.bio,
  c.hourly_rate_ngn as hourly_rate,
  array_remove(array_prepend(c.primary_location, c.service_areas), null) as locations,
  c.specializations,
  c.languages,
  array_to_string(c.certifications, ', ') as certifications,
  case c.court_access
    when 'coach_has_access' then 'has_courts'
    when 'player_arranges' then 'player_arranges'
    when 'coach_can_recommend' then 'can_recommend'
    else c.court_access
  end as court_access,
  c.demo_video_url as video_url,
  c.paystack_subaccount_code as paystack_subaccount,
  c.bank_account_number,
  c.bank_code,
  c.bank_name,
  case c.status
    when 'paused' then 'suspended'
    else c.status::text
  end as status,
  c.is_verified as verified,
  coalesce(round(avg(r.rating)::numeric, 2), 0.00) as rating_avg,
  count(distinct r.id)::integer as rating_count,
  count(distinct b.id)::integer as sessions_completed,
  c.created_at,
  c.updated_at
from public.coaches c
left join public.reviews r
  on r.coach_id = c.id
  and (r.removed_at is null or r.removed_at is null)
left join public.bookings b
  on b.coach_id = c.id
  and b.status = 'completed'
group by c.id;
