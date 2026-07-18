-- Staging: just the pieces that didn't apply from the full bootstrap.
-- Paste into the staging SQL editor and Run.

-- ═══════════════════════════════════════════════════════════════════════════════
-- LOBB Marketplace — Functions & Triggers
-- All PL/pgSQL functions, triggers, and their grants in dependency order.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Updated-at trigger (used by most tables) ─────────────────────────────────
-- Defined here to avoid duplication; the schema migration already defines the
-- function inline, but we re-create it here idempotently as the canonical source.

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at trigger to every relevant table
do $$ declare t text; begin
  for t in select unnest(array[
    'profiles', 'coaches', 'players',
    'coach_availability', 'bookings', 'payments', 'reviews', 'disputes',
    'otp_verifications'
  ]) loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; '
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ─── is_admin ─────────────────────────────────────────────────────────────────
-- Security-definer: reads profiles bypassing RLS to prevent infinite recursion
-- when the RLS policy on profiles itself calls is_admin().

create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- ─── handle_new_user ──────────────────────────────────────────────────────────
-- Fires on auth.users INSERT. Creates the profiles row and a typed sub-row
-- (coaches or players) based on the raw_user_meta_data.role claim.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  user_role  public.user_role;
  user_name  text;
  user_phone text;
begin
  user_role  := coalesce(new.raw_user_meta_data->>'role', 'player')::public.user_role;
  user_name  := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  user_phone := new.phone;

  insert into public.profiles (id, phone_number, email, role, full_name)
  values (new.id, user_phone, new.email, user_role, user_name)
  on conflict (id) do nothing;

  if user_role = 'coach' then
    insert into public.coaches (id, full_name, status)
    values (new.id, user_name, 'draft')
    on conflict (id) do nothing;
  else
    insert into public.players (id, full_name)
    values (new.id, user_name)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── generate_coach_slug ──────────────────────────────────────────────────────
-- Derives a URL-safe slug from full_name. Appends a random suffix on collision.

create or replace function public.generate_coach_slug(coach_id uuid, coach_name text)
returns text language plpgsql as $$
declare
  base_slug text;
  candidate text;
  counter   int := 0;
begin
  base_slug := lower(
    regexp_replace(
      regexp_replace(trim(coach_name), '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
  base_slug := trim(both '-' from base_slug);

  if base_slug = '' then
    base_slug := 'coach';
  end if;

  candidate := base_slug;
  loop
    if not exists (
      select 1 from public.coaches where slug = candidate and id <> coach_id
    ) then
      return candidate;
    end if;
    counter   := counter + 1;
    candidate := base_slug || '-' || counter;
  end loop;
end;
$$;

create or replace function public.set_coach_slug()
returns trigger language plpgsql as $$
begin
  if new.slug is null and new.full_name is not null then
    new.slug := public.generate_coach_slug(new.id, new.full_name);
  end if;
  return new;
end;
$$;

drop trigger if exists set_coach_slug on public.coaches;
create trigger set_coach_slug
  before insert or update of full_name on public.coaches
  for each row execute function public.set_coach_slug();

-- ─── Referral code ────────────────────────────────────────────────────────────
-- Generates a short uppercase referral code on coach insert if none provided.

create or replace function public.set_coach_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := upper(substring(encode(gen_random_bytes(4), 'hex'), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists set_coach_referral_code on public.coaches;
create trigger set_coach_referral_code
  before insert on public.coaches
  for each row execute function public.set_coach_referral_code();

-- ─── Human-readable booking reference ────────────────────────────────────────
-- Pattern: LOBB-YYYYMMDD-XXXX (date component helps support staff locate it)

create or replace function public.generate_booking_ref()
returns text language plpgsql as $$
declare
  ref text;
begin
  loop
    ref := 'LOBB-' || to_char(now() at time zone 'Africa/Lagos', 'YYYYMMDD') || '-'
           || upper(substring(encode(gen_random_bytes(3), 'hex'), 1, 4));
    exit when not exists (select 1 from public.bookings where human_ref = ref);
  end loop;
  return ref;
end;
$$;

create or replace function public.set_booking_human_ref()
returns trigger language plpgsql as $$
begin
  if new.human_ref is null then
    new.human_ref := public.generate_booking_ref();
  end if;
  return new;
end;
$$;

drop trigger if exists set_booking_human_ref on public.bookings;
create trigger set_booking_human_ref
  before insert on public.bookings
  for each row execute function public.set_booking_human_ref();

-- ─── Booking alias column sync ───────────────────────────────────────────────
-- The schema has both original column names (total_amount_ngn, player_notes)
-- and spec-alignment aliases (gross_amount, player_note, platform_commission_ngn,
-- convenience_fee_ngn, coach_payout_ngn, location_note). This trigger ensures
-- the aliases stay in sync with the canonical columns on every write.
-- session_date/session_start_time/session_end_time are GENERATED ALWAYS — not touched here.

create or replace function public.sync_booking_spec_columns()
returns trigger language plpgsql as $$
begin
  -- Keep spec aliases in sync with canonical columns
  new.gross_amount            := new.total_amount_ngn;
  new.platform_commission_ngn := new.platform_fee_ngn;
  -- coach_payout_ngn: derive if not explicitly provided
  if new.coach_payout_ngn = 0 then
    new.coach_payout_ngn := new.total_amount_ngn - new.platform_fee_ngn;
  end if;
  -- player_note is alias for player_notes
  if new.player_note is null and new.player_notes is not null then
    new.player_note := new.player_notes;
  elsif new.player_notes is null and new.player_note is not null then
    new.player_notes := new.player_note;
  end if;
  -- location_note stays independent (optional human alias set by caller)
  return new;
end;
$$;

drop trigger if exists sync_booking_spec_columns on public.bookings;
create trigger sync_booking_spec_columns
  before insert or update on public.bookings
  for each row execute function public.sync_booking_spec_columns();

-- ─── Escrow release ───────────────────────────────────────────────────────────
-- Called by the admin payout trigger or edge function after verifying the
-- 24-hour cooling-off period has elapsed.

create or replace function public.release_escrow(p_booking_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.bookings
  set escrow_released_at = now()
  where id = p_booking_id
    and status = 'completed'
    and escrow_released_at is null;

  if not found then
    raise exception 'Booking % not eligible for escrow release', p_booking_id;
  end if;
end;
$$;

-- ─── OTP cleanup ─────────────────────────────────────────────────────────────
-- Called by pg_cron (or Supabase scheduled function) to purge stale OTP rows.
-- Drop first: prior version returned void; now returns integer (row count).

drop function if exists public.cleanup_expired_otps();
create or replace function public.cleanup_expired_otps()
returns integer language plpgsql security definer as $$
declare
  deleted_count integer;
begin
  delete from public.otp_verifications where expires_at < now() - interval '1 hour';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- ─── can_review_booking ──────────────────────────────────────────────────────
-- Returns true if the current user is the player on a completed booking and
-- has not yet submitted a review for it.

create or replace function public.can_review_booking(p_booking_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1
    from public.bookings b
    left join public.reviews r on r.booking_id = b.id
    where b.id = p_booking_id
      and b.player_id = auth.uid()
      and b.status = 'completed'
      and r.id is null
  )
$$;

-- ─── get_coach_available_slots ───────────────────────────────────────────────
-- Returns 1-hour timeslots available for booking across a 30-day window.
-- All logic runs in Africa/Lagos timezone but returns UTC timestamptz pairs.
--
-- Exclusions:
--   1. Slots that fall outside the coach's recurring weekly availability windows
--   2. Days blocked by coach_availability_blocks (full-day blocks)
--   3. Granular blocks in coach_availability_slot_blocks
--   4. Slots already covered by a confirmed/pending booking
--   5. Slots held by a non-expired slot_lock (checkout reservation)

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
  -- Walk each day in the window
  v_day := p_from_date;
  while v_day <= p_to_date loop

    -- Skip the day if there is a full-day block
    if exists (
      select 1 from public.coach_availability_blocks
      where coach_id = p_coach_id and blocked_date = v_day
    ) then
      v_day := v_day + 1;
      continue;
    end if;

    -- Iterate over recurring availability windows that match this day-of-week
    for v_avail in
      select starts_at, ends_at
      from public.coach_availability
      where coach_id = p_coach_id
        and is_active = true
        and day_of_week = extract(dow from v_day)::smallint
    loop
      -- Step through 1-hour slots within the window
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
          select 1 from public.coach_availability_slot_blocks
          where coach_id = p_coach_id
            and slot_starts_at <= v_slot_start
            and slot_ends_at   >= v_slot_end
        ) then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        -- Skip if already booked (any non-cancelled status overlaps this slot)
        if exists (
          select 1 from public.bookings
          where coach_id = p_coach_id
            and status not in ('cancelled', 'cancelled_by_player', 'cancelled_by_coach', 'refunded')
            and starts_at < v_slot_end
            and ends_at   > v_slot_start
        ) then
          v_hour := v_hour + interval '1 hour';
          continue;
        end if;

        -- Skip if a live checkout lock holds this slot
        if exists (
          select 1 from public.slot_locks
          where coach_id = p_coach_id
            and slot_starts_at = v_slot_start
            and expires_at > now()
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

-- ─── JWT custom access token hook ────────────────────────────────────────────
-- Embeds the user's role in JWT claims so middleware can gate routes without
-- a DB round-trip on every request.
--
-- IMPORTANT: After running this migration, go to:
--   Supabase Dashboard → Authentication → Hooks
--   and enable "Custom Access Token" pointing to this function.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer as $$
declare
  user_role  public.user_role;
  claims     jsonb;
begin
  select role into user_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role::text));
  else
    claims := jsonb_set(claims, '{user_role}', '"player"');
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grant execute to the supabase_auth_admin role (required for the hook)
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.get_coach_available_slots(uuid, date, date) to authenticated, anon;
grant execute on function public.can_review_booking(uuid) to authenticated;
grant execute on function public.cleanup_expired_otps() to service_role;
grant execute on function public.release_escrow(uuid) to service_role;

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

-- Fix dead payout pipeline: the release-escrow cron selects bookings with
-- status='confirmed' whose session ended 2+ hours ago, but release_escrow()
-- only accepted status='completed' — and nothing ever set 'completed'.
-- Every release raised "not eligible", so escrow was never released and coach
-- transfers (which require completed + escrow_released_at) never ran.
--
-- release_escrow now performs the transition itself: confirmed → completed
-- with escrow_released_at stamped, and stays idempotent-safe for bookings
-- already completed but not yet released.

create or replace function public.release_escrow(p_booking_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.bookings
  set status = 'completed',
      escrow_released_at = now()
  where id = p_booking_id
    and status in ('confirmed', 'completed')
    and escrow_released_at is null
    and ends_at <= now();

  if not found then
    raise exception 'Booking % not eligible for escrow release', p_booking_id;
  end if;
end;
$$;

-- DB cleanup: remove dead objects left over from earlier iterations.
--
-- 1. otp_verifications — the custom phone-OTP flow (Twilio era). Auth moved to
--    Supabase email OTP; zero code references remain. Table + its cleanup
--    function + service-role policy go together.
--
-- 2. coaches.paystack_subaccount_code — the old split-payment model,
--    superseded by recipient_code transfers + (future) DVA. No code reads it.
--
-- Deliberately KEPT:
--   disputes                        — parked-for-MVP feature, schema ready
--   coach_availability_slot_blocks  — read by get_available_slots() for
--                                     granular slot blocking
--   payouts                         — used by manual admin payout trigger and
--                                     coach earnings history

drop function if exists public.cleanup_expired_otps();
drop table if exists public.otp_verifications;

alter table public.coaches drop column if exists paystack_subaccount_code;
