import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { verifyNIN, isValidNIN, isValidBVN } from "@/lib/kyc";
import { logLegalConsent } from "@/lib/legal-consent";

export async function POST(request: Request) {
  const auth = await requireRole("coach");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    nin?: string;
    bvn?: string;
    identity_consent_accepted?: boolean;
  };

  const nin = body.nin?.trim() ?? "";
  const bvn = body.bvn?.trim() ?? "";

  if (!isValidNIN(nin)) {
    return NextResponse.json({ error: "NIN must be exactly 11 digits" }, { status: 400 });
  }
  if (!isValidBVN(bvn)) {
    return NextResponse.json({ error: "BVN must be exactly 11 digits" }, { status: 400 });
  }
  if (!body.identity_consent_accepted) {
    return NextResponse.json({ error: "Identity verification consent is required." }, { status: 400 });
  }

  const { data: coach, error: coachError } = await auth.admin
    .from("coaches")
    .select("full_name, kyc_status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (coachError) {
    return NextResponse.json({ error: coachError.message }, { status: 500 });
  }
  if (!coach) {
    return NextResponse.json({ error: "Complete step 1 first to create your coach draft" }, { status: 400 });
  }

  // NIN verification — stub until Smile Identity / VerifyMe is live (pending CAC)
  const nameParts = (coach.full_name ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") || firstName;

  const ninResult = await verifyNIN(nin, firstName, lastName);

  const kyc_status =
    ninResult.status === "verified"
      ? "identity_verified"
      : ninResult.status === "failed"
        ? "identity_failed"
        : "identity_submitted"; // pending_provider — collect & store, verify when live

  const updatePayload: Record<string, unknown> = {
    nin,
    bvn,
    kyc_status,
    kyc_nin_verified: ninResult.status === "verified",
  };

  if (ninResult.status === "failed") {
    updatePayload.kyc_failed_reason = ninResult.reason;
    const { error: updateError } = await auth.admin
      .from("coaches")
      .update(updatePayload)
      .eq("id", auth.user.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    await logLegalConsent({
      admin: auth.admin,
      userId: auth.user.id,
      documentName: "identity_verification_consent",
      ipAddress:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        null,
      userAgent: request.headers.get("user-agent"),
      metadata: { source: "coach_kyc", result: "failed" },
    }).catch(() => null);
    return NextResponse.json(
      { error: `Identity check failed: ${ninResult.reason}. Please verify your NIN and try again.` },
      { status: 422 }
    );
  }

  const { error: updateError } = await auth.admin
    .from("coaches")
    .update(updatePayload)
    .eq("id", auth.user.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await logLegalConsent({
    admin: auth.admin,
    userId: auth.user.id,
    documentName: "identity_verification_consent",
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent: request.headers.get("user-agent"),
    metadata: { source: "coach_kyc" },
  }).catch(() => null);

  return NextResponse.json({
    kyc_status,
    nin_verified: ninResult.status === "verified",
    message:
      ninResult.status === "pending_provider"
        ? "Identity details saved. NIN will be verified once our provider is live."
        : "Identity verified.",
  });
}
