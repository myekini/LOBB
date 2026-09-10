-- The admin Players table renders a PersonCell (avatar + name) like the coaches
-- table, but admin_player_directory never emitted the player's photo, so every
-- row fell back to initials. Add profiles.avatar_url to the view.

drop view if exists public.admin_player_directory cascade;

create view public.admin_player_directory as
select
  p.id,
  p.full_name,
  p.email,
  p.phone_number,
  p.avatar_url,
  p.created_at,
  p.referred_by_coach_id,
  count(b.id)                                              as booking_count,
  count(b.id) filter (where b.status = 'completed')        as completed_count,
  coalesce(sum(b.total_amount_ngn) filter (where b.status = 'completed'), 0) as spend_ngn,
  max(b.starts_at)                                         as last_session_at
from public.profiles p
left join public.bookings b on b.player_id = p.id
where p.role = 'player'
group by p.id;

grant select on public.admin_player_directory to service_role;
