"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { CoachBottomNav } from "@/components/coach-nav";
import { showLobbToast } from "@/components/lobb-global-state";
import { fetchWithCache } from "@/lib/offline-cache";
import { SkeletonBlock } from "@/components/lobb-skeleton";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  player_first_name: string;
  created_at: string;
};

export default function CoachReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchWithCache<{ reviews: Review[] }>("lobb.dashboard.coach", "/api/dashboard/coach")
      .then((payload) => {
        if (alive) setReviews(payload.reviews ?? []);
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

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 pb-28 pt-7 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-md">
        <h1 className="text-[22px] font-black">Reviews</h1>
        <section className="mt-6 space-y-3">
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
