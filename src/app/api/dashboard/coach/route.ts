import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";
import { loadCoachBookings } from "@/lib/dashboard-queries";

function profileChecklistProgress(coach: Record<string, unknown> | null) {
  const checks = [
    Boolean(coach?.full_name),
    typeof coach?.bio === "string" && coach.bio.length >= 50,
    Boolean(coach?.profile_photo_url),
    typeof coach?.headline === "string" && coach.headline.length > 0,
    Array.isArray(coach?.skill_levels) && coach.skill_levels.length > 0,
    Array.isArray(coach?.specializations) && coach.specializations.length > 0,
    Array.isArray(coach?.certifications) && coach.certifications.length > 0,
    Array.isArray(coach?.languages) && coach.languages.length > 0,
    Boolean(coach?.court_access),
    Boolean(coach?.primary_location),
    Number(coach?.hourly_rate_ngn) >= 1000,
  ];
  const completed = checks.filter(Boolean).length;
  return { completed, total: checks.length, percent: Math.round((completed / checks.length) * 100) };
}

export const GET = withRole(["coach", "admin"], async (_request, auth) => {
  const coachId = auth.user.id;

  const [coachResult, bookingsResult, earningsResult, reviewsResult, availabilityResult, referralResult, referralSignupsResult] = await Promise.all([
    auth.admin.from("coaches").select("*").eq("id", coachId).maybeSingle(),
    loadCoachBookings(auth.admin, coachId),
    auth.admin.from("coach_earnings_summary").select("*").eq("coach_id", coachId).maybeSingle(),
    auth.admin
      .from("public_reviews")
      .select("*")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(10),
    auth.admin.from("coach_availability").select("id").eq("coach_id", coachId),
    auth.admin
      .from("referral_credits")
      .select("amount")
      .eq("referring_coach_id", coachId),
    auth.admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by_coach_id", coachId),
  ]);

  if (coachResult.error) return internalError(coachResult.error);
  if (bookingsResult.error) return internalError(bookingsResult.error);
  if (earningsResult.error) return internalError(earningsResult.error);
  if (reviewsResult.error) return internalError(reviewsResult.error);
  if (availabilityResult.error) return internalError(availabilityResult.error);

  const bookings = bookingsResult.data ?? [];
  const now = Date.now();
  const referralCredits = referralResult.data ?? [];
  const referralEarnedNgn = referralCredits.reduce((s, c) => s + c.amount, 0);
  const referralSignupsCount = referralSignupsResult.count ?? 0;
  const referralBookedCount = referralCredits.length;

  return NextResponse.json({
    coach: coachResult.data,
    upcoming_bookings: bookings.filter(
      (b) => b.status === "confirmed" && new Date(b.starts_at).getTime() >= now
    ),
    recent_bookings: bookings.slice(0, 10),
    earnings: earningsResult.data,
    pending_payout_ngn: earningsResult.data?.pending_payout_ngn ?? 0,
    availability_slots_count: availabilityResult.data?.length ?? 0,
    profile_completion: profileChecklistProgress(coachResult.data),
    reviews: reviewsResult.data ?? [],
    referral: {
      referral_code: coachResult.data?.referral_code ?? null,
      signups_count: referralSignupsCount,
      booked_count: referralBookedCount,
      total_earned_ngn: referralEarnedNgn,
    },
  });
});
