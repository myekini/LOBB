import { redirect } from "next/navigation";

export default function CoachBookingConfirmAlias({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }
  redirect(`/book/confirm${query.size ? `?${query.toString()}` : ""}`);
}
