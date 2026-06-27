-- ─── set_coach_availability ───────────────────────────────────────────────────
-- Atomically replaces a coach's weekly slots and blocked dates in one transaction.
-- Called from /api/coaches/me/availability PUT via supabase.rpc().
-- Security: verifies p_coach_id matches the calling user's auth.uid().

create or replace function public.set_coach_availability(
  p_coach_id   uuid,
  p_slots       jsonb,  -- [{day_of_week, starts_at, ends_at}]
  p_blocked_dates text[] -- ['YYYY-MM-DD', ...]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Caller must own the coach record
  if p_coach_id != auth.uid() and not public.is_admin() then
    raise exception 'forbidden' using errcode = 'P0401';
  end if;

  -- Replace weekly slots
  delete from public.coach_availability where coach_id = p_coach_id;

  if jsonb_array_length(p_slots) > 0 then
    insert into public.coach_availability (coach_id, is_active, day_of_week, starts_at, ends_at)
    select
      p_coach_id,
      true,
      (slot->>'day_of_week')::int,
      (slot->>'starts_at')::time,
      (slot->>'ends_at')::time
    from jsonb_array_elements(p_slots) as slot;
  end if;

  -- Replace blocked dates
  delete from public.coach_availability_blocks where coach_id = p_coach_id;

  if array_length(p_blocked_dates, 1) > 0 then
    insert into public.coach_availability_blocks (coach_id, blocked_date)
    select p_coach_id, d::date
    from unnest(p_blocked_dates) as d;
  end if;
end;
$$;

grant execute on function public.set_coach_availability(uuid, jsonb, text[]) to authenticated;
