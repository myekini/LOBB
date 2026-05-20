import Link from "next/link";
import { ArrowRight, CalendarCheck, MapPin, Star } from "lucide-react";
import { LobbVerifiedBadge } from "@/components/lobb-badge";
import type { CoachPublicProfile } from "@/lib/types";

function money(value: number | null) {
  return value == null ? "Rate pending" : `₦${value.toLocaleString()}`;
}

/* ── Small card — horizontal scroll strip on home ── */
export function SmallCoachCard({ coach }: { coach: CoachPublicProfile }) {
  return (
    <Link
      href={`/coaches/${coach.slug}`}
      className="w-full overflow-hidden rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(13,13,13,0.13)]"
    >
      <div className="relative h-[108px] w-full bg-[var(--lobb-surface-2)]">
        {coach.profile_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coach.profile_photo_url} alt={coach.full_name} className="size-full object-cover" />
        )}
        <div className="absolute bottom-2 left-2">
          <LobbVerifiedBadge verified={coach.is_verified} size="small" />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--lobb-black)]">
          <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
          {coach.avg_rating != null ? coach.avg_rating : "New"}
          {coach.review_count > 0 && (
            <span className="font-medium text-[var(--lobb-muted)]">· {coach.review_count}</span>
          )}
        </div>
        <h3 className="mt-1 truncate text-[13px] font-black text-[var(--lobb-black)]">
          {coach.full_name}
        </h3>
        <p className="truncate text-[11px] font-medium text-[var(--lobb-muted)]">
          {(coach.specializations[0] ?? coach.skill_levels[0]) || "Tennis Coach"} · {coach.primary_location}
        </p>
        <p className="mt-2 font-[family-name:var(--font-mono)] text-[13px] font-bold text-[var(--lobb-clay)]">
          {coach.hourly_rate_ngn == null ? money(coach.hourly_rate_ngn) : `${money(coach.hourly_rate_ngn)}/hr`}
        </p>
      </div>
    </Link>
  );
}

/* ── Full list card — coaches browse page ── */
export function CoachListCard({ coach }: { coach: CoachPublicProfile }) {
  const profileHref = coach.slug ? `/coaches/${coach.slug}` : "#";
  const bookingHref = coach.slug ? `/book/${coach.slug}/step-1` : "#";
  const locations = [
    coach.primary_location,
    ...coach.service_areas.filter((a) => a !== coach.primary_location),
  ].filter(Boolean).slice(0, 3);

  return (
    <article className="overflow-hidden rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_14px_34px_rgba(13,13,13,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(13,13,13,0.11)]">
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 p-4">
        <Link href={profileHref} className="relative h-full min-h-[124px] overflow-hidden rounded-[18px] bg-[var(--lobb-surface-2)]">
          {coach.profile_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coach.profile_photo_url} alt={coach.full_name} className="size-full object-cover" />
          )}
          <div className="absolute bottom-2 left-2">
            <LobbVerifiedBadge verified={coach.is_verified} size="small" />
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link href={profileHref} className="truncate font-black text-[var(--lobb-black)] hover:text-[var(--lobb-clay)]">
                  {coach.full_name}
                </Link>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-5 text-[var(--lobb-muted)]">
                {coach.headline ?? (coach.certifications[0] || "Tennis Coach")}
              </p>
            </div>
            <button
              aria-label="Save coach"
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--lobb-border)] text-[var(--lobb-muted)]"
            >
              ♡
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[12px]">
            <Star className="size-3.5 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
            <span className="font-black">
              {coach.avg_rating != null ? coach.avg_rating : "New"}
            </span>
            <span className="font-medium text-[var(--lobb-muted)]">
              · {coach.session_count} sessions
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[14px] bg-[var(--lobb-surface-2)] px-3 py-2">
              <p className="font-[family-name:var(--font-mono)] text-[15px] font-black text-[var(--lobb-black)]">
                {money(coach.hourly_rate_ngn)}
              </p>
              <p className="text-[10px] font-bold text-[var(--lobb-muted)]">per hour</p>
            </div>
            <div className="rounded-[14px] bg-[var(--lobb-surface-2)] px-3 py-2">
              <p className="flex items-center gap-1 text-[12px] font-black text-[var(--lobb-black)]">
                <CalendarCheck className="size-3.5 text-[var(--lobb-clay)]" />
                {coach.has_availability ? "Slots open" : "Ask coach"}
              </p>
              <p className="text-[10px] font-bold text-[var(--lobb-muted)]">availability</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--lobb-border)] bg-white/45 px-4 py-3">
        <p className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-[var(--lobb-muted)]">
          <MapPin className="size-3.5 shrink-0 text-[var(--lobb-clay)]" />
          <span className="truncate">{locations.length ? locations.join(" · ") : "Location pending"}</span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={profileHref} className="hidden rounded-full border border-[var(--lobb-border)] px-3 py-2 text-[12px] font-black text-[var(--lobb-black)] sm:inline-flex">
            Profile
          </Link>
          <Link
            href={bookingHref}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--lobb-clay)] px-4 py-2 text-[12px] font-black text-white transition active:scale-[0.97]"
          >
            Book <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
