import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
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
  return {
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
  };
}

export async function GET() {
  const auth = await requireRole(["coach", "admin"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const coachId = auth.user.id;

  const [coachResult, bookingsResult, earningsResult, reviewsResult, availabilityResult] = await Promise.all([
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
  ]);

  if (coachResult.error) return NextResponse.json({ error: coachResult.error.message }, { status: 500 });
  if (bookingsResult.error) return NextResponse.json({ error: bookingsResult.error.message }, { status: 500 });
  if (earningsResult.error) return NextResponse.json({ error: earningsResult.error.message }, { status: 500 });
  if (reviewsResult.error) return NextResponse.json({ error: reviewsResult.error.message }, { status: 500 });
  if (availabilityResult.error) return NextResponse.json({ error: availabilityResult.error.message }, { status: 500 });

  const bookings = bookingsResult.data ?? [];
  const now = Date.now();

  return NextResponse.json({
    coach: coachResult.data,
    upcoming_bookings: bookings.filter(
      (booking) => booking.status === "confirmed" && new Date(booking.starts_at).getTime() >= now
    ),
    recent_bookings: bookings.slice(0, 10),
    earnings: earningsResult.data,
    pending_payout_ngn: earningsResult.data?.pending_payout_ngn ?? 0,
    availability_slots_count: availabilityResult.data?.length ?? 0,
    profile_completion: profileChecklistProgress(coachResult.data),
    reviews: reviewsResult.data ?? [],
  });
}
