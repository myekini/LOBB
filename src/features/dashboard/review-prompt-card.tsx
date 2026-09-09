import Link from "next/link";

export function ReviewPromptCard({ bookingId }: { bookingId: string }) {
  return <Link href={`/dashboard/review/${bookingId}`} className="block rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-clay)] bg-[var(--lobb-bg-elevated)] p-4 text-sm font-medium text-[var(--lobb-clay)]">Leave a review</Link>;
}
