import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarCheck, MapPin, ShieldCheck, Star, Trophy, Sparkles } from "lucide-react";
import { LobbVerifiedBadge } from "@/components/common/lobb-badge";
import type { CoachPublicProfile } from "@/lib/types";

function money(value: number | null) {
  return value == null ? "Rate pending" : `₦${value.toLocaleString()}`;
}

/* ── Small card — horizontal scroll strip on home ── */
export function SmallCoachCard({ coach }: { coach: CoachPublicProfile }) {
  return (
    <Link
      href={`/coaches/${coach.slug}`}
      className="group relative flex w-full flex-col overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-[0_12px_32px_rgba(58,43,20,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(58,43,20,0.09)]"
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
          <div className="flex size-full items-center justify-center bg-[var(--lobb-surface-2)] text-black/10">
            <Sparkles className="size-8 stroke-[1.25]" />
          </div>
        )}
        <div className="absolute left-2.5 top-2.5">
          <LobbVerifiedBadge verified={coach.is_verified} size="small" />
        </div>
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
        <p className="mt-3 font-[family-name:var(--font-mono)] text-sm font-black text-[var(--lobb-clay)]">
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
  const primarySkill = coach.specializations[0] ?? coach.skill_levels[0] ?? "Tennis Coach";
  const experience = coach.experience_years > 0 ? `${coach.experience_years} yrs` : "New";

  return (
    <article className="group overflow-hidden rounded-[30px] border border-black/[0.07] bg-white p-3.5 shadow-[0_16px_42px_rgba(58,43,20,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(58,43,20,0.1)]">
      {/* Visual Header containing photo & core details */}
      <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] bg-[var(--lobb-surface-2)] sm:aspect-[16/9] md:aspect-[4/3]">
        {coach.profile_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coach.profile_photo_url}
            alt={coach.full_name}
            className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-[var(--lobb-surface-2)] text-black/10">
            <Sparkles className="size-16 stroke-[1]" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Verification Tag */}
        <div className="absolute left-3.5 top-3.5">
          <LobbVerifiedBadge verified={coach.is_verified} size="small" />
        </div>

        {/* Floating Identity Panel */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">{primarySkill}</p>
            <h3 className="mt-1 truncate text-[24px] font-black leading-none tracking-tight">{coach.full_name}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-[var(--lobb-black)] shadow-md">
            <Star className="size-3.5 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
            <span>{coach.avg_rating != null ? coach.avg_rating : "New"}</span>
          </div>
        </div>
      </div>

      {/* Info Body */}
      <div className="px-1 pb-1 pt-4">
        {/* Pitch Headline & Pricing */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="line-clamp-2 text-sm font-semibold leading-relaxed text-[var(--lobb-muted)]">
              {coach.headline ?? (coach.certifications[0] || "Focused tennis coaching for match-ready players.")}
            </p>
            <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-[var(--lobb-muted)]">
              <MapPin className="size-3.5 shrink-0 text-[var(--lobb-clay)]" />
              <span className="truncate">{locations.length ? locations.join(" · ") : "Location pending"}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-[family-name:var(--font-mono)] text-xl font-black text-[var(--lobb-black)] leading-none">
              {money(coach.hourly_rate_ngn)}
            </p>
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--lobb-muted)]">per hour</p>
          </div>
        </div>

        {/* Clean, minimalist Metrics Grid */}
        <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[20px] border border-black/[0.05] bg-black/[0.015]">
          <MiniMetric icon={<Trophy className="size-3.5" />} label="Sessions" value={coach.session_count || "New"} />
          <MiniMetric icon={<ShieldCheck className="size-3.5" />} label="Reviews" value={coach.review_count || "New"} />
          <MiniMetric icon={<CalendarCheck className="size-3.5" />} label="Availability" value={coach.has_availability ? "Open" : "Ask"} />
        </div>

        {/* Premium Action Buttons */}
        <div className="mt-4 flex items-center gap-2.5">
          <Link
            href={profileHref}
            className="flex h-[48px] flex-1 items-center justify-center rounded-[16px] border border-black/10 bg-white px-4 text-xs font-black text-[var(--lobb-black)] transition hover:bg-black/5 active:scale-[0.98]"
          >
            Profile
          </Link>
          <Link
            href={bookingHref}
            className="flex h-[48px] flex-[1.4] items-center justify-center gap-2 rounded-[16px] bg-[var(--lobb-black)] px-4 text-xs font-black text-white shadow-[0_8px_24px_rgba(13,13,13,0.18)] transition hover:bg-[#1f1f1f] active:scale-[0.98]"
          >
            Book Now <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {/* Secondary Info Tags */}
        <div className="mt-4.5 flex flex-wrap gap-1.5 pt-3.5 border-t border-black/[0.04]">
          <span className="rounded-full bg-black/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-black/50">
            {primarySkill}
          </span>
          <span className="rounded-full bg-black/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-black/50">
            {experience} experience
          </span>
        </div>
      </div>
    </article>
  );
}

function MiniMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="border-r border-black/[0.04] px-3 py-3 last:border-r-0 text-center sm:text-left">
      <p className="flex items-center justify-center sm:justify-start gap-1 text-sm font-black text-[var(--lobb-black)]">
        <span className="text-[var(--lobb-clay)]">{icon}</span>
        <span className="truncate">{value}</span>
      </p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--lobb-muted)]">{label}</p>
    </div>
  );
}
