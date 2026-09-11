import { redirect } from "next/navigation";

export default function BookCoachEntryPage({ params }: { params: { coachSlug: string } }) {
  redirect(`/book/${params.coachSlug}/step-1`);
}
