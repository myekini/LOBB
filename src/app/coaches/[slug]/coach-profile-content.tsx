"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  MapPin,
  Play,
  ShieldCheck,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { LobbEmptyState } from "@/components/common/lobb-empty-state";
import { SkeletonBlock } from "@/components/common/lobb-skeleton";
import { showLobbToast } from "@/providers/lobb-global-state";
import type { AvailableSlot, CoachPublicProfile } from "@/lib/types";
import { LAGOS_COURTS } from "@/lib/types";
import { CoachShareSheet } from "@/features/coaches/coach-share-sheet";
import { PlayerHeader } from "@/components/layout/player-nav";

type Tab = "about" | "availability" | "reviews";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  player_first_name: string | null;
};

type SlotDay = {
  dateKey: string;
  weekday: string;
  day: string;
  month: string;
  slots: string[];
};

const COURT_ACCESS_LABELS: Record<string, string> = {
  coach_has_access: "Court access available",
  player_arranges: "Player arranges court",
  coach_can_recommend: "Can recommend nearby courts",
};

function money(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "LC";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function groupSlots(slots: AvailableSlot[]): SlotDay[] {
  const map = new Map<string, string[]>();

  for (const slot of slots) {
    const date = new Date(slot.slot_starts_at);
    const dateKey = date.toLocaleDateString("en-CA");
    const time = date.toLocaleTimeString("en-NG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    map.set(dateKey, [...(map.get(dateKey) ?? []), time]);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, times]) => {
      const date = new Date(`${dateKey}T00:00:00`);
      return {
        dateKey,
        weekday: date.toLocaleDateString("en-NG", { weekday: "short" }),
        day: date.toLocaleDateString("en-NG", { day: "2-digit" }),
        month: date.toLocaleDateString("en-NG", { month: "short" }),
        slots: times,
      };
    });
}

function fallbackBio(firstName: string) {
  return `${firstName} is still completing their public profile. Bookings will show verified details, availability, and reviews as they are added.`;
}

export function CoachProfileContent({
  coach,
  isPreview = false,
}: {
  coach: CoachPublicProfile;
  isPreview?: boolean;
}) {
  const search = useSearchParams();
  const [tab, setTab] = useState<Tab>("about");
  const [slots, setSlots] = useState<SlotDay[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(Boolean(coach.slug));
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const [origin, setOrigin] = useState("");
  const slotTimedOut = search.get("timeout") === "slot";

  const fullName = coach.full_name ?? "Coach";
  const firstName = fullName.split(" ")[0] || "Coach";
  const headline = coach.headline ?? "Tennis coach";
  const bio = coach.bio?.trim() || fallbackBio(firstName);
  const primaryLocation = coach.primary_location ?? "Lagos";
  const hourlyRate = coach.hourly_rate_ngn ?? 0;
  const serviceAreas = coach.service_areas ?? [];
  const specializations = coach.specializations ?? [];
  const certifications = coach.certifications ?? [];
  const skillLevels = coach.skill_levels ?? [];
  const languages = coach.languages ?? [];
  const rating = coach.avg_rating ?? null;
  const ratingLabel = rating != null ? rating.toFixed(1) : "New";
  const reviewCount = coach.review_count ?? reviews.length;
  const sessionCount = coach.session_count ?? 0;
  const courtLabel = COURT_ACCESS_LABELS[coach.court_access] ?? "Court details pending";
  const courtsWorkedWith = (coach.courts_worked_with ?? [])
    .map((id) => LAGOS_COURTS.find((c) => c.id === id))
    .filter(Boolean) as typeof LAGOS_COURTS;
  const locations = [primaryLocation, ...serviceAreas.filter((area) => area && area !== primaryLocation)];
  const selectedSlotDay = slots[selectedDay];
  const bookingHref = coach.slug ? `/book/${coach.slug}/step-1` : "#";
  const backHref = isPreview ? "/coach/profile" : "/coaches";
  const profilePath = coach.slug ? `/coaches/${coach.slug}` : "/coach/profile/preview";
  const profileUrl = origin ? `${origin}${profilePath}` : profilePath;
  const canSharePublicProfile = Boolean(coach.slug && origin);

  useEffect(() => {
    if (slotTimedOut) {
      showLobbToast({ type: "warning", message: "Your slot timed out. Select a new time." });
    }
  }, [slotTimedOut]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!coach.slug) {
      setSlotsLoading(false);
      return;
    }

    let cancelled = false;
    async function loadSlots() {
      try {
        const response = await fetch(`/api/coaches/${coach.slug}/slots`);
        if (!response.ok) throw new Error("Failed to load slots");
        const json = (await response.json()) as { slots: AvailableSlot[] };
        if (!cancelled) setSlots(groupSlots(json.slots ?? []));
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [coach.slug]);

  useEffect(() => {
    let cancelled = false;
    async function loadReviews() {
      try {
        const endpoint = isPreview
          ? `/api/reviews/coach/${coach.id}`
          : coach.slug
            ? `/api/coaches/${coach.slug}/reviews`
            : null;
        if (!endpoint) return;
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("Failed to load reviews");
        const json = (await response.json()) as { reviews: Review[] };
        if (!cancelled) setReviews(json.reviews ?? []);
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    }

    loadReviews();
    return () => {
      cancelled = true;
    };
  }, [coach.id, coach.slug, isPreview]);

  return (
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)] md:pb-0">
      {!isPreview && (
        <PlayerHeader
          active="coaches"
          title={fullName}
          backHref={backHref}
          eyebrow="Coach profile"
          actions={
            <CoachShareSheet
              coachName={fullName}
              disabled={!canSharePublicProfile}
              profileUrl={profileUrl}
              triggerLabel=""
              triggerClassName="inline-flex size-10 items-center justify-center rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]/35 disabled:opacity-45"
            />
          }
        />
      )}

      {isPreview && (
        <div className="sticky top-0 z-50 border-b border-white/10 bg-[var(--lobb-bg-inverse)] px-4 py-3 text-[var(--lobb-text-inverse)] shadow-[0_6px_18px_rgba(0,0,0,0.16)]">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/coach/profile"
                className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                aria-label="Back to coach profile"
              >
                <ArrowLeft className="size-4" />
              </Link>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">Player preview</p>
                <p className="truncate text-xs font-semibold text-white/75">This is the public booking page.</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link href="/coach/profile/edit" data-keep-light className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[12px] bg-white px-3 text-xs font-black text-[#0d0d0d]">
                <Pencil className="size-3.5 text-[var(--lobb-clay)]" />
                <span className="hidden sm:inline">Edit</span>
              </Link>
              {coach.slug && (
                <a
                  href={profilePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex size-10 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-white"
                  aria-label="Open live profile"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
              <CoachShareSheet
                coachName={fullName}
                disabled={!canSharePublicProfile}
                profileUrl={profileUrl}
                triggerLabel=""
                triggerClassName="inline-flex size-10 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-white disabled:opacity-45"
              />
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto grid max-w-[1280px] gap-6 md:grid-cols-12 md:px-6 md:py-8 lg:gap-8">
        <div className="md:col-span-7 lg:col-span-8">
          {/* ── Editorial hero ── */}
          <section className="relative h-[480px] overflow-hidden bg-[var(--lobb-bg-secondary)] sm:h-[540px] md:rounded-[18px]">
            {/* Fallback initial */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[120px] font-black leading-none text-[var(--lobb-text-tertiary)]/20 select-none">{initials(fullName)}</span>
            </div>
            {coach.profile_photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coach.profile_photo_url}
                alt={fullName}
                onError={(event) => { event.currentTarget.style.display = "none"; }}
                className="absolute inset-0 size-full object-cover object-top"
              />
            )}
            {/* Deep editorial gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" />

            {/* Demo video button */}
            {coach.demo_video_url && (
              <a
                href={coach.demo_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
                aria-label="Watch demo video"
              >
                <Play className="size-7 fill-current" />
              </a>
            )}

            {/* Identity overlay — bottom of hero */}
            <div className="absolute inset-x-0 bottom-0 px-5 pb-6 md:px-7">
              {slotTimedOut && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--lobb-warning)]/40 bg-black/40 px-3 py-2 text-xs font-bold text-amber-300 backdrop-blur-sm">
                  <AlertCircle className="size-3.5 shrink-0" />
                  Your previous slot timed out. Select a new time.
                </div>
              )}

              <div className="flex items-end justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {coach.is_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-white/90 backdrop-blur-sm">
                        <ShieldCheck className="size-3" />
                        Verified
                      </span>
                    )}
                    {coach.avg_rating != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black text-white/90 backdrop-blur-sm">
                        <Star className="size-3 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
                        {ratingLabel}
                        {reviewCount > 0 && <span className="ml-0.5 opacity-75">({reviewCount})</span>}
                      </span>
                    )}
                  </div>
                  <h1 className="mb-1 text-[28px] font-black leading-tight tracking-tight text-white sm:text-[34px]">
                    {fullName}
                  </h1>
                  <p className="text-[13px] font-semibold text-white/75">
                    {headline}
                    {coach.experience_years ? ` · ${coach.experience_years} yrs exp` : ""}
                  </p>
                </div>

                {/* Rate — desktop shows in sidebar, mobile shows here */}
                <div className="shrink-0 text-right md:hidden">
                  <span className="block text-[26px] font-black leading-none text-white">{money(hourlyRate)}</span>
                  <span className="text-[11px] font-semibold text-white/75">/hr</span>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="mt-4 flex items-center gap-4 border-t border-white/15 pt-4 text-[11px] font-semibold text-white/75">
                <span>{sessionCount > 0 ? `${sessionCount} sessions` : "New coach"}</span>
                {locations.length > 0 && (
                  <>
                    <span className="text-white/30">·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {locations[0]}
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="px-4 py-6 md:px-0">

            <div className="mb-6 space-y-4">
              {/* All locations — full list */}
              {locations.length > 1 && (
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--lobb-text-secondary)]">
                  <MapPin className="size-4 shrink-0 text-[var(--lobb-clay)]" />
                  <span>{locations.join(" · ")}</span>
                </div>
              )}

              {/* Specialization tags */}
              <div className="flex flex-wrap gap-2">
                {(specializations.length ? specializations : skillLevels).slice(0, 5).map((item) => (
                  <span
                    key={item}
                    className="inline-flex min-h-8 items-center rounded-full border border-[var(--lobb-border-subtle)] px-3.5 py-1 text-[12px] font-semibold leading-tight text-[var(--lobb-text-primary)]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              {courtsWorkedWith.length > 0 ? (
                <div className="lobb-app-panel border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] p-3">
                  <div className="mb-2 flex items-center gap-2 text-[var(--lobb-clay)]">
                    <Building2 className="size-4 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-[0.08em]">Courts I work with</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {courtsWorkedWith.map((court) => (
                      <span
                        key={court.id}
                        className="inline-flex items-center rounded-[10px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-3 py-1 text-xs font-semibold text-[var(--lobb-text-primary)]"
                      >
                        {court.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="lobb-app-panel flex items-center gap-2 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] p-3 text-[var(--lobb-text-primary)]">
                  <Building2 className="size-5 text-[var(--lobb-clay)]" />
                  <span className="text-sm font-semibold">{courtLabel}</span>
                </div>
              )}

              {languages.length > 0 && (
                <p className="text-sm font-medium text-[var(--lobb-text-secondary)]">Speaks: {languages.join(", ")}</p>
              )}
            </div>

            <div className="lobb-app-header sticky top-0 z-20 mb-6 flex border-b border-[var(--lobb-border-subtle)] md:top-16">
              {(["about", "availability", "reviews"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`min-h-11 flex-1 border-b-2 py-3 text-center text-sm font-semibold capitalize transition ${
                    tab === item
                      ? "border-[var(--lobb-text-primary)] text-[var(--lobb-text-primary)]"
                      : "border-transparent text-[var(--lobb-text-secondary)] hover:text-[var(--lobb-text-primary)]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {tab === "about" && (
              <section className="space-y-6">
                <div>
                  <h2 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--lobb-text-primary)]">Biography</h2>
                  <p className="text-base leading-7 text-[var(--lobb-text-secondary)]">{bio}</p>
                </div>

                <div>
                  <h3 className="mb-3 text-2xl font-semibold tracking-tight text-[var(--lobb-text-primary)]">Credentials</h3>
                  {certifications.length > 0 ? (
                    <ul className="divide-y divide-[var(--lobb-border-subtle)] border-y border-[var(--lobb-border-subtle)]">
                      {certifications.map((cert) => (
                        <li key={cert} className="group min-h-[76px] py-3 transition">
                          <div className="flex items-center gap-3">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay)]">
                            <ShieldCheck className="size-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-bold text-[var(--lobb-text-tertiary)]">Verified credential</span>
                            <span className="mt-1 block text-sm font-black leading-snug text-[var(--lobb-text-primary)]">{cert}</span>
                          </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium text-[var(--lobb-text-secondary)]">Certifications will appear here once added.</p>
                  )}
                </div>

                {skillLevels.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-2xl font-semibold tracking-tight text-[var(--lobb-text-primary)]">Who I Coach</h3>
                    <div className="flex flex-wrap gap-2">
                      {skillLevels.map((level) => (
                        <span key={level} className="inline-flex min-h-9 items-center rounded-full border border-[var(--lobb-border-subtle)] px-3.5 py-1.5 text-sm font-semibold leading-tight">
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs font-semibold text-[var(--lobb-text-tertiary)]">
                  Member since {formatDate(coach.created_at)}
                </p>
              </section>
            )}

            {tab === "availability" && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--lobb-text-primary)]">
                    {selectedSlotDay ? `${selectedSlotDay.month} ${selectedSlotDay.day}` : "Availability"}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDay((value) => Math.max(value - 1, 0))}
                      className="flex size-8 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)]"
                      aria-label="Previous day"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDay((value) => Math.min(value + 1, Math.max(slots.length - 1, 0)))}
                      className="flex size-8 items-center justify-center rounded-full border border-[var(--lobb-border-subtle)]"
                      aria-label="Next day"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                {slotsLoading ? (
                  <div className="space-y-4">
                    <div className="flex gap-2 overflow-hidden">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <SkeletonBlock key={index} className="h-20 min-w-[60px] rounded-xl" />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <SkeletonBlock key={index} className="h-12 rounded-lg" />
                      ))}
                    </div>
                  </div>
                ) : slots.length > 0 ? (
                  <>
                    <div className="mb-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {slots.map((day, index) => (
                        <button
                          key={day.dateKey}
                          type="button"
                          onClick={() => setSelectedDay(index)}
                          className={`flex min-w-[60px] shrink-0 flex-col items-center rounded-[12px] p-3 transition ${
                            selectedDay === index
                              ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]"
                              : "bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-primary)] hover:bg-[var(--lobb-bg-elevated)]"
                          }`}
                        >
                          <span className="text-xs font-bold uppercase opacity-70">{day.weekday}</span>
                          <span className="text-2xl font-semibold">{day.day}</span>
                        </button>
                      ))}
                    </div>

                    <h3 className="mb-3 text-sm font-semibold text-[var(--lobb-text-secondary)]">Available slots</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedSlotDay.slots.map((slot) => (
                        <a
                          key={slot}
                          href={isPreview ? undefined : bookingHref}
                          className="min-h-11 rounded-[12px] border border-[var(--lobb-border-subtle)] px-4 py-3 text-center text-sm font-semibold text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]"
                        >
                          {slot}
                        </a>
                      ))}
                    </div>
                  </>
                ) : (
                  <LobbEmptyState
                    title="No open slots yet"
                    body="This coach has not published available slots for the next 14 days."
                  />
                )}
              </section>
            )}

            {tab === "reviews" && (
              <section>
                <div className="mb-6 flex items-center gap-4">
                  <div className="text-5xl font-black leading-none text-[var(--lobb-text-primary)]">{ratingLabel}</div>
                  <div>
                    <div className="mb-1 flex text-[var(--lobb-clay)]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`size-5 ${rating && index < Math.round(rating) ? "fill-current" : ""}`}
                        />
                      ))}
                    </div>
                    <div className="text-sm font-semibold text-[var(--lobb-text-secondary)]">
                      Based on {reviewCount} reviews
                    </div>
                  </div>
                </div>

                {reviewsLoading ? (
                  <div className="space-y-5">
                    {Array.from({ length: 2 }).map((_, index) => (
                      <SkeletonBlock key={index} className="h-24 rounded-xl" />
                    ))}
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.slice(0, 6).map((review) => (
                      <article key={review.id} className="border-b border-[var(--lobb-border-subtle)] pb-6">
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--lobb-bg-secondary)] text-sm font-black">
                              {initials(review.player_first_name ?? "Player")}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--lobb-text-primary)]">
                                {review.player_first_name ?? "Player"}
                              </p>
                              <p className="text-xs font-semibold text-[var(--lobb-text-tertiary)]">{formatDate(review.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 text-[var(--lobb-clay)]">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                className={`size-4 ${index < review.rating ? "fill-current" : ""}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-base leading-7 text-[var(--lobb-text-secondary)]">
                          {review.comment ?? "Great coaching session."}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <LobbEmptyState
                    title="No reviews yet"
                    body="Reviews will appear here after completed sessions."
                  />
                )}
              </section>
            )}
          </section>
        </div>

        <aside className="hidden md:col-span-5 md:block lg:col-span-4">
          <div className="lobb-app-card sticky top-24 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-6 shadow-[var(--lobb-shadow-card)]">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="font-mono text-3xl font-black tracking-tight text-[var(--lobb-clay)]">{money(hourlyRate)}</div>
                <div className="text-sm font-medium text-[var(--lobb-text-secondary)]">per hour session</div>
              </div>
              {!isPreview && (
                <CoachShareSheet
                  coachName={fullName}
                  disabled={!canSharePublicProfile}
                  profileUrl={profileUrl}
                  triggerClassName="flex size-10 items-center justify-center rounded-full transition hover:bg-[var(--lobb-bg-secondary)] disabled:opacity-45"
                  triggerLabel=""
                />
              )}
            </div>

            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-3">
                <Zap className="size-5 text-[var(--lobb-clay)]" />
                <span className="text-sm font-semibold">Instant booking confirmation</span>
              </div>
              <div className="flex items-center gap-3">
                <CalendarCheck className="size-5 text-[var(--lobb-clay)]" />
                <span className="text-sm font-semibold">Free cancellation 24h prior</span>
              </div>
            </div>

            {certifications.length > 0 && (
              <div className="lobb-app-panel mb-6 border border-[var(--lobb-clay)]/25 bg-[var(--lobb-clay-light)] p-4">
                <div className="mb-3 flex items-center gap-2 text-[var(--lobb-clay)]">
                  <Trophy className="size-4" />
                  <p className="text-xs font-black uppercase tracking-[0.12em]">Credentials</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {certifications.slice(0, 3).map((cert) => (
                    <span key={cert} className="inline-flex min-h-8 items-center rounded-full bg-[var(--lobb-bg-elevated)] px-3 py-1 text-xs font-black leading-tight text-[var(--lobb-clay)] shadow-sm ring-1 ring-[var(--lobb-clay)]/20">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isPreview ? (
              <Link
                href="/coach/profile"
                className="flex min-h-11 w-full items-center justify-center rounded-[12px] bg-[var(--lobb-bg-inverse)] py-4 text-sm font-black text-[var(--lobb-text-inverse)]"
              >
                Back to profile
              </Link>
            ) : (
              <a
                href={bookingHref}
                className="flex min-h-11 w-full items-center justify-center rounded-[12px] bg-[var(--lobb-bg-inverse)] py-4 text-sm font-black text-[var(--lobb-text-inverse)] transition hover:bg-[var(--lobb-clay-dark)]"
              >
                Book session
              </a>
            )}
          </div>
        </aside>
      </section>

      <div className="lobb-app-header fixed bottom-0 left-0 z-50 flex w-full items-center justify-between border-t border-[var(--lobb-border-subtle)] p-4 shadow-[var(--lobb-shadow-sheet)] md:hidden">
        <div>
          <div className="font-mono text-xl font-black text-[var(--lobb-clay)]">{money(hourlyRate)}</div>
          <div className="text-xs font-semibold text-[var(--lobb-text-secondary)]">per session</div>
        </div>
        {isPreview ? (
          <Link
            href="/coach/profile"
            className="flex min-h-11 items-center rounded-[12px] bg-[var(--lobb-bg-inverse)] px-8 py-3 text-sm font-black text-[var(--lobb-text-inverse)]"
          >
            Back
          </Link>
        ) : (
          <a
            href={bookingHref}
            className="flex min-h-11 items-center rounded-[12px] bg-[var(--lobb-bg-inverse)] px-8 py-3 text-sm font-black text-[var(--lobb-text-inverse)]"
          >
            Book session
          </a>
        )}
      </div>
    </main>
  );
}

