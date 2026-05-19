import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function POST() {
  const auth = await requireRole("coach");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: coach, error: fetchError } = await auth.admin
    .from("coaches")
    .select("bio, skill_levels, certifications, hourly_rate_ngn, primary_location, status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (fetchError || !coach) {
    return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
  }

  if (coach.status === "pending_review") {
    return NextResponse.json({ error: "Profile is already under review" }, { status: 409 });
  }

  if (coach.status === "active") {
    return NextResponse.json({ error: "Profile is already live" }, { status: 409 });
  }

  // Minimum completeness check
  const incomplete: string[] = [];
  if (!coach.bio || coach.bio.length < 50) incomplete.push("bio");
  if (!Array.isArray(coach.skill_levels) || coach.skill_levels.length === 0) incomplete.push("skill_levels");
  if (!Array.isArray(coach.certifications) || coach.certifications.length === 0) incomplete.push("certifications");
  if (!coach.hourly_rate_ngn || coach.hourly_rate_ngn < 1000) incomplete.push("hourly_rate_ngn");
  if (!coach.primary_location) incomplete.push("primary_location");

  if (incomplete.length > 0) {
    return NextResponse.json(
      { error: `Profile incomplete. Missing: ${incomplete.join(", ")}` },
      { status: 422 }
    );
  }

  const { error: updateError } = await auth.admin
    .from("coaches")
    .update({ status: "pending_review" })
    .eq("id", auth.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
