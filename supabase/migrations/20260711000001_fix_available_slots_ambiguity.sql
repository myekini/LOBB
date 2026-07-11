-- Fix: get_coach_available_slots failed with `column reference "slot_starts_at" is ambiguous`.
-- The RETURNS TABLE out-params (slot_starts_at, slot_ends_at) collide with columns of the
-- same name in coach_availability_slot_blocks and slot_locks. Qualify every column in the
-- EXISTS subqueries so PL/pgSQL resolves them to the tables, not the out-params.

create or replace function public.get_coach_available_slots(
  p_coach_id   uuid,
  p_from_date  date default (now() at time zone 'Africa/Lagos')::date,
  p_to_date    date default ((now() at time zone 'Africa/Lagos') + interval '30 days')::date
)
returns table (slot_starts_at timestamptz, slot_ends_at timestamptz)
language plpgsql stable security definer as $$
declare
  v_slot_start timestamptz;
  v_slot_end   timestamptz;
  v_day        date;
  v_avail      record;
  v_hour       time;
begin
  v_day := p_from_date;
  while v_day <= p_to_date loop

    -- Skip the day if there is a full-day block
    if exists (
      select 1 from public.coach_availability_blocks b
      where b.coach_id = p_coach_id and b.blocked_date = v_day
    ) then
      v_day := v_day + 1;
      continue;
    end if;

    -- Iterate over recurring availability windows that match this day-of-week
    for v_avail in
      select ca.starts_at, ca.ends_at
      from public.coach_availability ca
      where ca.coach_id = p_coach_id
        and ca.is_active = true
        and ca.day_of_week = extract(dow from v_day)::smallint
    loop
      v_hour := v_avail.starts_at;
      while v_hour < v_avail.ends_at loop
        v_slot_start := (v_day::text || ' ' || v_hour::text)::timestamptz
                        at time zone 'Africa/Lagos';
        v_slot_end   := v_slot_start + interval '1 hour';

        -- Skip if slot end would exceed the availability window
        if (v_slot_end at time zone 'Africa/Lagos')::time > v_avail.ends_at then
          exit;
        end if;

        -- Skip if the slot is in the past
        if v_slot_start <= now() then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        -- Skip if a granular slot block covers this slot
        if exists (
          select 1 from public.coach_availability_slot_blocks sb
          where sb.coach_id = p_coach_id
            and sb.slot_starts_at <= v_slot_start
            and sb.slot_ends_at   >= v_slot_end
        ) then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        -- Skip if already booked (any non-cancelled status overlaps this slot)
        if exists (
          select 1 from public.bookings bk
          where bk.coach_id = p_coach_id
            and bk.status not in ('cancelled', 'cancelled_by_player', 'cancelled_by_coach', 'refunded')
            and bk.starts_at < v_slot_end
            and bk.ends_at   > v_slot_start
        ) then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        -- Skip if a live checkout lock holds this slot
        if exists (
          select 1 from public.slot_locks sl
          where sl.coach_id = p_coach_id
            and sl.slot_starts_at = v_slot_start
            and sl.expires_at > now()
        ) then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        slot_starts_at := v_slot_start;
        slot_ends_at   := v_slot_end;
        return next;

        v_hour := v_hour + interval '1 hour';
      end loop;
    end loop;

    v_day := v_day + 1;
  end loop;
end;
$$;
