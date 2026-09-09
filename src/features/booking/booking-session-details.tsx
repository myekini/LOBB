export function BookingSessionDetails({ location, note }: { location: string; note?: string | null }) {
  return (
    <Card as="section" variant="outlined" className="p-4">
      <p className="font-medium">{location}</p>
      {note && <p className="mt-2 text-sm font-medium text-[var(--lobb-text-secondary)]">&quot;{note}&quot;</p>}
    </Card>
  );
}
import { Card } from "@/components/ui/card";
