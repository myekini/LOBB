"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { CoachBottomNav } from "@/components/coach-nav";
import { showLobbToast } from "@/components/lobb-global-state";
import { SkeletonBlock } from "@/components/lobb-skeleton";
import { CoachFlowHeader } from "@/components/coach-flow-header";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  player_first_name: string;
  created_at: string;
};

export default function CoachReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<{ average_rating: number | null; review_count: number }>({
    average_rating: null,
    review_count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/coach/reviews", { cache: "no-store" })
      .then(async (res) => {
        const payload = (await res.json()) as {
          reviews?: Review[];
          summary?: { average_rating: number | null; review_count: number };
          error?: string;
        };
        if (!res.ok) throw new Error(payload.error ?? "Unable to load reviews");
        return payload;
      })
      .then((payload) => {
        if (!alive) return;
        setReviews(payload.reviews ?? []);
        setSummary(payload.summary ?? { average_rating: null, review_count: 0 });
      })
      .catch((error) => {
        showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Unable to load reviews" });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const averageCopy = summary.average_rating == null ? "No average yet" : `${summary.average_rating.toFixed(1)} average`;

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 text-[var(--lobb-black)]">
      <CoachFlowHeader title="Reviews" eyebrow="Player feedback" />
      <section className="mx-auto max-w-md pt-5">
        <section className="mb-5 rounded-[20px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(13,13,13,0.04)]">
          {loading ? (
            <>
              <SkeletonBlock className="h-6 w-32" />
              <SkeletonBlock className="mt-2 h-4 w-48" />
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 text-lg font-black">
                <Star className="size-5 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
                {averageCopy}
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">
                {summary.review_count} {summary.review_count === 1 ? "review" : "reviews"}
              </p>
            </>
          )}
        </section>
        <section className="space-y-3">
          {loading ? (
            <>
              {Array.from({ length: 4 }).map((_, index) => (
                <article key={index} className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
                  <SkeletonBlock className="h-4 w-32" />
                  <SkeletonBlock className="mt-3 h-16 w-full" />
                </article>
              ))}
            </>
          ) : reviews.length ? (
            reviews.map((review) => (
              <article key={review.id} className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 shadow-[0_10px_22px_rgba(13,13,13,0.04)]">
                <p className="flex items-center gap-2 text-sm font-black">
                  <Star className="size-4 fill-[var(--lobb-star)] text-[var(--lobb-star)]" />
                  {review.rating}/5 from {review.player_first_name}
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--lobb-muted)]">
                  {new Date(review.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                {review.comment && <p className="mt-3 text-sm font-semibold leading-6 text-[var(--lobb-muted)]">&quot;{review.comment}&quot;</p>}
              </article>
            ))
          ) : (
            <p className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-semibold text-[var(--lobb-muted)]">
              No reviews yet.
            </p>
          )}
        </section>
      </section>
      <CoachBottomNav active="profile" />
    </main>
  );
}
