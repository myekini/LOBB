import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { LobbVerifiedBadge } from "@/components/lobb-badge";
import type { CoachPublicProfile } from "@/lib/types";

function money(value: number) {
  return `₦${value.toLocaleString()}`;
}

/* ── Small card — horizontal scroll strip on home ── */
export function SmallCoachCard({ coach }: { coach: CoachPublicProfile }) {
  return (
    <Link
      href={`/coaches/${coach.slug}`}
      className="w-full overflow-hidden rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.07)] transition hover:shadow-[0_16px_36px_rgba(13,13,13,0.11)]"
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
          {money(coach.hourly_rate_ngn)}/hr
        </p>
      </div>
    </Link>
  );
}

/* ── Full list card — coaches browse page ── */
export function CoachListCard({ coach }: { coach: CoachPublicProfile }) {
  const locations = [
    coach.primary_location,
    ...coach.service_areas.filter((a) => a !== coach.primary_location),
  ].slice(0, 3);

  return (
    <article className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.06)] transition hover:shadow-[0_16px_36px_rgba(13,13,13,0.10)]">
      <div className="flex gap-3">
        <div className="size-[60px] shrink-0 overflow-hidden rounded-[16px] bg-[var(--lobb-surface-2)]">
          {coach.profile_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coach.profile_photo_url} alt={coach.full_name} className="size-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-black text-[var(--lobb-black)]">{coach.full_name}</h2>
                <LobbVerifiedBadge verified={coach.is_verified} size="small" />
              </div>
              <p className="text-[12px] font-medium text-[var(--lobb-muted)]">
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
        </div>
      </div>

      {/* Footer: location + price + CTA */}
      <div className="mt-3 flex items-center justify-between border-t border-[var(--lobb-border)] pt-3">
        <div>
          <p className="max-w-[160px] truncate text-[11px] font-medium text-[var(--lobb-muted)]">
            {locations.join(" · ")}
          </p>
          <p className="font-[family-name:var(--font-mono)] text-[14px] font-bold text-[var(--lobb-black)]">
            {money(coach.hourly_rate_ngn)}/hr
          </p>
        </div>
        <Link
          href={`/coaches/${coach.slug}`}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--lobb-clay)] px-4 py-2 text-[12px] font-black text-white transition active:scale-[0.97]"
        >
          Book <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
