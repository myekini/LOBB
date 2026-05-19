import { MapPin } from "lucide-react";

export function LocationBadge({ location }: { location: string }) {
  return <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--lobb-muted)]"><MapPin className="size-3.5 text-[var(--lobb-clay)]" />{location}</span>;
}
