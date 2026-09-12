import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Circle, Clock3, CreditCard, MapPin, TriangleAlert } from "lucide-react";
import { PlayerBottomNav, PlayerHeader } from "@/components/layout/player-nav";
import { SmallCoachCard } from "@/features/coaches/coach-cards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPlayerBookings, canLeaveReview } from "@/lib/dashboard-queries";
import { firstJoin, formatBookingDate, type DashboardBooking } from "@/lib/dashboard-client-types";
import type { CoachPublicProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

const VISIBLE_UPCOMING_STATUSES = new Set(["confirmed", "pending", "pending_payment"]);

function timeOfDayGreeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-NG", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date())
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function PlayerHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  // Each fetch fails independently — a dead recommended-coaches call should
  // never take down the booking card, and vice versa. Previously this ran
  // client-side with no .catch() at all: a failed request quietly rendered
  // "Nothing booked yet" instead of ever surfacing that something broke.
  const [profileResult, bookingsResult, coachesResult] = await Promise.allSettled([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    loadPlayerBookings(admin, user.id),
    admin
      .from("coach_profiles_public")
      .select("*")
      .eq("status", "active")
      .order("avg_rating", { ascending: false, nullsFirst: false })
      .limit(3),
  ]);

  const firstName =
    profileResult.status === "fulfilled" ? profileResult.value.data?.full_name?.split(" ")[0] || "Player" : "Player";

  const bookingsFailed = bookingsResult.status === "rejected" || Boolean((bookingsResult as PromiseFulfilledResult<{ error: unknown }>).value?.error);
  const bookings: DashboardBooking[] =
    bookingsResult.status === "fulfilled" ? ((bookingsResult.value.data as DashboardBooking[] | null) ?? []) : [];

  const now = Date.now();
  const upcoming = bookings.filter(
    (b) => new Date(b.starts_at).getTime() >= now && VISIBLE_UPCOMING_STATUSES.has(b.status)
  );
  const nextBooking = [...upcoming].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0] ?? null;
  const coach = firstJoin(nextBooking?.coaches);
  const needsPayment = nextBooking && ["pending", "pending_payment"].includes(nextBooking.status) && nextBooking.payments?.[0]?.status !== "paid";

  const reviewableBooking = bookings.find((b) => canLeaveReview(b)) ?? null;
  const reviewableCoach = firstJoin(reviewableBooking?.coaches);

  const coaches: CoachPublicProfile[] = coachesResult.status === "fulfilled" ? ((coachesResult.value.data as CoachPublicProfile[] | null) ?? []) : [];

  return (
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
      <PlayerHeader active="home" title="Home" eyebrow="Player" />
      <section className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:pt-7">

        {bookingsFailed ? (
          <div className="flex items-start gap-3 rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-error)]/40 bg-[var(--lobb-error)]/5 p-5">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[var(--lobb-error)]" />
            <div>
              <p className="font-medium text-[var(--lobb-text-primary)]">Could not load your bookings</p>
              <p className="mt-1 text-sm text-[var(--lobb-text-secondary)]">Everything else on this page is fine — just this part failed to load. Refresh to try again.</p>
            </div>
          </div>
        ) : nextBooking && needsPayment ? (
          // ── State: payment pending ──
          <section className="lobb-hero-card relative overflow-hidden border px-6 py-6 sm:px-8 sm:py-7">
            <div className="lobb-hero-eyebrow inline-flex items-center gap-2 rounded-[var(--lobb-radius-md)] border px-3 py-2">
              <Circle className="size-2 fill-[var(--lobb-clay)] text-[var(--lobb-clay)]" />
              <span className="text-[11px] font-medium uppercase tracking-[0.18em]">{timeOfDayGreeting()}, {firstName}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-white/85"><CreditCard className="size-4" /><p className="text-[11px] font-medium uppercase tracking-[0.16em]">Payment pending</p></div>
            <h1 className="mt-2 max-w-xl text-[26px] font-semibold leading-[1.1] tracking-tight text-balance sm:text-[34px]">Your session is waiting for payment.</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/70">Complete payment before your reserved slot expires — {formatBookingDate(nextBooking.starts_at)}.</p>
            <Link href={`/dashboard/bookings/${nextBooking.id}`} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-white px-6 text-sm font-medium text-[#0d0d0d] transition hover:bg-white/85">Complete payment<ArrowRight className="size-4" /></Link>
          </section>
        ) : nextBooking ? (
          // ── State: upcoming session ──
          <section className="lobb-hero-card relative overflow-hidden border px-6 py-6 sm:px-8 sm:py-7">
            <div className="lobb-hero-eyebrow inline-flex items-center gap-2 rounded-[var(--lobb-radius-md)] border px-3 py-2">
              <Circle className="size-2 fill-[var(--lobb-clay)] text-[var(--lobb-clay)]" />
              <span className="text-[11px] font-medium uppercase tracking-[0.18em]">{timeOfDayGreeting()}, {firstName}</span>
            </div>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--lobb-clay)]">Your next session</p>
                <h1 className="mt-1.5 text-[28px] font-semibold leading-[1.05] tracking-tight text-balance sm:text-[36px]">{formatBookingDate(nextBooking.starts_at)}</h1>
                <p className="mt-2.5 flex items-start gap-2 text-sm font-medium text-white/70"><MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" /><span className="break-words">{nextBooking.location || "Location pending"}</span></p>
              </div>
              <div className="flex items-center gap-3 rounded-[var(--lobb-radius-md)] border border-white/15 bg-white/[0.06] px-3 py-2.5">
                <div className="size-9 shrink-0 overflow-hidden rounded-full bg-white/10">{coach?.profile_photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
                )}</div>
                <p className="truncate text-sm font-medium text-white">{coach?.full_name ?? "Your coach"}</p>
              </div>
            </div>
            <div className="mt-6 flex gap-2 border-t border-white/10 pt-5">
              <Link href={`/dashboard/bookings/${nextBooking.id}`} className="flex h-11 items-center justify-center gap-2 rounded-[var(--lobb-radius-md)] bg-white px-5 text-sm font-medium text-[#0d0d0d] transition hover:bg-white/85">View booking<ArrowRight className="size-4" /></Link>
              <Link href="/dashboard" className="flex h-11 items-center justify-center rounded-[var(--lobb-radius-md)] border border-white/15 px-4 text-sm font-medium text-white/85 transition hover:border-white/40">All bookings</Link>
            </div>
          </section>
        ) : (
          // ── State: nothing booked — one CTA, not four ──
          <section className="lobb-hero-card relative overflow-hidden border px-6 py-6 sm:px-8 sm:py-7">
            <div className="lobb-hero-eyebrow inline-flex items-center gap-2 rounded-[var(--lobb-radius-md)] border px-3 py-2">
              <Circle className="size-2 fill-[var(--lobb-clay)] text-[var(--lobb-clay)]" />
              <span className="text-[11px] font-medium uppercase tracking-[0.18em]">{timeOfDayGreeting()}, {firstName}</span>
            </div>
            <CalendarDays className="mt-5 size-5 text-[var(--lobb-clay)]" />
            <h1 className="mt-3 max-w-lg text-[28px] font-semibold leading-[1.05] tracking-tight text-balance sm:text-[36px]">Ready for your next session?</h1>
            <p className="mt-2.5 max-w-md text-sm leading-6 text-white/70">Choose a verified coach and reserve a time that works for you.</p>
            <Link href="/coaches" className="mt-6 inline-flex h-11 items-center gap-2 rounded-[var(--lobb-radius-md)] bg-white px-5 text-sm font-medium text-[#0d0d0d] transition hover:bg-white/85">Browse coaches<ArrowRight className="size-4" /></Link>
          </section>
        )}

        {reviewableBooking && reviewableCoach && (
          <Link href={`/dashboard/review/${reviewableBooking.id}`} className="mt-4 flex items-center justify-between gap-4 rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] px-5 py-4">
            <div className="flex items-center gap-3"><Clock3 className="size-5 shrink-0 text-[var(--lobb-clay)]" /><div><p className="font-medium text-[var(--lobb-text-primary)]">How was your session with {reviewableCoach.full_name}?</p><p className="mt-0.5 text-sm text-[var(--lobb-text-secondary)]">A quick review helps other players choose.</p></div></div>
            <ArrowRight className="size-5 shrink-0 text-[var(--lobb-clay)]" />
          </Link>
        )}

        {coaches.length > 0 && <section className="mt-10"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Recommended coaches</h2><Link href="/coaches" className="text-sm font-medium text-[var(--lobb-clay)]">View all coaches</Link></div><div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">{coaches.map((item) => <SmallCoachCard key={item.id} coach={item} />)}</div></section>}
      </section>
      <PlayerBottomNav active="home" />
    </main>
  );
}
