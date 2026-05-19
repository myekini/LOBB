-- Fix: infinite recursion in "Admins read all profiles" policy.
-- The policy subqueried public.profiles to check admin role, but it was a
-- policy ON public.profiles — triggering itself recursively.
-- All other admin policies also subqueried profiles, which then hit the same loop.
--
-- Solution: SECURITY DEFINER function reads profiles bypassing RLS,
-- so no policy is evaluated during the admin check.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── Rewrite admin policies to use is_admin() ────────────────────────────────

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins read all coaches" on public.coaches;
create policy "Admins read all coaches"
on public.coaches for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins manage coach status" on public.coaches;
create policy "Admins manage coach status"
on public.coaches for update
to authenticated
using (public.is_admin());

drop policy if exists "Admins read all bookings" on public.bookings;
create policy "Admins read all bookings"
on public.bookings for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins update bookings" on public.bookings;
create policy "Admins update bookings"
on public.bookings for update
to authenticated
using (public.is_admin());

drop policy if exists "Admins read all payments" on public.payments;
create policy "Admins read all payments"
on public.payments for select
to authenticated
using (public.is_admin());
