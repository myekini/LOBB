import { LobbVerifiedBadge } from "@/components/common/lobb-badge";
import type { CoachPublicProfile } from "@/lib/types";

export function CoachProfileHeader({ coach }: { coach: CoachPublicProfile }) {
  return (
    <header>
      <h1 className="text-3xl font-black">{coach.full_name}</h1>
      <div className="mt-2"><LobbVerifiedBadge verified={coach.is_verified} /></div>
    </header>
  );
}
