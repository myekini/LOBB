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

export function SmallCoachCard({ coach }: { coach: CoachPublicProfile }) {
  const primarySkill = coach.specializations[0] ?? coach.skill_levels[0] ?? "Tennis Coach";

  return (
    <Link
      href={`/coaches/${coach.slug}`}
      className="lobb-app-card group relative flex w-full flex-col overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] transition-colors duration-200 hover:border-[var(--lobb-clay)]/35"
    >
      {/* Photo with overlaid rate + rating */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--lobb-surface-2)]">
        {coach.profile_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coach.profile_photo_url}
            alt={coach.full_name}
            className="size-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-[var(--lobb-surface-2)] text-[var(--lobb-text-tertiary)]/30">
            <Sparkles className="size-8 stroke-[1.25]" />
          </div>
        )}
        {/* Gradient for overlay legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Bottom overlay: clay rate pill left, rating pill right */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-[var(--lobb-clay)] px-2.5 py-1 text-[11px] font-black leading-none text-white">
            {coach.hourly_rate_ngn == null ? "TBD" : `${money(coach.hourly_rate_ngn)}/hr`}
          </span>
          <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[11px] font-black text-white backdrop-blur-sm">
            <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
            <span>{coach.avg_rating != null ? coach.avg_rating : "New"}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1 p-3.5 pt-3">
        <h3 className="truncate text-sm font-black leading-tight tracking-tight text-[var(--lobb-black)]">
          {coach.full_name}
        </h3>
        <p className="truncate text-[11px] font-semibold text-[var(--lobb-muted)]">
          {primarySkill}
        </p>
        {coach.primary_location && (
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[var(--lobb-text-tertiary)]">
            <MapPin className="size-3 shrink-0 text-[var(--lobb-clay)]" />
            <span className="truncate">{coach.primary_location}</span>
          </div>
        )}
        {coach.review_count > 0 && (
          <p className="mt-1.5 text-[10px] font-semibold text-[var(--lobb-text-tertiary)]">
            {coach.review_count} {coach.review_count === 1 ? "review" : "reviews"}
          </p>
        )}
      </div>
    </Link>
  );
}

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
    <article className="lobb-app-card group overflow-hidden border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] transition duration-200 hover:border-[var(--lobb-clay)]/35">

      {/* ── Mobile: horizontal layout ── */}
      <div className="flex md:hidden">
        {/* Image with rate overlay */}
        <Link href={profileHref} className="relative w-[136px] shrink-0 overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center px-2">
            <span className="rounded-full bg-[var(--lobb-clay)] px-2.5 py-0.5 text-[10px] font-black text-white">
              {money(coach.hourly_rate_ngn)}/hr
            </span>
          </div>
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

          <Link
            href={bookingHref}
            aria-disabled={!coach.slug}
            className={`mt-auto flex h-10 items-center justify-center gap-1.5 rounded-[12px] text-xs font-black transition active:scale-[0.97] ${
              coach.slug
                ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] hover:bg-[var(--lobb-clay-dark)]"
                : "pointer-events-none bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"
            }`}
          >
            Book session <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Desktop: vertical image-top layout ── */}
      <div className="hidden md:block">
        {/* Image with overlaid badges */}
        <Link href={profileHref} className="relative block overflow-hidden">
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
              coach.has_availability
                ? "bg-[var(--lobb-success-soft)] text-[var(--lobb-success)]"
                : "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"
            }`}>
              {coach.has_availability ? "● Open slots" : "○ No slots"}
            </span>
            <span className="text-sm font-black text-[var(--lobb-clay)]">
              {money(coach.hourly_rate_ngn)}/hr
            </span>
          </div>

          <Link
            href={bookingHref}
            aria-disabled={!coach.slug}
            className={`mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-black transition active:scale-[0.98] ${
              coach.slug
                ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] hover:bg-[var(--lobb-clay-dark)]"
                : "pointer-events-none bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"
            }`}
          >
            Book session <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
