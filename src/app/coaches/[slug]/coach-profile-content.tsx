"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Copy,
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
import { CoachShareSheet } from "@/features/coaches/coach-share-sheet";

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
  const locations = [primaryLocation, ...serviceAreas.filter((area) => area && area !== primaryLocation)];
  const selectedSlotDay = slots[selectedDay];
  const bookingHref = coach.slug ? `/book/${coach.slug}/step-1` : "#";
  const profilePath = coach.slug ? `/coaches/${coach.slug}` : "/coach/profile/preview";
  const profileUrl = origin ? `${origin}${profilePath}` : profilePath;
  const canSharePublicProfile = Boolean(coach.slug && origin);

  const heroStyle = useMemo(
    () =>
      coach.profile_photo_url
        ? { backgroundImage: `url(${coach.profile_photo_url})` }
        : undefined,
    [coach.profile_photo_url],
  );

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
    <main className="min-h-screen bg-[#f9f9f9] pb-28 text-[#1a1c1c] md:pb-0">
      <nav className="sticky top-0 z-40 hidden h-16 border-b border-[#c4c7c7] bg-[#f9f9f9] md:block">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/coaches"
              className="flex size-10 items-center justify-center rounded-full transition hover:bg-[#e2e2e2]"
              aria-label="Go back"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <span className="text-2xl font-black tracking-tight">LOBB</span>
          </div>
          <div className="flex items-center gap-3">
            <CoachShareSheet
              coachName={fullName}
              disabled={!canSharePublicProfile}
              profileUrl={profileUrl}
              triggerClassName="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#d8d2c9] bg-white px-4 text-xs font-black text-[#1a1c1c] transition hover:border-[#9c440f]/35 disabled:opacity-45"
            />
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full transition hover:bg-[#e2e2e2]"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
            </button>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-full transition hover:bg-[#e2e2e2]"
              aria-label="Profile"
            >
              <CircleUserRound className="size-5" />
            </button>
          </div>
        </div>
      </nav>

      {isPreview && (
        <div className="border-b border-[#c4c7c7] bg-white px-4 py-3">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.08em] text-[#9c440f]">Preview mode</p>
              <p className="mt-1 text-sm font-semibold text-[#6b6560]">
                {coach.slug ? "This is the profile players can book and share." : "Add a public slug before sharing this profile."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/coach/profile/edit" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#1a1c1c] px-4 text-xs font-black text-white">
                <Pencil className="size-4 text-[#d96b27]" />
                Edit profile
              </Link>
              <CoachShareSheet
                coachName={fullName}
                disabled={!canSharePublicProfile}
                profileUrl={profileUrl}
                triggerClassName="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#d8d2c9] bg-white px-4 text-xs font-black text-[#1a1c1c] disabled:opacity-45"
              />
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto grid max-w-[1280px] gap-6 md:grid-cols-12 md:px-6 md:py-8 lg:gap-8">
        <div className="md:col-span-7 lg:col-span-8">
          <section className="relative aspect-[4/3] overflow-hidden bg-[#e2e2e2] sm:aspect-video md:rounded-2xl">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={heroStyle}
              aria-hidden="true"
            />
            {!coach.profile_photo_url && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#e8e8e8]">
                <span className="text-6xl font-black text-[#858383]">{initials(fullName)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-black/20" />
            <div className="absolute left-0 top-0 z-10 flex w-full items-center justify-between p-4 md:hidden">
              <Link
                href="/coaches"
                className="flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur"
                aria-label="Go back"
              >
                <ArrowLeft className="size-5" />
              </Link>
              <CoachShareSheet
                coachName={fullName}
                disabled={!canSharePublicProfile}
                profileUrl={profileUrl}
                triggerClassName="flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur disabled:opacity-45"
                triggerLabel=""
              />
            </div>
            {coach.demo_video_url && (
              <a
                href={coach.demo_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white backdrop-blur"
                aria-label="Watch demo video"
              >
                <Play className="size-7 fill-current" />
              </a>
            )}
          </section>

          <section className="bg-[#f9f9f9] px-4 py-6 md:px-0">
            {slotTimedOut && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-[#ffb693] bg-[#ffdbcc] p-3 text-sm font-bold text-[#6e2a00]">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>Your previous slot timed out. Select a new time.</span>
              </div>
            )}

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="size-20 shrink-0 overflow-hidden rounded-[24px] border border-[#d8d2c9] bg-[#eeeeee] shadow-sm sm:size-16 sm:rounded-full">
                {coach.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coach.profile_photo_url} alt={fullName} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-lg font-black text-[#858383]">
                    {initials(fullName)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h1 className="text-[24px] font-black leading-tight text-[#1a1c1c] sm:text-[18px]">{fullName}</h1>
                  {coach.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#9c440f]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#9c440f]">
                      <ShieldCheck className="size-3" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="mb-2 text-sm font-medium text-[#444748]">
                  {headline}
                  {coach.experience_years ? ` • ${coach.experience_years} Years Exp` : ""}
                </p>
                <div className="mb-1 flex items-center gap-1 text-sm">
                  <Star className="size-4 fill-[#9c440f] text-[#9c440f]" />
                  <span className="font-black">{ratingLabel}</span>
                  <span className="text-[#444748]">({reviewCount} reviews)</span>
                </div>
                <div className="mt-2 md:hidden">
                  <span className="font-mono text-2xl font-black text-[#9c440f]">{money(hourlyRate)}</span>
                  <span className="text-sm font-medium text-[#444748]">/hr</span>
                </div>
                {coach.slug && (
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(profileUrl);
                      showLobbToast({ type: "success", message: "Profile link copied" });
                    }}
                    className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-[#d8d2c9] bg-white px-3 text-xs font-black text-[#1a1c1c] md:hidden"
                  >
                    <Copy className="size-3.5 text-[#9c440f]" />
                    Copy profile link
                  </button>
                )}
              </div>
            </div>

            <div className="mb-8 grid grid-cols-3 gap-2 rounded-2xl border border-[#ded9d1] bg-white p-2 shadow-sm sm:gap-4 sm:p-4">
              <StatBlock value={sessionCount || "New"} label="Sessions" />
              <StatBlock value={coach.experience_years || "New"} label="Years Exp" bordered />
              <StatBlock value={ratingLabel} label="Rating" />
            </div>

            <div className="mb-8 space-y-4">
              <div className="flex items-center gap-2 text-[#1a1c1c]">
                <MapPin className="size-5 text-[#444748]" />
                <span className="text-sm font-semibold">{locations.length ? locations.join(" • ") : "Lagos"}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {(specializations.length ? specializations : skillLevels).slice(0, 5).map((item) => (
                  <span
                    key={item}
                    className="inline-flex min-h-9 items-center rounded-full bg-[#e8e1d8] px-3.5 py-1.5 text-sm font-semibold leading-tight text-[#1a1c1c]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-[#c4c7c7]/30 bg-[#f3f3f3] p-3 text-[#1a1c1c]">
                <Building2 className="size-5 text-[#9c440f]" />
                <span className="text-sm font-semibold">{courtLabel}</span>
              </div>

              {languages.length > 0 && (
                <p className="text-sm font-medium text-[#444748]">Speaks: {languages.join(", ")}</p>
              )}
            </div>

            <div className="sticky top-0 z-20 mb-6 flex border-b border-[#c4c7c7] bg-[#f9f9f9] md:top-16">
              {(["about", "availability", "reviews"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`min-h-11 flex-1 border-b-2 py-3 text-center text-sm font-semibold capitalize transition ${
                    tab === item
                      ? "border-black text-[#1a1c1c]"
                      : "border-transparent text-[#444748] hover:text-[#1a1c1c]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {tab === "about" && (
              <section className="space-y-6">
                <div>
                  <h2 className="mb-2 text-2xl font-semibold tracking-tight text-[#1a1c1c]">Biography</h2>
                  <p className="text-base leading-7 text-[#444748]">{bio}</p>
                </div>

                <div>
                  <h3 className="mb-3 text-2xl font-semibold tracking-tight text-[#1a1c1c]">Credentials</h3>
                  {certifications.length > 0 ? (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {certifications.map((cert) => (
                        <li key={cert} className="group relative min-h-[86px] overflow-hidden rounded-[22px] border border-[#ded9d1] bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9c440f]/35 hover:shadow-md">
                          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#9c440f,#f4a228)]" />
                          <div className="flex items-center gap-3">
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-[#9c440f]/10 text-[#9c440f] ring-1 ring-[#9c440f]/10">
                            <ShieldCheck className="size-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#9c440f]">Credential</span>
                            <span className="mt-1 block text-sm font-black leading-snug text-[#1a1c1c]">{cert}</span>
                          </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium text-[#444748]">Certifications will appear here once added.</p>
                  )}
                </div>

                {skillLevels.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-2xl font-semibold tracking-tight text-[#1a1c1c]">Who I Coach</h3>
                    <div className="flex flex-wrap gap-2">
                      {skillLevels.map((level) => (
                        <span key={level} className="inline-flex min-h-9 items-center rounded-full border border-[#c4c7c7] px-3.5 py-1.5 text-sm font-semibold leading-tight">
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs font-semibold text-[#747878]">
                  Member since {formatDate(coach.created_at)}
                </p>
              </section>
            )}

            {tab === "availability" && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold tracking-tight text-[#1a1c1c]">
                    {selectedSlotDay ? `${selectedSlotDay.month} ${selectedSlotDay.day}` : "Availability"}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDay((value) => Math.max(value - 1, 0))}
                      className="flex size-8 items-center justify-center rounded-full border border-[#c4c7c7]"
                      aria-label="Previous day"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDay((value) => Math.min(value + 1, Math.max(slots.length - 1, 0)))}
                      className="flex size-8 items-center justify-center rounded-full border border-[#c4c7c7]"
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
                          className={`flex min-w-[60px] shrink-0 flex-col items-center rounded-xl p-3 transition ${
                            selectedDay === index
                              ? "bg-black text-white"
                              : "bg-[#e8e8e8] text-[#1a1c1c] hover:bg-[#e2e2e2]"
                          }`}
                        >
                          <span className="text-xs font-bold uppercase opacity-70">{day.weekday}</span>
                          <span className="text-2xl font-semibold">{day.day}</span>
                        </button>
                      ))}
                    </div>

                    <h3 className="mb-3 text-sm font-semibold text-[#444748]">Available Slots</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedSlotDay.slots.map((slot) => (
                        <a
                          key={slot}
                          href={isPreview ? undefined : bookingHref}
                          className="min-h-11 rounded-lg border border-[#c4c7c7] px-4 py-3 text-center text-sm font-semibold text-[#1a1c1c] transition hover:border-black"
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
                  <div className="text-5xl font-black leading-none text-[#1a1c1c]">{ratingLabel}</div>
                  <div>
                    <div className="mb-1 flex text-[#9c440f]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`size-5 ${rating && index < Math.round(rating) ? "fill-current" : ""}`}
                        />
                      ))}
                    </div>
                    <div className="text-sm font-semibold text-[#444748]">
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
                      <article key={review.id} className="border-b border-[#c4c7c7]/30 pb-6">
                        <div className="mb-2 flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8e8e8] text-sm font-black">
                              {initials(review.player_first_name ?? "Player")}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#1a1c1c]">
                                {review.player_first_name ?? "Player"}
                              </p>
                              <p className="text-xs font-semibold text-[#747878]">{formatDate(review.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 text-[#9c440f]">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                className={`size-4 ${index < review.rating ? "fill-current" : ""}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-base leading-7 text-[#444748]">
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
          <div className="sticky top-24 rounded-2xl border border-[#d8d2c9] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <div className="font-mono text-3xl font-black tracking-tight text-[#9c440f]">{money(hourlyRate)}</div>
                <div className="text-sm font-medium text-[#444748]">per hour session</div>
              </div>
              <CoachShareSheet
                coachName={fullName}
                disabled={!canSharePublicProfile}
                profileUrl={profileUrl}
                triggerClassName="flex size-10 items-center justify-center rounded-full transition hover:bg-[#e2e2e2] disabled:opacity-45"
                triggerLabel=""
              />
            </div>

            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-3">
                <Zap className="size-5 text-[#9c440f]" />
                <span className="text-sm font-semibold">Instant booking confirmation</span>
              </div>
              <div className="flex items-center gap-3">
                <CalendarCheck className="size-5 text-[#9c440f]" />
                <span className="text-sm font-semibold">Free cancellation 24h prior</span>
              </div>
            </div>

            {certifications.length > 0 && (
              <div className="mb-6 rounded-2xl border border-[#ead7c6] bg-[#fff8f2] p-4">
                <div className="mb-3 flex items-center gap-2 text-[#9c440f]">
                  <Trophy className="size-4" />
                  <p className="text-xs font-black uppercase tracking-[0.12em]">Credentials</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {certifications.slice(0, 3).map((cert) => (
                    <span key={cert} className="inline-flex min-h-8 items-center rounded-full bg-white px-3 py-1 text-xs font-black leading-tight text-[#6e2a00] shadow-sm ring-1 ring-[#ead7c6]">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isPreview ? (
              <button
                type="button"
                disabled
                className="min-h-11 w-full rounded-[14px] bg-[#9c440f] py-4 text-sm font-black text-white opacity-70"
              >
                Preview only
              </button>
            ) : (
              <a
                href={bookingHref}
                className="flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#9c440f] py-4 text-sm font-black text-white transition hover:bg-[#7a3000]"
              >
                Book Session
              </a>
            )}
          </div>
        </aside>
      </section>

      <div className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-between border-t border-[#c4c7c7]/30 bg-white p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden">
        <div>
          <div className="font-mono text-xl font-black text-[#9c440f]">{money(hourlyRate)}</div>
          <div className="text-xs font-semibold text-[#444748]">per session</div>
        </div>
        {isPreview ? (
          <button
            type="button"
            disabled
            className="min-h-11 rounded-[14px] bg-[#9c440f] px-8 py-3 text-sm font-black text-white opacity-70"
          >
            Preview
          </button>
        ) : (
          <a
            href={bookingHref}
            className="flex min-h-11 items-center rounded-[14px] bg-[#9c440f] px-8 py-3 text-sm font-black text-white"
          >
            Book Session
          </a>
        )}
      </div>
    </main>
  );
}

function StatBlock({
  value,
  label,
  bordered = false,
}: {
  value: string | number;
  label: string;
  bordered?: boolean;
}) {
  return (
    <div className={`text-center ${bordered ? "border-x border-[#c4c7c7]/30" : ""}`}>
      <div className="text-2xl font-semibold tracking-tight text-[#1a1c1c]">{value}</div>
      <div className="text-xs font-bold uppercase tracking-[0.05em] text-[#444748]">{label}</div>
    </div>
  );
}
