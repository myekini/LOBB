import Link from "next/link";

export function ReviewPromptCard({ bookingId }: { bookingId: string }) {
  return <Link href={`/dashboard/review/${bookingId}`} className="block rounded-[18px] border border-[var(--lobb-clay)] bg-[var(--lobb-surface)] p-4 text-sm font-black text-[var(--lobb-clay)]">Leave a review</Link>;
}
