import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api-auth";
import { loadCoachBookings, loadPlayerBookings } from "@/lib/dashboard-queries";
import { initializeTransaction, generateReference } from "@/lib/paystack";
import { sendBookingPaymentInitiatedCoachSms } from "@/lib/sms-notifications";
import type { NotificationBookingInfo } from "@/lib/notification-messages";
import { apiError } from "@/lib/api-response";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { calcBookingFees } from "@/lib/lobb-money";
import { logLegalConsent } from "@/lib/legal-consent";

function callbackOrigin() {
  // Always use the configured app URL — never trust request headers for
  // security-sensitive redirect targets (x-forwarded-host can be spoofed).
  return (process.env.NEXT_PUBLIC_APP_URL || "https://lobb.ng").replace(/\/$/, "");
}

function requestAudit(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function GET() {
  const auth = await requireRole(["player", "coach", "admin"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.profile?.role === "coach") {
    const { data, error } = await loadCoachBookings(auth.admin, auth.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bookings: data ?? [] });
  }

  if (auth.profile?.role === "player") {
    const { data, error } = await loadPlayerBookings(auth.admin, auth.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bookings: data ?? [] });
  }

  const { data, error } = await auth.admin
    .from("bookings")
    .select("*")
    .order("starts_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bookings: data ?? [] });
}

export async function POST(request: Request) {
  const rl = rateLimit(`booking-create:${clientIp(request)}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return apiError("RATE_LIMITED", 429);
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return apiError("AUTH_EXPIRED", 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, phone_number, full_name")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "player") {
      return apiError("FORBIDDEN", 403, { message: "Only players can create bookings." });
    }

    const { data: player } = await supabase
      .from("players")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!player) {
      return apiError("BOOKING_PROFILE_REQUIRED", 403);
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = (await request.json()) as {
      coach_slug?: string;
      slot_starts_at?: string;
      lock_id?: string;
      location?: string;
      player_notes?: string;
      location_venue_id?: string;
      location_court_id?: string;
      cancellation_policy_accepted?: boolean;
    };

    const { coach_slug, slot_starts_at, lock_id, location, player_notes, location_venue_id, location_court_id, cancellation_policy_accepted } = body;

    if (!coach_slug || !slot_starts_at || !lock_id || !location?.trim()) {
      return apiError("VALIDATION_ERROR", 400, { message: "Choose a slot and court before continuing." });
    }
    if (!cancellation_policy_accepted) {
      return apiError("VALIDATION_ERROR", 400, { message: "Accept the Cancellation Policy before payment." });
    }

    const admin = createAdminClient();

    // ── Validate lock ─────────────────────────────────────────────────────────
    const { data: lock, error: lockErr } = await admin
      .from("slot_locks")
      .select("id, coach_id, slot_starts_at, expires_at, booking_id")
      .eq("id", lock_id)
      .eq("locked_by", user.id)
      .maybeSingle();

    if (lockErr || !lock) {
      return apiError("BOOKING_LOCK_INVALID", 404);
    }
    if (lock.booking_id) {
      return apiError("BOOKING_LOCK_INVALID", 409, { message: "This booking hold has already been used. Please choose the slot again." });
    }
    if (new Date(lock.expires_at) < new Date()) {
      return apiError("BOOKING_LOCK_EXPIRED", 410);
    }
    if (new Date(lock.slot_starts_at).getTime() !== new Date(slot_starts_at).getTime()) {
      return apiError("BOOKING_LOCK_INVALID", 400);
    }

    // ── Fetch coach details ────────────────────────────────────────────────────
    const { data: coach, error: coachErr } = await admin
      .from("coaches")
      .select("id, hourly_rate_ngn, paystack_recipient_code, paystack_subaccount_code, full_name")
      .eq("slug", coach_slug)
      .eq("status", "active")
      .maybeSingle();

    if (coachErr || !coach) {
      return apiError("BOOKING_COACH_UNAVAILABLE", 404);
    }

    // Ensure the lock actually belongs to this coach
    if (lock.coach_id !== coach.id) {
      return apiError("BOOKING_LOCK_INVALID", 400);
    }

    // ── Guard: coach must have connected their bank at some point ─────────────
    // With the Transfer API payout model, money lands in LOBB's account first;
    // paystack_recipient_code is only required when the cron pays out (post-session).
    // Coaches who onboarded under the old subaccount model are still bookable —
    // they'll need to re-onboard for automated payouts, but bookings should not block.
    if (!coach.paystack_recipient_code && !coach.paystack_subaccount_code) {
      return apiError("BOOKING_PAYMENT_ACCOUNT_MISSING", 403);
    }

    // ── Calculate fees ────────────────────────────────────────────────────────
    const session_fee = coach.hourly_rate_ngn;
    const { convenienceFee: convenience_fee, grossCharge: total_amount, platformCommission: platform_commission, coachPayout: coach_payout } = calcBookingFees(session_fee);

    // ── Compute session times ─────────────────────────────────────────────────
    const starts_at = new Date(slot_starts_at);
    const ends_at   = new Date(starts_at.getTime() + 60 * 60 * 1000); // +60 min

    // ── Initialize Paystack ────────────────────────────────────────────────────
    const reference  = generateReference();
    const appUrl     = callbackOrigin();
    const email      = user.email ?? `${user.id}@lobb.ng`; // Paystack requires email

    const paystackData = await initializeTransaction({
      email,
      amount_kobo:  total_amount * 100,
      reference,
      callback_url: `${appUrl}/book/confirm?reference=${encodeURIComponent(reference)}`,
      metadata: {
        player_id:   user.id,
        coach_id:    coach.id,
        lock_id,
      },
    });

    // ── Persist booking + payment ─────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .insert({
        coach_id:         coach.id,
        player_id:        user.id,
        starts_at:        starts_at.toISOString(),
        ends_at:          ends_at.toISOString(),
        location:             location.trim(),
        location_venue_id:    location_venue_id?.trim() || null,
        location_court_id:    location_court_id?.trim() || null,
        player_notes:         player_notes?.trim().slice(0, 1000) || null,
        status:               "pending",
        hourly_rate_ngn:  session_fee,
        platform_fee_ngn: convenience_fee,
        total_amount_ngn: total_amount,
        session_date: starts_at.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }),
        session_start_time: starts_at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Africa/Lagos" }),
        session_end_time: ends_at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Africa/Lagos" }),
        gross_amount: total_amount,
        platform_commission_ngn: platform_commission,
        convenience_fee_ngn: convenience_fee,
        coach_payout_ngn: coach_payout,
        paystack_reference: reference,
      })
      .select("id")
      .single();

    if (bookingErr || !booking) {
      return apiError("PAYMENT_INIT_FAILED", 500);
    }

    // Create payment record
    const { error: paymentErr } = await admin
      .from("payments")
      .insert({
        booking_id:          booking.id,
        paystack_reference:  reference,
        paystack_access_code: paystackData.access_code,
        status:              "pending",
        amount_ngn:          total_amount,
      });

    if (paymentErr) {
      // Roll back booking
      await admin.from("bookings").delete().eq("id", booking.id);
      return apiError("PAYMENT_INIT_FAILED", 500);
    }

    // Attach booking_id to the lock (marks it as used)
    await admin
      .from("slot_locks")
      .update({ booking_id: booking.id })
      .eq("id", lock_id);

    const { data: coachProfile } = await admin
      .from("profiles")
      .select("id, phone_number, full_name")
      .eq("id", coach.id)
      .maybeSingle();

    const notificationInfo: NotificationBookingInfo = {
      bookingId: booking.id,
      coachName: coachProfile?.full_name ?? coach.full_name ?? "Your coach",
      playerName: profile.full_name ?? "Your player",
      startsAt: starts_at.toISOString(),
      endsAt: ends_at.toISOString(),
      location: location.trim(),
      playerNotes: player_notes?.trim() || null,
      coachPhone: coachProfile?.phone_number ?? null,
      playerPhone: profile.phone_number ?? null,
    };

    await sendBookingPaymentInitiatedCoachSms(admin, notificationInfo, coachProfile).catch(() => null);

    await logLegalConsent({
      admin,
      userId: user.id,
      documentName: "cancellation_policy",
      ...requestAudit(request),
      metadata: { source: "booking_payment", booking_id: booking.id, reference },
    }).catch(() => null);

    return NextResponse.json({
      booking_id:   booking.id,
      reference,
      paystack_url: paystackData.authorization_url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create booking";
    return apiError("PAYMENT_INIT_FAILED", 500, { message });
  }
}
