export function BookingConfirmationCard({ title, body }: { title: string; body: string }) {
  return <Card as="section" variant="outlined" className="p-5"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm font-medium text-[var(--lobb-text-secondary)]">{body}</p></Card>;
}
import { Card } from "@/components/ui/card";
