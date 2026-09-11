"use client";

import { Button as LobbButton } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Clock3, Gift, Landmark, Mail, MapPin, Share2, User, XCircle } from "lucide-react";
import { CoachBottomNav } from "@/components/layout/coach-nav";
import { SecurityNudge } from "@/features/auth/security-nudge";
import { firstJoin, formatBookingDate, money, type DashboardBooking } from "@/lib/dashboard-client-types";
import { showLobbToast } from "@/providers/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";
import { CoachFlowHeader } from "@/features/booking/coach-flow-header";
import { CoachSurface } from "@/components/common/coach-surface";

type CoachDashboardPayload = {
  upcoming_bookings: DashboardBooking[];
  recent_bookings: DashboardBooking[];
  earnings: {
    net_this_week_ngn: number;
    net_this_month_ngn: number;
    net_all_time_ngn: number;
    pending_payout_ngn: number;
  } | null;
  profile_completion: { percent: number };
  coach?: {
    full_name?: string | null;
    headline?: string | null;
    profile_photo_url?: string | null;
    primary_location?: string | null;
    status?: string | null;
    rejection_reason?: string | null;
    needs_direct_contact?: boolean | null;
    paystack_recipient_code?: string | null;
    dva_account_number?: string | null;
  } | null;
  availability_slots_count?: number;
  reviews: Array<{ id: string; rating: number; comment: string | null; player_first_name: string; created_at: string }>;
  referral: {
    referral_code: string | null;
    signups_count: number;
    booked_count: number;
    total_earned_ngn: number;
  } | null;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function CoachDashboardPage() {
  const [data, setData] = useState<CoachDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchWithCache<CoachDashboardPayload>("lobb.dashboard.coach", "/api/dashboard/coach")
      .then((payload) => {
        if (alive) setData(payload);
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load dashboard" });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const upcoming = data?.upcoming_bookings ?? [];
  const nextSession = upcoming[0];
  const completion = data?.profile_completion?.percent ?? 0;
  const coachStatus = data?.coach?.status ?? "draft";
  const rejectionReason = data?.coach?.rejection_reason ?? null;
  const needsDirectContact = data?.coach?.needs_direct_contact ?? false;
  const needsAvailability = coachStatus === "active" && !loading && (data?.availability_slots_count ?? 0) === 0;
  const needsPayoutSetup = coachStatus === "active" && !loading && !data?.coach?.paystack_recipient_code && !data?.coach?.dva_account_number;
  const completionCard =
    coachStatus === "pending_review"
      ? {
          icon: Clock3,
          title: "Profile under review",
          detail: "We are reviewing your profile. You will be notified when a decision is made.",
          progress: 100,
          tone: "var(--lobb-clay)",
        }
      : coachStatus === "active" && needsPayoutSetup
      ? {
          icon: Landmark,
          title: "Payouts not set up",
          detail: "Add your bank account to start accepting bookings.",
          progress: 90,
          tone: "var(--lobb-error)",
        }
      : coachStatus === "active"
      ? {
          icon: CheckCircle2,
          title: "Live on LOBB",
          detail: "Players can find and book you now.",
          progress: 100,
          tone: "var(--lobb-success)",
        }
      : coachStatus === "rejected"
      ? {
          icon: XCircle,
          title: "Profile not approved",
          detail: needsDirectContact
            ? "Your profile has been reviewed multiple times. Please contact support@lobb.ng directly."
            : rejectionReason
            ? `Feedback: ${rejectionReason}`
            : "Your profile needs updates before it can go live. Check your email for details.",
          progress: 90,
          tone: "var(--lobb-error)",
        }
      : coachStatus === "suspended"
      ? {
          icon: AlertTriangle,
          title: "Account suspended",
          detail: "Your account has been suspended. Contact support@lobb.ng to resolve this.",
          progress: 100,
          tone: "var(--lobb-error)",
        }
      : {
          icon: AlertTriangle,
          title: `Profile ${completion}% complete`,
          detail: "Complete your profile to submit for review.",
          progress: completion,
          tone: "var(--lobb-clay)",
        };
  const CompletionIcon = completionCard.icon;
  const recentBookings = data?.recent_bookings ?? [];
  const firstName = data?.coach?.full_name?.split(" ")[0] || "Coach";

  return (
    <main className="lobb-app-page min-h-screen px-5 pb-28 text-[var(--lobb-text-primary)] sm:px-6">
      <CoachFlowHeader title="Dashboard" eyebrow="LOBB Coach" active="home" />

      <section className="mx-auto max-w-6xl pt-5 lg:pt-7">
        <SecurityNudge />
        <section className="lobb-hero-card relative mb-5 overflow-hidden border px-6 py-6 sm:px-8 sm:py-7">
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="lobb-hero-eyebrow inline-flex max-w-full items-center gap-2 rounded-[var(--lobb-radius-md)] border px-3 py-2">
                <Circle className="size-2 fill-[var(--lobb-clay)] text-[var(--lobb-clay)]" />
                <span className="truncate text-[11px] font-medium uppercase tracking-[0.18em]">
                  {getGreeting()}, {firstName}
                </span>
              </div>
              <h1 className="mt-4 max-w-2xl text-[28px] font-semibold leading-[1.08] tracking-tight text-balance sm:text-[38px]">
                {nextSession ? `Next session: ${formatBookingDate(nextSession.starts_at)}` : "Your coaching business, at a glance."}
              </h1>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:w-[360px] lg:shrink-0">
              <HeroChip value={String(upcoming.length)} label="Sessions" />
              <HeroChip value={money(data?.earnings?.net_this_month_ngn ?? 0)} label="This month" />
              <HeroChip value={coachStatus.replace(/_/g, " ")} label="Status" />
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)] xl:items-start">
          <aside className="space-y-4">
            <Link
              href={needsPayoutSetup ? "/coach/settings/bank" : coachStatus === "rejected" ? "/coach/profile/edit" : "/coach/profile"}
              className="lobb-surface-outlined block bg-[var(--lobb-bg-elevated)] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--lobb-radius-lg)] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
                  <CompletionIcon className="size-5.5" style={{ color: completionCard.tone }} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium">{completionCard.title}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-[var(--lobb-text-secondary)]">{completionCard.detail}</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--lobb-bg-secondary)]">
                <div className="h-full rounded-[var(--lobb-radius-lg)]" style={{ width: `${completionCard.progress}%`, backgroundColor: completionCard.tone }} />
              </div>
              <p className="mt-2 text-[11px] font-medium text-[var(--lobb-text-tertiary)]">{completionCard.progress}% complete</p>
            </Link>

            {needsPayoutSetup && (
              <Link
                href="/coach/settings/bank"
                className="block border border-[var(--lobb-error)] bg-[var(--lobb-error)]/[0.06] p-4"
              >
                <div className="flex items-center gap-2">
                  <Landmark className="size-4 text-[var(--lobb-error)]" />
                  <p className="font-medium text-[var(--lobb-error)]">Set up payouts to accept bookings</p>
                </div>
                <p className="mt-1 text-sm font-medium leading-5 text-[var(--lobb-text-secondary)]">
                  Add your bank account so players can book you and LOBB can send your earnings.
                </p>
              </Link>
            )}

            {needsAvailability && (
              <Link
                href="/coach/availability"
                className="block border border-[var(--lobb-clay)] bg-[var(--lobb-clay-light)] p-4"
              >
                <p className="font-medium text-[var(--lobb-clay)]">Set weekly availability</p>
                <p className="mt-1 text-sm font-medium leading-5 text-[var(--lobb-text-secondary)]">
                  Players need at least one available window before they can book.
                </p>
              </Link>
            )}

            {coachStatus === "active" && data?.referral?.referral_code && (
              <ReferralCard referral={data.referral} />
            )}

            <CoachSurface className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">Next session</p>
                <Link href="/coach/availability" className="text-xs font-medium text-[var(--lobb-clay)]">Availability</Link>
              </div>
              {loading ? (
                <div className="mt-5 flex items-center gap-3">
                  <SkeletonBlock className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-28" />
                    <SkeletonBlock className="h-3 w-36" />
                  </div>
                </div>
              ) : nextSession ? (
                <NextSession booking={nextSession} />
              ) : (
                <p className="mt-4 text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">No upcoming sessions yet.</p>
              )}
              <Link href="/coach/availability" className="mt-4 flex h-11 items-center justify-center bg-[var(--lobb-bg-inverse)] text-xs font-medium text-[var(--lobb-text-inverse)]">
                Manage Availability
              </Link>
            </CoachSurface>
          </aside>

          <section className="min-w-0 space-y-4">
            <section className="lobb-surface-inset bg-[var(--lobb-bg-elevated)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Appointments</p>
                  <p className="mt-1 text-xs font-medium text-[var(--lobb-text-secondary)]">Recent sessions and player bookings</p>
                </div>
                <Link href="/coach/bookings" className="text-xs font-medium text-[var(--lobb-clay)]">View all</Link>
              </div>

              {loading ? (
                <section className="mt-4 grid gap-3">
                  {Array.from({ length: 5 }).map((_, index) => <SkeletonBlock key={index} className="h-14 rounded-[var(--lobb-radius-md)]" />)}
                </section>
              ) : recentBookings.length ? (
                <AppointmentsTable bookings={recentBookings.slice(0, 6)} />
              ) : (
                <CoachSurface className="mt-4 p-5 text-sm font-medium text-[var(--lobb-text-secondary)]">
                  Bookings will appear here when players reserve a session.
                </CoachSurface>
              )}
            </section>
          </section>
        </div>
      </section>

      <CoachBottomNav active="home" />
    </main>
  );
}

function HeroChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-[var(--lobb-radius-md)] border border-white/15 bg-white/[0.08] px-3 py-2.5">
      <p className="truncate text-sm font-medium capitalize text-white">{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/50">{label}</p>
    </div>
  );
}

function NextSession({ booking }: { booking: DashboardBooking }) {
  return (
    <Link href={`/coach/bookings/${booking.id}`} className="mt-4 block">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-full bg-[var(--lobb-bg-secondary)]">
          <User className="size-5 text-[var(--lobb-text-tertiary)]" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{firstJoin(booking.players)?.full_name ?? "Player"}</p>
          <p className="mt-1 text-xs font-medium text-[var(--lobb-text-secondary)]">{formatBookingDate(booking.starts_at)}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2 border-t border-[var(--lobb-border-subtle)] pt-4 text-xs font-medium text-[var(--lobb-text-secondary)]">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--lobb-clay)]" />
          <span>{booking.location}</span>
        </p>
        <p className="flex items-center gap-2">
          <Mail className="size-3.5 text-[var(--lobb-clay)]" />
          Contact details are in your confirmation email
        </p>
      </div>
    </Link>
  );
}

function ReferralCard({ referral }: { referral: NonNullable<CoachDashboardPayload["referral"]> }) {
  const link = `lobb.ng/r/${referral.referral_code}`;
  const fullLink = `https://lobb.ng/r/${referral.referral_code}`;
  const whatsappText = encodeURIComponent(
    `Hey! I've joined LOBB — makes it easy to book tennis sessions with me directly, no back and forth. Book here: ${fullLink} 🎾`
  );

  function copyLink() {
    navigator.clipboard.writeText(fullLink).then(() => {
      showLobbToast({ type: "success", message: "Referral link copied!" });
    });
  }

  return (
    <CoachSurface className="p-4">
      <div className="flex items-center gap-2">
        <Gift className="size-4 text-[var(--lobb-clay)]" />
        <p className="font-medium">My Referral Link</p>
      </div>
      <p className="mt-3 truncate rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-secondary)] px-3 py-2.5 font-mono text-sm font-medium text-[var(--lobb-text-primary)]">
        {link}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <LobbButton variant="unstyled"
          onClick={copyLink}
          className="flex h-10 items-center justify-center gap-1.5 rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] text-xs font-medium text-[var(--lobb-text-inverse)]"
        >
          Copy Link
        </LobbButton>
        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 items-center justify-center gap-1.5 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-xs font-medium text-[var(--lobb-text-primary)]"
        >
          <Share2 className="size-3.5" />
          WhatsApp
        </a>
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-[var(--lobb-border-subtle)] pt-4 text-xs font-medium text-[var(--lobb-text-secondary)]">
        <span>{referral.signups_count} sign-up{referral.signups_count !== 1 ? "s" : ""}</span>
        <span className="text-[var(--lobb-border-subtle)]">·</span>
        <span>{referral.booked_count} booked</span>
        {referral.total_earned_ngn > 0 && (
          <>
            <span className="text-[var(--lobb-border-subtle)]">·</span>
            <span className="font-medium text-[var(--lobb-clay)]">{money(referral.total_earned_ngn)} earned</span>
          </>
        )}
      </div>
    </CoachSurface>
  );
}

function AppointmentsTable({ bookings }: { bookings: DashboardBooking[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-t border-[var(--lobb-border-subtle)]">
              <td className="py-4 pr-4">
                <p className="font-medium">{new Date(booking.starts_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" })}</p>
                <p className="mt-1 text-[11px] font-medium text-[var(--lobb-text-tertiary)]">
                  {new Date(booking.starts_at).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })}
                </p>
              </td>
              <td className="px-4 py-4">
                <p className="font-medium">{firstJoin(booking.players)?.full_name ?? "Player"}</p>
                <p className="mt-1 max-w-[220px] truncate text-[11px] font-medium text-[var(--lobb-text-secondary)]">{booking.location || "Location pending"}</p>
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex items-center gap-1.5 rounded-[var(--lobb-radius-lg)] px-2.5 py-1 text-[11px] font-medium capitalize ${
                  booking.status === "confirmed" ? "bg-[var(--lobb-success)]/10 text-[var(--lobb-success)]" : booking.status === "completed" ? "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-secondary)]" : "bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]"
                }`}>
                  <Circle className="size-2 fill-current" />
                  {booking.status}
                </span>
              </td>
              <td className="py-4 pl-4 text-right font-medium">{money(booking.coach_payout_ngn ?? booking.total_amount_ngn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
