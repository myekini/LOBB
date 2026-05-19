import { StarRating } from "@/components/ui/star-rating";

export function ReviewCard({ name, rating, comment }: { name: string; rating: number; comment?: string | null }) {
  return (
    <article className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4">
      <div className="flex items-center justify-between gap-3"><p className="font-black">{name}</p><StarRating rating={rating} /></div>
      {comment && <p className="mt-3 text-sm font-semibold leading-6 text-[var(--lobb-muted)]">&quot;{comment}&quot;</p>}
    </article>
  );
}
