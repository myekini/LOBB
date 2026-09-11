import type { CoachPublicProfile } from "@/lib/types";

export function CoachProfileBio({ coach }: { coach: CoachPublicProfile }) {
  return <p className="text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">{coach.bio}</p>;
}
