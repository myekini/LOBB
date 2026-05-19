import type { CoachPublicProfile } from "@/lib/types";

export function CoachProfileBio({ coach }: { coach: CoachPublicProfile }) {
  return <p className="text-sm font-semibold leading-6 text-[var(--lobb-muted)]">{coach.bio}</p>;
}
