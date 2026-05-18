import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { type Coach, money } from "@/lib/mock-data";
import { LobbVerifiedBadge } from "@/components/lobb-badge";

/* ── Small card — horizontal scroll strip on home ── */
export function SmallCoachCard({ coach }: { coach: Coach }) {
  return (
    <Link
      href={`/coaches/${coach.slug}`}
      className="w-[168px] shrink-0 overflow-hidden rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_28px_rgba(13,13,13,0.07)] transition hover:shadow-[0_16px_36px_rgba(13,13,13,0.11)]"
    >
      <div className="relative h-[108px] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coach.photo} alt={coach.name} className="size-full object-cover" />
        <div className="absolute bottom-2 left-2">
          <LobbVerifiedBadge verified={coach.verified} size="small" />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1 text-[11px] font-bold text-[var(--lobb-black)]">
          <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
          {coach.rating}
          <span className="font-medium text-[var(--lobb-muted)]">· {coach.reviews}</span>
        </div>
        <h3 className="mt-1 truncate text-[13px] font-black text-[var(--lobb-black)]">{coach.name}</h3>
        <p className="truncate text-[11px] font-medium text-[var(--lobb-muted)]">
          {coach.specializations[0]} · {coach.locations[0]}
        </p>
        <p className="mt-2 font-[family-name:var(--font-mono)] text-[13px] font-bold text-[var(--lobb-clay)]">
          {money(coach.rate)}/hr
        </p>
      </div>
    </Link>
  );
}

/* ── Full list card — coaches browse page ── */
export function CoachListCard({ coach }: { coach: Coach }) {
  const days = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16", "Sat 17"];

  return (
    <article className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.06)] transition hover:shadow-[0_16px_36px_rgba(13,13,13,0.10)]">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coach.photo}
          alt={coach.name}
          className="size-[60px] shrink-0 rounded-[16px] object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-black text-[var(--lobb-black)]">{coach.name}</h2>
                <LobbVerifiedBadge verified={coach.verified} size="small" />
              </div>
              <p className="text-[12px] font-medium text-[var(--lobb-muted)]">{coach.subtitle}</p>
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
            <span className="font-black">{coach.rating}</span>
            <span className="font-medium text-[var(--lobb-muted)]">· {coach.sessions} sessions</span>
          </div>
        </div>
      </div>

      {/* Availability grid */}
      <div className="mt-4 border-t border-[var(--lobb-border)] pt-3">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--lobb-muted)]">
          {coach.weekendSlots || 2} slots available
        </p>
        <div className="grid grid-cols-6 gap-1">
          {days.map((day) => {
            const active = Boolean(coach.slots[day]);
            return (
              <Link
                key={day}
                href={`/coaches/${coach.slug}?date=${encodeURIComponent(day)}#availability`}
                className={`rounded-[10px] border py-1.5 text-center text-[10px] font-medium transition ${
                  active
                    ? "border-[var(--lobb-black)] bg-[var(--lobb-black)] text-white"
                    : "border-[var(--lobb-border)] bg-[var(--lobb-bg)] text-[var(--lobb-muted)]"
                }`}
              >
                <span className="block font-bold uppercase">{day.split(" ")[0]}</span>
                <span>{day.split(" ")[1]}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer: location + price + CTA */}
      <div className="mt-3 flex items-center justify-between border-t border-[var(--lobb-border)] pt-3">
        <div>
          <p className="max-w-[160px] truncate text-[11px] font-medium text-[var(--lobb-muted)]">
            {coach.locations.join(" · ")}
          </p>
          <p className="font-[family-name:var(--font-mono)] text-[14px] font-bold text-[var(--lobb-black)]">
            {money(coach.rate)}/hr
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
