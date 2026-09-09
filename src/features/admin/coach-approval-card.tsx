import { money } from "@/lib/dashboard-client-types";
import { Card } from "@/components/ui/card";

export function CoachApprovalCard({ coach }: { coach: { full_name: string; hourly_rate_ngn: number; primary_location: string } }) {
  return <Card as="article" variant="outlined" className="p-4"><h2 className="font-semibold">{coach.full_name}</h2><p className="mt-1 text-sm text-[var(--lobb-text-secondary)]">{coach.primary_location} · {money(coach.hourly_rate_ngn)}/hr</p></Card>;
}
