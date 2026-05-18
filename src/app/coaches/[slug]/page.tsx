"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Heart, Play, Star } from "lucide-react";
import { getCoach, money } from "@/lib/mock-data";
import { LobbVerifiedBadge } from "@/components/lobb-badge";
import { LobbEmptyState } from "@/components/lobb-empty-state";
import { showLobbToast } from "@/components/lobb-global-state";

const days = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16", "Sat 17"];

function CoachProfileContent() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const coach = getCoach(params.slug);
  const availabilityRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<"about" | "availability" | "reviews">("about");
  const [selectedDay, setSelectedDay] = useState(search.get("date") || Object.keys(coach.slots)[0] || "Thu 15");
  const [selectedSlot, setSelectedSlot] = useState("");
  const slotTimedOut = search.get("timeout") === "slot";
  const reviewSamples = coach.reviews
    ? ["Great session. Emeka was patient with my kids and explained everything clearly.", "Very professional. Court access was confirmed before I arrived."]
    : [];

  const slots = useMemo(() => coach.slots[selectedDay] || [], [coach.slots, selectedDay]);

  useEffect(() => {
    if (slotTimedOut) {
      showLobbToast({ type: "warning", message: "Your slot timed out. Select a new time." });
    }
  }, [slotTimedOut]);

  const cta = () => {
    if (!selectedSlot) {
      setTab("availability");
      requestAnimationFrame(() => availabilityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }

    router.push(`/book/${coach.slug}/step-1?day=${encodeURIComponent(selectedDay)}&time=${encodeURIComponent(selectedSlot)}`);
  };

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] pb-32 text-[var(--lobb-black)]">
      <section className="relative px-5 pt-5">
        {slotTimedOut && (
          <div className="mb-4 flex items-start gap-2 rounded-[18px] border border-[#f0cbb6] bg-[#fff0e8] p-3 text-sm font-bold text-[var(--lobb-clay-dark)]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>Your slot timed out. Select a new time.</span>
          </div>
        )}
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_10px_24px_rgba(58,43,20,0.08)]">
            <ArrowLeft className="size-5" />
          </button>
          <button className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_10px_24px_rgba(58,43,20,0.08)]">
            <Heart className="size-5" />
          </button>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-[28px] bg-[var(--lobb-surface-2)] shadow-[0_18px_44px_rgba(58,43,20,0.12)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coach.video} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-black/5" />
          <button className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur">
            <Play className="size-8 fill-current" />
          </button>
        </div>
      </section>

      <section className="px-5 py-6">
        <div className="flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coach.photo} alt={coach.name} className="size-16 rounded-2xl border border-[var(--lobb-border)] object-cover" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">{coach.name}</h1>
              <LobbVerifiedBadge verified={coach.verified} size="large" />
            </div>
            <p className="text-sm font-medium text-[var(--lobb-muted)]">{coach.subtitle}</p>
            <p className="text-sm font-medium text-[var(--lobb-muted)]">{coach.years} Years Exp</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 font-black"><Star className="size-4 fill-[var(--lobb-clay)] text-[var(--lobb-clay)]" /> {coach.rating}</span>
          <span className="font-semibold text-[var(--lobb-muted)]">({coach.reviews} reviews)</span>
          <span className="font-black text-[var(--lobb-clay)]">{money(coach.rate / 1000)}k/hr</span>
        </div>
      </section>

      <section className="px-5">
        <div className="grid grid-cols-3 overflow-hidden rounded-[24px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] shadow-[0_12px_30px_rgba(58,43,20,0.06)]">
          {[
            [coach.sessions, "Sessions Completed"],
            [coach.years, "Years Exp"],
            [coach.rating, "Avg Rating"],
          ].map(([value, label], index) => (
            <div key={label} className={`p-4 text-center ${index ? "border-l border-[var(--lobb-border)]" : ""}`}>
              <p className="text-[22px] font-black">{value}</p>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-[var(--lobb-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 px-5 py-6 text-sm font-medium text-[var(--lobb-muted)]">
        <p className="font-semibold">📍 {coach.locations.join(" · ")}</p>
        <div className="flex flex-wrap gap-2">
          {coach.specializations.map((item) => (
            <span key={item} className="rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1 font-bold">🎾 {item}</span>
          ))}
        </div>
        <p className="rounded-2xl border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-3 font-bold text-[var(--lobb-green)]">🏛 Court access available</p>
      </section>

      <div className="sticky top-0 z-30 flex border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 px-5 backdrop-blur">
        {(["about", "availability", "reviews"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`flex-1 py-3 text-sm font-black capitalize ${tab === item ? "border-b-2 border-[var(--lobb-black)] text-[var(--lobb-black)]" : "text-[var(--lobb-muted)]"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "about" && (
        <section className="px-5 py-6">
          <h2 className="font-black">About {coach.name.split(" ")[0]}</h2>
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--lobb-muted)]">{coach.bio}</p>
          <button className="mt-1 text-sm font-black text-[var(--lobb-clay)]">See more</button>
          <h3 className="mt-6 font-black">Certifications</h3>
          <div className="mt-3 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-semibold shadow-[0_12px_30px_rgba(58,43,20,0.05)]">
            {coach.certifications.map((cert) => (
              <p key={cert} className="py-1"><span className="text-[var(--lobb-clay)]">✓</span> {cert}</p>
            ))}
          </div>
        </section>
      )}

      {tab === "availability" && (
        <section ref={availabilityRef} id="availability" className="px-5 py-6">
          <h2 className="font-black">Select a date</h2>
          <p className="mt-3 text-sm font-bold text-[var(--lobb-muted)]">‹ Mon 12 — Sun 18 May ›</p>
          <div className="mt-4 grid grid-cols-6 gap-1">
            {days.map((day) => {
              const available = Boolean(coach.slots[day]);
              const selected = selectedDay === day;
              return (
                <button
                  key={day}
                  disabled={!available}
                  onClick={() => {
                    setSelectedDay(day);
                    setSelectedSlot("");
                  }}
                  className={`rounded-2xl border py-2 text-xs font-semibold ${selected ? "border-[var(--lobb-black)] bg-[var(--lobb-black)] text-white" : available ? "border-[var(--lobb-border)] bg-[var(--lobb-surface)]" : "border-[var(--lobb-border)] bg-[var(--lobb-surface-2)] text-[#9b958a]"}`}
                >
                  <span className="block font-bold">{day.split(" ")[0]}</span>
                  {day.split(" ")[1]}
                </button>
              );
            })}
          </div>
          <h3 className="mt-6 font-black">{selectedDay}, May</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {slots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`h-12 rounded-full border text-sm font-black ${selectedSlot === slot ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay)] text-white" : "border-[var(--lobb-border)] bg-[var(--lobb-surface)]"}`}
              >
                {slot}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[11px] font-semibold text-[var(--lobb-muted)]">All times are Lagos time (WAT)</p>
        </section>
      )}

      {tab === "reviews" && (
        <section className="space-y-4 px-5 py-6">
          <h2 className="font-black">Reviews & Ratings</h2>
          {reviewSamples.length ? (
            <>
              <p className="text-4xl font-black">{coach.rating} <span className="text-[var(--lobb-clay)]">★★★★★</span> <span className="text-sm font-semibold text-[var(--lobb-muted)]">({coach.reviews} reviews)</span></p>
              {reviewSamples.map((review, index) => (
                <div key={review} className="rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_30px_rgba(58,43,20,0.05)]">
                  <p className="text-sm font-black">{index ? "Amara O." : "Tunde A."} <span className="text-[var(--lobb-clay)]">★★★★★</span></p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--lobb-muted)]">&quot;{review}&quot;</p>
                </div>
              ))}
              <button className="w-full py-3 text-sm font-black text-[var(--lobb-muted)]">Load more reviews</button>
            </>
          ) : (
            <LobbEmptyState
              title="No reviews yet"
              body="No reviews yet - be the first to book and leave one."
            />
          )}
        </section>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-5 py-4 shadow-[0_-18px_40px_rgba(58,43,20,0.12)]">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)]">Session rate</p>
          <p className="font-black">{money(coach.rate)} / session</p>
        </div>
        <button onClick={cta} className="rounded-full bg-[var(--lobb-clay)] px-5 py-3 text-sm font-black text-white">
          {selectedSlot ? `Book ${selectedSlot} ${selectedDay} →` : "Book Session"}
        </button>
      </div>
    </main>
  );
}

export default function CoachProfilePage() {
  return (
    <Suspense fallback={null}>
      <CoachProfileContent />
    </Suspense>
  );
}
