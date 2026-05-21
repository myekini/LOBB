import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarCheck, MapPin, ShieldCheck, Star, Trophy } from "lucide-react";
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
  const primarySkill = coach.specializations[0] ?? coach.skill_levels[0] ?? "Tennis Coach";
  const experience = coach.experience_years > 0 ? `${coach.experience_years} yrs` : "New";

  return (
    <article className="group overflow-hidden rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_14px_34px_rgba(13,13,13,0.07)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(13,13,13,0.12)]">
      <div className="p-3">
        <Link href={profileHref} className="relative block aspect-[16/10] overflow-hidden rounded-[20px] bg-[var(--lobb-surface-2)] md:aspect-[4/3]">
          {coach.profile_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coach.profile_photo_url} alt={coach.full_name} className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/62 to-transparent" />
          <div className="absolute left-3 top-3">
            <LobbVerifiedBadge verified={coach.is_verified} size="small" />
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-white/64">{primarySkill}</p>
              <h3 className="truncate text-[22px] font-black leading-none">{coach.full_name}</h3>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[12px] font-black text-[var(--lobb-black)]">
              <Star className="size-3.5 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
              {coach.avg_rating != null ? coach.avg_rating : "New"}
            </div>
          </div>
        </Link>
      </div>

      <div className="px-4 pb-4 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-[13px] font-semibold leading-5 text-[var(--lobb-muted)]">
              {coach.headline ?? (coach.certifications[0] || "Focused tennis coaching for match-ready players.")}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-[var(--lobb-muted)]">
              <MapPin className="size-3.5 shrink-0 text-[var(--lobb-clay)]" />
              <span className="truncate">{locations.length ? locations.join(" · ") : "Location pending"}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-[family-name:var(--font-mono)] text-[18px] font-black text-[var(--lobb-black)]">
              {money(coach.hourly_rate_ngn)}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--lobb-muted)]">per hour</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[18px] border border-[var(--lobb-border)] bg-white/50">
          <MiniMetric icon={<Trophy className="size-3.5" />} label="Sessions" value={coach.session_count || "New"} />
          <MiniMetric icon={<ShieldCheck className="size-3.5" />} label="Reviews" value={coach.review_count || "New"} />
          <MiniMetric icon={<CalendarCheck className="size-3.5" />} label="Status" value={coach.has_availability ? "Open" : "Ask"} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            href={profileHref}
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-white/40 px-4 text-sm font-black text-[var(--lobb-black)] transition active:scale-[0.98]"
          >
            Profile
          </Link>
          <Link
            href={bookingHref}
            className="flex h-12 flex-[1.35] items-center justify-center gap-2 rounded-full bg-[var(--lobb-clay)] px-4 text-sm font-black text-white shadow-[0_12px_26px_rgba(196,98,45,0.22)] transition active:scale-[0.98]"
          >
            Book Now <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[primarySkill, experience].map((tag) => (
            <div key={tag} className="rounded-full bg-[var(--lobb-surface-2)] px-3 py-1.5 text-[11px] font-black text-[var(--lobb-muted)]">
              {tag}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function MiniMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="border-r border-[var(--lobb-border)] px-2.5 py-2.5 last:border-r-0">
      <p className="flex items-center gap-1 text-[12px] font-black text-[var(--lobb-black)]">
        <span className="text-[var(--lobb-clay)]">{icon}</span>
        <span className="truncate">{value}</span>
      </p>
      <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[var(--lobb-muted)]">{label}</p>
    </div>
  );
}
