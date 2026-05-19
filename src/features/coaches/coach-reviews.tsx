import { ReviewCard } from "@/components/common/review-card";

export function CoachReviews({ reviews }: { reviews: Array<{ id: string; player_first_name: string; rating: number; comment: string | null }> }) {
  return <section className="space-y-3">{reviews.map((review) => <ReviewCard key={review.id} name={review.player_first_name} rating={review.rating} comment={review.comment} />)}</section>;
}
