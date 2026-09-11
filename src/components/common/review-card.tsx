import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";

export function ReviewCard({ name, rating, comment }: { name: string; rating: number; comment?: string | null }) {
  return (
    <Card as="article" variant="outlined" className="p-4">
      <div className="flex items-center justify-between gap-3"><p className="font-medium">{name}</p><StarRating rating={rating} /></div>
      {comment && <p className="mt-3 text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">&quot;{comment}&quot;</p>}
    </Card>
  );
}
