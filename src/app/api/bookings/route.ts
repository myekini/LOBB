import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/api-auth";
import { loadCoachBookings, loadPlayerBookings } from "@/lib/dashboard-queries";
import { initializeTransaction, generateReference } from "@/lib/paystack";

const PLATFORM_COMMISSION_RATE = 0.15; // LOBB's cut from coach rate
const CONVENIENCE_FEE_RATE = 0.05; // charged to player

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
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, phone_number, full_name")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "player") {
      return NextResponse.json({ error: "Only players can create bookings" }, { status: 403 });
    }

    const { data: player } = await supabase
      .from("players")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!player) {
      return NextResponse.json(
        { error: "Complete your player profile before booking" },
        { status: 403 }
      );
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = (await request.json()) as {
      coach_slug?: string;
      slot_starts_at?: string;
      lock_id?: string;
      location?: string;
      player_notes?: string;
    };

    const { coach_slug, slot_starts_at, lock_id, location, player_notes } = body;

    if (!coach_slug || !slot_starts_at || !lock_id || !location?.trim()) {
      return NextResponse.json(
        { error: "coach_slug, slot_starts_at, lock_id, and location are required" },
        { status: 400 }
      );
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
      return NextResponse.json({ error: "Slot lock not found" }, { status: 404 });
    }
    if (lock.booking_id) {
      return NextResponse.json({ error: "This lock is already used" }, { status: 409 });
    }
    if (new Date(lock.expires_at) < new Date()) {
      return NextResponse.json({ error: "Slot lock has expired. Please start over." }, { status: 410 });
    }

    // ── Fetch coach details ────────────────────────────────────────────────────
    const { data: coach, error: coachErr } = await admin
      .from("coaches")
      .select("id, hourly_rate_ngn, paystack_subaccount_code, full_name")
      .eq("slug", coach_slug)
      .eq("status", "active")
      .maybeSingle();

    if (coachErr || !coach) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    // Ensure the lock actually belongs to this coach
    if (lock.coach_id !== coach.id) {
      return NextResponse.json({ error: "Lock/coach mismatch" }, { status: 400 });
    }

    // ── Calculate fees ────────────────────────────────────────────────────────
    const session_fee = coach.hourly_rate_ngn;
    const platform_commission = Math.round(session_fee * PLATFORM_COMMISSION_RATE);
    const convenience_fee = Math.round(session_fee * CONVENIENCE_FEE_RATE);
    const coach_payout = session_fee - platform_commission;
    const total_amount = session_fee + convenience_fee;

    // ── Compute session times ─────────────────────────────────────────────────
    const starts_at = new Date(slot_starts_at);
    const ends_at   = new Date(starts_at.getTime() + 60 * 60 * 1000); // +60 min

    // ── Initialize Paystack ────────────────────────────────────────────────────
    const reference  = generateReference();
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get("host")}`;
    const email      = user.email ?? `${user.id}@lobb.ng`; // Paystack requires email

    const paystackData = await initializeTransaction({
      email,
      amount_kobo:  total_amount * 100,
      reference,
      callback_url: `${appUrl}/book/confirm?reference=${encodeURIComponent(reference)}`,
      subaccount:   coach.paystack_subaccount_code ?? undefined,
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
        location:         location.trim(),
        player_notes:     player_notes?.trim() || null,
        status:           "pending",
        hourly_rate_ngn:  session_fee,
        platform_fee_ngn: convenience_fee,
        total_amount_ngn: total_amount,
        session_date: starts_at.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }),
        session_start_time: starts_at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Africa/Lagos" }),
        session_end_time: ends_at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Africa/Lagos" }),
        location_note: location.trim(),
        player_note: player_notes?.trim() || null,
        gross_amount: total_amount,
        platform_commission_ngn: platform_commission,
        convenience_fee_ngn: convenience_fee,
        coach_payout_ngn: coach_payout,
        paystack_reference: reference,
      })
      .select("id")
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: bookingErr?.message ?? "Booking failed" }, { status: 500 });
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
      return NextResponse.json({ error: paymentErr.message }, { status: 500 });
    }

    // Attach booking_id to the lock (marks it as used)
    await admin
      .from("slot_locks")
      .update({ booking_id: booking.id })
      .eq("id", lock_id);

    return NextResponse.json({
      booking_id:   booking.id,
      reference,
      paystack_url: paystackData.authorization_url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create booking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
