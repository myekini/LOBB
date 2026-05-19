import { money } from "@/lib/dashboard-client-types";

export function CoachApprovalCard({ coach }: { coach: { full_name: string; hourly_rate_ngn: number; primary_location: string } }) {
  return <article className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4"><h2 className="font-black">{coach.full_name}</h2><p className="mt-1 text-sm font-semibold text-[var(--lobb-muted)]">{coach.primary_location} · {money(coach.hourly_rate_ngn)}/hr</p></article>;
}
