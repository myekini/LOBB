"use client";

import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { CoachPublicProfile } from "@/lib/types";

function money(value: number | null) {
  return value == null ? "TBD" : `₦${value.toLocaleString()}`;
}

export function SmallCoachCard({ coach }: { coach: CoachPublicProfile }) {
  const primarySkill = coach.specializations[0] ?? coach.skill_levels[0] ?? "Tennis Coach";
  const ratingLabel = coach.avg_rating != null ? coach.avg_rating.toFixed(1) : null;

  return (
    <Link
      href={`/coaches/${coach.slug}`}
      className="group relative flex w-full flex-col overflow-hidden rounded-[16px] bg-[var(--lobb-bg-elevated)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
    >
      {/* Portrait photo */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--lobb-bg-secondary)]">
        <div className="absolute inset-0 flex items-end justify-center pb-6 text-5xl font-black text-[var(--lobb-text-tertiary)]/40 select-none">
          {coach.full_name.charAt(0)}
        </div>
        {coach.profile_photo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coach.profile_photo_url}
            alt={coach.full_name}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="absolute inset-0 size-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        {/* Gradient — bottom only, for legibility */}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Rate pill — bottom left, minimal */}
        <div className="absolute bottom-3 left-3">
          <span className="block text-[12px] font-black text-white drop-shadow-sm">
            {coach.hourly_rate_ngn == null ? "TBD" : `${money(coach.hourly_rate_ngn)}/hr`}
          </span>
        </div>

        {/* Rating — bottom right */}
        {ratingLabel && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
            <span className="text-[11px] font-black text-white drop-shadow-sm">{ratingLabel}</span>
          </div>
        )}
      </div>

      {/* Content below photo */}
      <div className="flex flex-col gap-1 px-3 py-3">
        <h3 className="truncate text-[14px] font-black leading-tight tracking-tight text-[var(--lobb-text-primary)]">
          {coach.full_name}
        </h3>
        <p className="truncate text-[11px] font-semibold text-[var(--lobb-text-secondary)]">
          {primarySkill}
        </p>
        {coach.primary_location && (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-[var(--lobb-text-tertiary)]">
            <MapPin className="size-3 shrink-0 text-[var(--lobb-clay)]" />
            <span className="truncate">{coach.primary_location}</span>
          </div>
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
  ].filter(Boolean).slice(0, 2);
  const primarySkill = coach.specializations[0] ?? coach.skill_levels[0] ?? "Tennis Coach";
  const ratingLabel = coach.avg_rating != null ? Number(coach.avg_rating).toFixed(1) : null;
  const headline = coach.headline ?? `${primarySkill} · ${coach.certifications[0] ?? "Tennis Coach"}`;

  return (
    <article className="group overflow-hidden rounded-[18px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] transition-all duration-300 hover:border-[var(--lobb-clay)]/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)]">

      {/* ── Mobile: horizontal layout ── */}
      <div className="flex min-h-[160px] md:hidden">
        <Link href={profileHref} className="relative w-[130px] shrink-0 overflow-hidden rounded-l-[18px]">
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--lobb-bg-secondary)] text-4xl font-black text-[var(--lobb-text-tertiary)]/40 select-none">
            {coach.full_name.charAt(0)}
          </div>
          {coach.profile_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coach.profile_photo_url}
              alt={coach.full_name}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              className="absolute inset-0 size-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
          <span className="absolute bottom-2.5 left-0 right-0 text-center text-[10px] font-black text-white drop-shadow-sm">
            {money(coach.hourly_rate_ngn)}/hr
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3.5">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <Link href={profileHref} className="block min-w-0 truncate text-[16px] font-black leading-tight tracking-tight text-[var(--lobb-text-primary)] hover:text-[var(--lobb-clay-dark)]">
                {coach.full_name}
              </Link>
              {ratingLabel && (
                <div className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--lobb-border-subtle)] px-2 py-0.5">
                  <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
                  <span className="text-[11px] font-black text-[var(--lobb-text-primary)]">{ratingLabel}</span>
                </div>
              )}
            </div>
            <p className="line-clamp-2 text-[11px] font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">
              {headline}
            </p>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--lobb-text-tertiary)]">
              <MapPin className="size-3 shrink-0 text-[var(--lobb-clay)]" />
              <span className="truncate">{locations.join(" · ") || "Lagos"}</span>
            </div>
          </div>
          <Link
            href={bookingHref}
            aria-disabled={!coach.slug}
            className={`flex h-9 items-center justify-center rounded-[10px] text-[11px] font-black transition active:scale-[0.97] ${
              coach.slug
                ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] hover:bg-[var(--lobb-clay-dark)]"
                : "pointer-events-none bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"
            }`}
          >
            Book session
          </Link>
        </div>
      </div>

      {/* ── Desktop: editorial split ── */}
      <div className="hidden md:grid md:grid-cols-[40%_60%] md:min-h-[280px]">
        {/* Left — full portrait photo */}
        <Link href={profileHref} className="relative block overflow-hidden rounded-l-[18px] bg-[var(--lobb-bg-secondary)]">
          <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-[var(--lobb-text-tertiary)]/30 select-none">
            {coach.full_name.charAt(0)}
          </div>
          {coach.profile_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coach.profile_photo_url}
              alt={coach.full_name}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              className="absolute inset-0 size-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          )}
          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
          {/* Rate — minimal text, bottom left */}
          <span className="absolute bottom-4 left-4 text-[13px] font-black text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
            {money(coach.hourly_rate_ngn)}/hr
          </span>
        </Link>

        {/* Right — editorial content */}
        <div className="flex flex-col justify-between p-6">
          <div className="space-y-3">
            {/* Skill label */}
            <span className="inline-block text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-clay)]">
              {primarySkill}
            </span>

            {/* Name */}
            <Link
              href={profileHref}
              className="block text-[26px] font-black leading-[1.05] tracking-tight text-[var(--lobb-text-primary)] transition hover:text-[var(--lobb-clay-dark)]"
            >
              {coach.full_name}
            </Link>

            {/* Headline */}
            <p className="line-clamp-2 text-[13px] font-semibold leading-relaxed text-[var(--lobb-text-secondary)]">
              {headline}
            </p>

            {/* Rating + reviews */}
            {ratingLabel && (
              <div className="flex items-center gap-2 text-[12px]">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`size-3.5 ${coach.avg_rating && n <= Math.round(Number(coach.avg_rating)) ? "fill-[var(--lobb-star)] text-[var(--lobb-star)]" : "text-[var(--lobb-border-subtle)]"}`}
                    />
                  ))}
                </div>
                <span className="font-bold text-[var(--lobb-text-secondary)]">
                  {ratingLabel}
                  {coach.review_count > 0 && <span className="ml-1 text-[var(--lobb-text-tertiary)]">({coach.review_count})</span>}
                </span>
              </div>
            )}

            {/* Location */}
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--lobb-text-tertiary)]">
              <MapPin className="size-3.5 shrink-0 text-[var(--lobb-clay)]" />
              <span className="truncate">{locations.join(" · ") || "Lagos"}</span>
            </div>
          </div>

          {/* Footer row */}
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--lobb-border-subtle)] pt-4">
            <span className={`text-[11px] font-black ${coach.has_availability ? "text-[var(--lobb-success)]" : "text-[var(--lobb-text-tertiary)]"}`}>
              {coach.has_availability ? "Slots available" : "No open slots"}
            </span>
            <Link
              href={bookingHref}
              aria-disabled={!coach.slug}
              className={`inline-flex h-10 items-center gap-2 rounded-[12px] px-5 text-[13px] font-black transition active:scale-[0.97] ${
                coach.slug
                  ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] hover:bg-[var(--lobb-clay-dark)]"
                  : "pointer-events-none bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-tertiary)]"
              }`}
            >
              Book session
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
