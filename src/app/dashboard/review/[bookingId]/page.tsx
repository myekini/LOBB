"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { showLobbToast } from "@/providers/lobb-global-state";
import { firstJoin, formatBookingDate, type DashboardBooking } from "@/lib/dashboard-client-types";
import { fetchWithCache } from "@/lib/offline-cache";
import { BookingCardSkeleton, SkeletonBlock } from "@/components/common/lobb-skeleton";

export default function LeaveReviewPage() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<DashboardBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const coach = firstJoin(booking?.coaches);

  useEffect(() => {
    let alive = true;

    fetchWithCache<{ upcoming: DashboardBooking[]; past: DashboardBooking[] }>("lobb.dashboard.player", "/api/dashboard/player")
      .then((payload) => {
        const allBookings: DashboardBooking[] = [...(payload.upcoming ?? []), ...(payload.past ?? [])];
        const found = allBookings.find((item) => item.id === params.bookingId) ?? null;
        if (!found) throw new Error("Booking not found");
        if (alive) setBooking(found);
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load booking" });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [params.bookingId]);

  const submit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: params.bookingId, rating, comment: review }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to submit review");
      showLobbToast({ type: "success", message: "Review submitted. Thank you." });
      window.setTimeout(() => router.push("/dashboard/bookings"), 800);
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to submit review" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="lobb-app-page min-h-screen px-5 pb-10 pt-5 text-[var(--lobb-text-primary)]">
        <section className="mx-auto max-w-md">
          <SkeletonBlock className="h-10 w-40" />
          <div className="mt-8">
            <BookingCardSkeleton />
          </div>
          <SkeletonBlock className="mx-auto mt-8 h-12 w-64 rounded-full" />
          <SkeletonBlock className="mt-8 h-28 w-full rounded-[16px]" />
        </section>
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="lobb-app-page min-h-screen px-5 py-10 text-[var(--lobb-text-primary)]">
        <section className="mx-auto max-w-md">
          <h1 className="text-xl font-black">Booking not found</h1>
          <Link href="/dashboard/bookings" className="mt-5 block text-sm font-black text-[var(--lobb-clay)]">Back to bookings</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="lobb-app-page min-h-screen px-5 pb-10 pt-5 text-[var(--lobb-text-primary)]">
      <section className="mx-auto max-w-md">
        <header className="mb-8 flex items-center gap-3">
          <Link href="/dashboard/bookings" className="flex size-10 items-center justify-center rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)]" aria-label="Go back">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-black">Leave a review</h1>
        </header>

        <h2 className="text-[22px] font-black leading-tight">How was your session with {(coach?.full_name ?? "your coach").split(" ")[0]}?</h2>
        <p className="mt-2 text-sm font-semibold text-[var(--lobb-muted)]">{formatBookingDate(booking.starts_at)}</p>

        <div className="lobb-app-card mt-7 flex items-center gap-3 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coach?.profile_photo_url || "/favicon.svg"} alt="" className="size-14 rounded-full object-cover" />
          <div>
            <p className="font-black">{coach?.full_name ?? "Coach"}</p>
            <p className="text-sm font-semibold text-[var(--lobb-muted)]">{coach?.headline || coach?.primary_location || booking.location}</p>
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
            placeholder="Tell others what you thought (optional)"
            className="h-28 w-full resize-none rounded-[12px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-medium outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:border-[var(--lobb-clay)]"
          />
          <span className="mt-2 block text-right text-xs font-bold text-[var(--lobb-muted)]">{review.length}/200</span>
        </label>

        <button disabled={!rating || submitting} onClick={submit} className="mt-5 h-14 w-full rounded-[12px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)] disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)] disabled:shadow-none">
          {submitting ? "Submitting" : "Submit review"}
        </button>
        <Link href="/dashboard/bookings" className="mt-5 block text-center text-sm font-bold text-[var(--lobb-muted)]">
          Skip for now
        </Link>
      </section>
    </main>
  );
}
