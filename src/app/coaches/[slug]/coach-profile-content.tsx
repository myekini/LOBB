"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Heart, MapPin, Play, Star } from "lucide-react";
import { LobbVerifiedBadge } from "@/components/lobb-badge";
import { LobbEmptyState } from "@/components/lobb-empty-state";
import { showLobbToast } from "@/components/lobb-global-state";
import { AvailabilityCalendar } from "@/components/availability-calendar";
import type { CoachPublicProfile } from "@/lib/types";

const COURT_ACCESS_LABELS: Record<string, string> = {
  coach_has_access: "Coach has court access",
  player_arranges: "Player arranges court",
  coach_can_recommend: "Coach can recommend courts nearby",
};

function money(value: number) {
  return `₦${value.toLocaleString()}`;
}

export function CoachProfileContent({
  coach,
  isPreview = false,
}: {
  coach: CoachPublicProfile;
  isPreview?: boolean;
}) {
  const search = useSearchParams();
  const router = useRouter();
  const availabilityRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<"about" | "availability" | "reviews">("about");
  const slotTimedOut = search.get("timeout") === "slot";

  useEffect(() => {
    if (slotTimedOut) {
      showLobbToast({ type: "warning", message: "Your slot timed out. Select a new time." });
    }
  }, [slotTimedOut]);

  const courtLabel = COURT_ACCESS_LABELS[coach.court_access] ?? "Court details TBD";
  const fullName = coach.full_name ?? "Coach";
  const firstName = fullName.split(" ")[0] || "Coach";
  const bio = coach.bio ?? "This coach is still completing their profile.";
  const primaryLocation = coach.primary_location ?? "Lagos";
  const hourlyRate = coach.hourly_rate_ngn ?? 0;
  const serviceAreas = coach.service_areas ?? [];
  const specializations = coach.specializations ?? [];
  const certifications = coach.certifications ?? [];
  const skillLevels = coach.skill_levels ?? [];
  const languages = coach.languages ?? [];
  const locations = [
    primaryLocation,
    ...serviceAreas.filter((area) => area && area !== primaryLocation),
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] pb-32 text-[var(--lobb-black)]">
      {isPreview && (
        <section className="sticky top-0 z-50 border-b border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-5 py-3 text-center text-sm font-black text-[var(--lobb-clay)] shadow-[0_10px_24px_rgba(58,43,20,0.08)]">
          Profile preview
        </section>
      )}
      {/* Header */}
      <section className="relative px-5 pt-5">
        {slotTimedOut && (
          <div className="mb-4 flex items-start gap-2 rounded-[18px] border border-[#f0cbb6] bg-[#fff0e8] p-3 text-sm font-bold text-[var(--lobb-clay-dark)]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>Your slot timed out. Select a new time.</span>
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_10px_24px_rgba(58,43,20,0.08)]"
          >
            <ArrowLeft className="size-5" />
          </button>
          <button className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_10px_24px_rgba(58,43,20,0.08)]">
            <Heart className="size-5" />
          </button>
        </div>

        {/* Demo video / hero */}
        <div className="relative aspect-video overflow-hidden rounded-[28px] bg-[var(--lobb-surface-2)] shadow-[0_18px_44px_rgba(58,43,20,0.12)]">
          {coach.profile_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coach.profile_photo_url} alt="" className="size-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-black/5" />
          {coach.demo_video_url && (
            <a
              href={coach.demo_video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur"
              aria-label="Watch demo video"
            >
              <Play className="size-8 fill-current" />
            </a>
          )}
        </div>
      </section>

      {/* Coach identity */}
      <section className="px-5 py-6">
        <div className="flex gap-3">
          <div className="size-16 overflow-hidden rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface-2)]">
            {coach.profile_photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coach.profile_photo_url}
                alt={fullName}
                className="size-full object-cover"
              />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">{fullName}</h1>
              <LobbVerifiedBadge verified={coach.is_verified} size="large" />
            </div>
            <p className="text-sm font-medium text-[var(--lobb-muted)]">
              {coach.headline ?? certifications[0] ?? "Tennis coach"}
            </p>
            <p className="text-sm font-medium text-[var(--lobb-muted)]">
              {coach.experience_years} Years Exp
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 font-black">
            <Star className="size-4 fill-[var(--lobb-clay)] text-[var(--lobb-clay)]" />
            {coach.avg_rating != null ? coach.avg_rating : "New"}
          </span>
          <span className="font-semibold text-[var(--lobb-muted)]">
            ({coach.review_count} reviews)
          </span>
          <span className="font-black text-[var(--lobb-clay)]">
            {money(hourlyRate)}/hr
          </span>
        </div>
      </section>

      {/* Summary stats */}
      <section className="px-5">
        <div className="grid grid-cols-3 overflow-hidden rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_30px_rgba(58,43,20,0.06)]">
          {[
            [coach.session_count, "Sessions Completed"],
            [coach.experience_years, "Years Exp"],
            [coach.avg_rating != null ? coach.avg_rating : "–", "Avg Rating"],
          ].map(([value, label], index) => (
            <div
              key={String(label)}
              className={`p-4 text-center ${index ? "border-l border-[var(--lobb-border)]" : ""}`}
            >
              <p className="text-[22px] font-black">{value}</p>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-[var(--lobb-muted)]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick-scan info strip */}
      <section className="space-y-4 px-5 py-6 text-sm font-medium text-[var(--lobb-muted)]">
        <p className="font-semibold">📍 {locations.join(" · ")}</p>
        {specializations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {specializations.map((item) => (
              <span
                key={item}
                className="rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1 font-bold"
              >
                🎾 {item}
              </span>
            ))}
          </div>
        )}
        <p className="rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-3 font-bold">
          🏛 {courtLabel}
        </p>
        {languages.length > 0 && (
          <p>🗣 Speaks: {languages.join(", ")}</p>
        )}
      </section>

      {/* Tab navigation */}
      <div className="sticky top-0 z-30 flex border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 px-5 backdrop-blur">
        {(["about", "availability", "reviews"] as const).map((item) => (
          <button
            key={item}
            onClick={() => {
              setTab(item);
              if (item === "availability") {
                requestAnimationFrame(() =>
                  availabilityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                );
              }
            }}
            className={`flex-1 py-3 text-sm font-black capitalize ${
              tab === item
                ? "border-b-2 border-[var(--lobb-black)] text-[var(--lobb-black)]"
                : "text-[var(--lobb-muted)]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* About tab */}
      {tab === "about" && (
        <section className="px-5 py-6">
          <h2 className="font-black">About {firstName}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--lobb-muted)]">{bio}</p>

          {certifications.length > 0 && (
            <>
              <h3 className="mt-6 font-black">Certifications</h3>
              <div className="mt-3 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-semibold shadow-[0_12px_30px_rgba(58,43,20,0.05)]">
                {certifications.map((cert) => (
                  <p key={cert} className="py-1">
                    <span className="text-[var(--lobb-clay)]">✓</span> {cert}
                  </p>
                ))}
              </div>
            </>
          )}

          {skillLevels.length > 0 && (
            <>
              <h3 className="mt-6 font-black">Who I coach</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {skillLevels.map((level) => (
                  <span
                    key={level}
                    className="rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1 text-sm font-bold text-[var(--lobb-muted)]"
                  >
                    {level}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="mt-6 flex items-start gap-3 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
            <div>
              <p className="font-black">{primaryLocation}</p>
              <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">
                Primary coaching area
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold text-[var(--lobb-muted)]">
            Member since {new Date(coach.created_at).toLocaleDateString("en-NG", { month: "long", year: "numeric" })}
          </p>
        </section>
      )}

      {/* Availability tab */}
      {tab === "availability" && (
        <section ref={availabilityRef} id="availability" className="px-5 py-6">
          <h2 className="mb-5 font-black">Availability</h2>
          {coach.slug ? (
            <AvailabilityCalendar slug={coach.slug} />
          ) : (
            <LobbEmptyState
              title="Availability preview unavailable"
              body="Add a profile slug before previewing bookable slots."
            />
          )}
        </section>
      )}

      {/* Reviews tab */}
      {tab === "reviews" && (
        <section className="space-y-4 px-5 py-6">
          <h2 className="font-black">Reviews &amp; Ratings</h2>
          {coach.review_count > 0 ? (
            <p className="text-4xl font-black">
              {coach.avg_rating}{" "}
              <span className="text-[var(--lobb-clay)]">★★★★★</span>{" "}
              <span className="text-sm font-semibold text-[var(--lobb-muted)]">
                ({coach.review_count} reviews)
              </span>
            </p>
          ) : (
            <LobbEmptyState
              title="No reviews yet"
              body="Be the first to book a session and leave a review."
            />
          )}
        </section>
      )}

      {/* Sticky booking CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-5 py-4 shadow-[0_-18px_40px_rgba(58,43,20,0.12)]">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)]">
            Session rate
          </p>
          <p className="font-black">{money(hourlyRate)} / hr</p>
        </div>
        {isPreview ? (
          <button
            type="button"
            disabled
            className="rounded-full bg-[var(--lobb-clay)] px-5 py-3 text-sm font-black text-white opacity-70"
          >
            Preview only
          </button>
        ) : (
          <a
            href={`/book/${coach.slug}/step-1`}
            className="rounded-full bg-[var(--lobb-clay)] px-5 py-3 text-sm font-black text-white"
          >
            Book Session →
          </a>
        )}
      </div>
    </main>
  );
}
