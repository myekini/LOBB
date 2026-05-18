"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { showLobbToast } from "@/components/lobb-global-state";
import { getBookingDay, getCoach, getPlayerBooking } from "@/lib/mock-data";

export default function LeaveReviewPage() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const booking = getPlayerBooking(params.bookingId);
  const coach = getCoach(booking.coachSlug);
  const day = getBookingDay(booking.day);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const submit = () => {
    if (!rating) return;
    showLobbToast({ type: "success", message: "Review submitted. Thank you." });
    window.setTimeout(() => router.push("/dashboard"), 800);
  };

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-10 pt-5 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <header className="mb-8 flex items-center gap-3">
          <button onClick={() => router.back()} className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]" aria-label="Go back">
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-black">Leave a Review</h1>
        </header>

        <h2 className="text-[22px] font-black leading-tight">How was your session with {coach.name.split(" ")[0]}?</h2>
        <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">{day.short} · {booking.time}</p>

        <div className="mt-7 flex items-center gap-3 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_12px_28px_rgba(13,13,13,0.05)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coach.photo} alt="" className="size-14 rounded-full object-cover" />
          <div>
            <p className="font-black">{coach.name}</p>
            <p className="text-sm font-semibold text-[var(--lobb-muted)]">{coach.subtitle}</p>
          </div>
        </div>

        <div className="my-8 h-px bg-[var(--lobb-border)]" />

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} onClick={() => setRating(value)} className="flex size-12 items-center justify-center rounded-full transition active:scale-95" aria-label={`${value} stars`}>
              <Star className={`size-10 ${value <= rating ? "fill-[var(--lobb-star)] text-[var(--lobb-star)]" : "text-[var(--lobb-muted)]"}`} />
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-sm font-semibold text-[var(--lobb-muted)]">{rating ? `${rating} out of 5` : "Tap to rate"}</p>

        <label className="mt-8 block">
          <textarea
            value={review}
            maxLength={200}
            onChange={(event) => setReview(event.target.value)}
            placeholder="Tell others what you thought... (optional)"
            className="h-28 w-full resize-none rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-medium outline-none placeholder:text-[#9b958a] focus:border-[var(--lobb-black)]"
          />
          <span className="mt-2 block text-right text-xs font-bold text-[var(--lobb-muted)]">{review.length}/200</span>
        </label>

        <button disabled={!rating} onClick={submit} className="mt-5 h-14 w-full rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white shadow-[0_14px_30px_rgba(184,95,47,0.22)] disabled:bg-[#cfc6b8] disabled:shadow-none">
          Submit Review
        </button>
        <Link href="/dashboard" className="mt-5 block text-center text-sm font-bold text-[var(--lobb-muted)]">
          Skip for now
        </Link>
      </section>
    </main>
  );
}
