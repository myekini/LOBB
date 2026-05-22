import { CoachListCard } from "@/features/coaches/coach-cards";
import type { CoachPublicProfile } from "@/lib/types";

export function CoachGrid({ coaches }: { coaches: CoachPublicProfile[] }) {
  return <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{coaches.map((coach) => <CoachListCard key={coach.id} coach={coach} />)}</section>;
}
