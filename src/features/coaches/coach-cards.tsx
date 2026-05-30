import Link from "next/link";
import { ArrowRight, MapPin, Sparkles, Star } from "lucide-react";
import type { CoachPublicProfile } from "@/lib/types";

function money(value: number | null) {
  return value == null ? "TBD" : `₦${value.toLocaleString()}`;
}

function skillColor(skill: string): string {
  const s = skill.toLowerCase();
  if (s.includes("beginner")) return "bg-[var(--lobb-success-soft)] text-[var(--lobb-success)]";
  if (s.includes("intermediate")) return "bg-[var(--lobb-clay-light)] text-[var(--lobb-clay-dark)]";
  if (s.includes("advanced") || s.includes("competitive")) return "bg-[var(--lobb-accent-violet-soft)] text-[var(--lobb-accent-violet)]";
  if (s.includes("kid") || s.includes("junior")) return "bg-[var(--lobb-accent-blue-soft)] text-[var(--lobb-accent-blue)]";
  return "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-secondary)]";
}

/* ── Small card — home page grid ── */
export function SmallCoachCard({ coach }: { coach: CoachPublicProfile }) {
  return (
    <Link
      href={`/coaches/${coach.slug}`}
      className="group relative flex w-full flex-col overflow-hidden rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[var(--lobb-shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--lobb-shadow-modal)]"
    >
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-[var(--lobb-surface-2)]">
        {coach.profile_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coach.profile_photo_url}
            alt={coach.full_name}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-[var(--lobb-surface-2)] text-[var(--lobb-text-tertiary)]/30">
            <Sparkles className="size-8 stroke-[1.25]" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div>
          <div className="flex items-center gap-1 text-[11px] font-black text-[var(--lobb-black)]">
            <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
            {coach.avg_rating != null ? coach.avg_rating : "New"}
            {coach.review_count > 0 && (
              <span className="font-semibold text-[var(--lobb-muted)]">({coach.review_count})</span>
            )}
          </div>
          <h3 className="mt-1 truncate text-sm font-black text-[var(--lobb-black)] tracking-tight">
            {coach.full_name}
          </h3>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--lobb-muted)]">
            {(coach.specializations[0] ?? coach.skill_levels[0]) || "Tennis Coach"} · {coach.primary_location}
          </p>
        </div>
        <p className="mt-3 text-sm font-black text-[var(--lobb-clay)]">
          {coach.hourly_rate_ngn == null ? money(null) : `${money(coach.hourly_rate_ngn)}/hr`}
        </p>
      </div>
    </Link>
  );
}

/* ── Full list card — coaches browse page ──
   Mobile:  horizontal — image left, content right
   Desktop: vertical — large image top, overlay badges, content below
─────────────────────────────────────────────── */
export function CoachListCard({ coach }: { coach: CoachPublicProfile }) {
  const profileHref = `/coaches/${coach.slug ?? coach.id}`;
  const bookingHref = coach.slug ? `/book/${coach.slug}/step-1` : "#";
  const locations = [
    coach.primary_location,
    ...coach.service_areas.filter((a) => a !== coach.primary_location),
  ].filter(Boolean).slice(0, 3);
  const primarySkill = coach.specializations[0] ?? coach.skill_levels[0] ?? "Tennis Coach";
  const ratingLabel = coach.avg_rating != null ? String(coach.avg_rating) : "New";

  return (
    <article className="group overflow-hidden rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[var(--lobb-shadow-card)] transition duration-200 hover:shadow-[var(--lobb-shadow-modal)]">

      {/* ── Mobile: horizontal layout ── */}
      <div className="flex md:hidden">
        {/* Image */}
        <Link href={profileHref} className="relative w-[120px] shrink-0 overflow-hidden rounded-l-[20px]">
          {coach.profile_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coach.profile_photo_url}
              alt={coach.full_name}
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--lobb-surface-2)]">
              <Sparkles className="size-8 text-[var(--lobb-text-tertiary)]/30 stroke-[1.25]" />
            </div>
          )}
        </Link>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
          {/* Skill + Rating row */}
          <div className="flex items-center justify-between gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${skillColor(primarySkill)}`}>
              {primarySkill}
            </span>
            <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--lobb-border)] px-2 py-0.5 text-[11px] font-black text-[var(--lobb-text-primary)]">
              <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
              {ratingLabel}
            </div>
          </div>

          {/* Name */}
          <Link href={profileHref} className="block truncate text-[17px] font-black leading-tight tracking-tight text-[var(--lobb-black)]">
            {coach.full_name}
          </Link>

          {/* Headline */}
          <p className="line-clamp-2 text-[11px] font-semibold leading-[1.45] text-[var(--lobb-muted)]">
            {coach.headline ?? `${primarySkill} · ${coach.certifications[0] ?? "Tennis Coach"}`}
          </p>

          {/* Location */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[var(--lobb-muted)]">
            <MapPin className="size-3 shrink-0 text-[var(--lobb-clay)]" />
            <span className="truncate">{locations.join(" · ") || "Lagos"}</span>
          </div>

          {/* Rate */}
          <p className="text-[11px] font-black text-[var(--lobb-clay)]">
            {money(coach.hourly_rate_ngn)}/hr
          </p>

          {/* Book button */}
          <Link
            href={bookingHref}
            aria-disabled={!coach.slug}
            className={`mt-auto flex h-10 items-center justify-center gap-1.5 rounded-[12px] text-xs font-black transition active:scale-[0.97] ${
              coach.slug
                ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]"
                : "pointer-events-none bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"
            }`}
          >
            Book <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Desktop: vertical image-top layout ── */}
      <div className="hidden md:block">
        {/* Image with overlaid badges */}
        <Link href={profileHref} className="relative block overflow-hidden rounded-t-[20px]">
          <div className="relative aspect-[4/3] overflow-hidden bg-[var(--lobb-surface-2)]">
            {coach.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coach.profile_photo_url}
                alt={coach.full_name}
                className="size-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-[var(--lobb-surface-2)]">
                <Sparkles className="size-14 text-[var(--lobb-text-tertiary)]/30 stroke-[1]" />
              </div>
            )}
            {/* Gradient for badge readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Overlaid badges at bottom */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] backdrop-blur-sm ${skillColor(primarySkill)}`}>
                {primarySkill}
              </span>
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--lobb-surface)]/95 px-2.5 py-1 text-[11px] font-black text-[var(--lobb-text-primary)] shadow-sm">
                <Star className="size-3.5 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
                {ratingLabel}
              </div>
            </div>
          </div>
        </Link>

        {/* Content */}
        <div className="p-4">
          <Link href={profileHref} className="block text-[22px] font-black leading-tight tracking-tight text-[var(--lobb-black)] hover:text-[var(--lobb-clay-dark)]">
            {coach.full_name}
          </Link>
          <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-5 text-[var(--lobb-muted)]">
            {coach.headline ?? `${primarySkill} · ${coach.certifications[0] ?? "Tennis Coach"}`}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[var(--lobb-muted)]">
            <MapPin className="size-3.5 shrink-0 text-[var(--lobb-clay)]" />
            <span className="truncate">{locations.join(" · ") || "Lagos"}</span>
          </div>

          {/* Availability + rate row */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
              coach.has_availability ? "bg-[var(--lobb-success-soft)] text-[var(--lobb-success)]" : "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"
            }`}>
              {coach.has_availability ? "● Open slots" : "○ No slots"}
            </span>
            <span className="text-sm font-black text-[var(--lobb-clay)]">
              {money(coach.hourly_rate_ngn)}/hr
            </span>
          </div>

          {/* Book */}
          <Link
            href={bookingHref}
            aria-disabled={!coach.slug}
            className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-black transition active:scale-[0.98] ${
              coach.slug
                ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] shadow-[0_8px_22px_rgba(13,13,13,0.16)] hover:opacity-90"
                : "pointer-events-none bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"
            }`}
          >
            Book <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
