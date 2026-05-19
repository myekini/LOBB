import { Star } from "lucide-react";

export function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} className={`size-4 ${value <= rating ? "fill-[var(--lobb-star)] text-[var(--lobb-star)]" : "text-[var(--lobb-muted)]"}`} />
      ))}
    </span>
  );
}
