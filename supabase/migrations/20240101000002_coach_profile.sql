-- 2.2 Coach Profile — new columns, slug generation, public view

-- New columns on coaches
alter table public.coaches
  add column if not exists specializations text[]    not null default array[]::text[],
  add column if not exists languages       text[]    not null default array[]::text[],
  add column if not exists court_access    text      not null default 'player_arranges',
  add column if not exists slug            text      unique;

alter table public.coaches
  drop constraint if exists coaches_court_access_check,
  add constraint coaches_court_access_check
  check (court_access in ('coach_has_access', 'player_arranges', 'coach_can_recommend'));

-- ─── Auto-slug trigger ────────────────────────────────────────────────────────
create or replace function public.generate_coach_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  final_slug text;
  counter   integer := 0;
begin
  -- Only auto-generate when slug is null (allow manual override)
  if new.slug is not null then
    return new;
  end if;

  -- Normalise full_name → kebab-case ASCII slug
  base_slug := lower(new.full_name);
  base_slug := regexp_replace(base_slug, '[àáâãäå]', 'a', 'gi');
  base_slug := regexp_replace(base_slug, '[èéêë]',   'e', 'gi');
  base_slug := regexp_replace(base_slug, '[ìíîï]',   'i', 'gi');
  base_slug := regexp_replace(base_slug, '[òóôõö]',  'o', 'gi');
  base_slug := regexp_replace(base_slug, '[ùúûü]',   'u', 'gi');
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);

  final_slug := base_slug;

  -- Append incrementing suffix until unique
  while exists (
    select 1 from public.coaches
    where slug = final_slug and id != new.id
  ) loop
    counter    := counter + 1;
    final_slug := base_slug || '-' || counter;
  end loop;

  new.slug := final_slug;
  return new;
end;
$$;

drop trigger if exists set_coach_slug on public.coaches;
create trigger set_coach_slug
  before insert on public.coaches
  for each row
  execute function public.generate_coach_slug();

-- Backfill slugs for any coaches already in the table
do $$
declare
  rec record;
  base_slug text;
  final_slug text;
  counter integer;
begin
  for rec in select id, full_name from public.coaches where slug is null loop
    counter := 0;
    base_slug := lower(rec.full_name);
    base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    final_slug := base_slug;

    while exists (
      select 1 from public.coaches
      where slug = final_slug and id != rec.id
    ) loop
      counter    := counter + 1;
      final_slug := base_slug || '-' || counter;
    end loop;

    update public.coaches set slug = final_slug where id = rec.id;
  end loop;
end;
$$;

-- ─── Public view with computed stats ─────────────────────────────────────────
-- Used by discovery page and public profile — avoids N+1 queries per coach.
drop view if exists public.coach_profiles_public;
create or replace view public.coach_profiles_public as
select
  c.id,
  c.full_name,
  c.bio,
  c.headline,
  c.hourly_rate_ngn,
  c.experience_years,
  c.primary_location,
  c.service_areas,
  c.skill_levels,
  c.specializations,
  c.languages,
  c.certifications,
  c.court_access,
  c.demo_video_url,
  c.profile_photo_url,
  c.slug,
  c.status,
  c.is_verified,
  c.created_at,
  -- Computed: average rating (null if no reviews yet)
  round(avg(r.rating)::numeric, 1)  as avg_rating,
  -- Computed: number of reviews
  count(distinct r.id)::integer     as review_count,
  -- Computed: completed sessions
  count(distinct b.id)::integer     as session_count
from public.coaches c
left join public.reviews  r on r.coach_id = c.id
left join public.bookings b on b.coach_id = c.id and b.status = 'completed'
group by c.id;

-- The view inherits the underlying table's RLS, but we need a select policy
-- to allow anon/authenticated reads of active coaches.
-- (The coaches table already has "Active coaches are public" policy.)
