import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { apiError, internalError } from "@/lib/api-response";
import { generateReference, initializeTransaction } from "@/lib/paystack";
import { rateLimit, clientIp } from "@/lib/rate-limit";

function callbackOrigin() {
  // Always use the configured app URL — never trust request headers for
  // security-sensitive redirect targets (x-forwarded-host can be spoofed).
  return (process.env.NEXT_PUBLIC_APP_URL || "https://lobb.ng").replace(/\/$/, "");
}

// Re-initializes Paystack for a booking whose payment was never completed.
// The original authorization URL is not stored, and Paystack references are
// single-use, so resuming checkout requires a fresh transaction pointed at the
// same booking and payment row.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const rl = rateLimit(`booking-pay:${clientIp(request)}`, 5, 10 * 60 * 1000);
  if (!rl.ok) return apiError("RATE_LIMITED", 429);

  const auth = await requireRole(["player"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: booking, error } = await auth.admin
    .from("bookings")
    .select("id, player_id, starts_at, status, total_amount_ngn, payments(id, status)")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return internalError(error);
  if (!booking || booking.player_id !== auth.user.id) return apiError("NOT_FOUND", 404);
  if (booking.status !== "pending" && booking.status !== "pending_payment") {
    return apiError("VALIDATION_ERROR", 409, { message: "This booking is not waiting for payment." });
  }

  const payment = booking.payments?.[0] as { id: string; status: string | null } | undefined;
  if (payment?.status === "paid") {
    return apiError("VALIDATION_ERROR", 409, { message: "This booking is already paid." });
  }
  if (new Date(booking.starts_at).getTime() <= Date.now()) {
    return apiError("VALIDATION_ERROR", 410, { message: "This session time has passed. Book a new slot." });
  }

  try {
    const reference = generateReference();
    const email = auth.user.email ?? `${auth.user.id}@lobb.ng`;

    const init = await initializeTransaction({
      email,
      amount_kobo: booking.total_amount_ngn * 100,
      reference,
      callback_url: `${callbackOrigin()}/book/confirm?reference=${encodeURIComponent(reference)}`,
      metadata: { player_id: auth.user.id, booking_id: booking.id, resumed: true },
    });

    // Point the booking and its payment row at the fresh transaction so the
    // existing verify/webhook flow confirms it like a first attempt.
    const { error: bookingErr } = await auth.admin
      .from("bookings")
      .update({ paystack_reference: reference })
      .eq("id", booking.id);
    if (bookingErr) return internalError(bookingErr, "PAYMENT_INIT_FAILED");

    if (payment) {
      const { error: paymentErr } = await auth.admin
        .from("payments")
        .update({ paystack_reference: reference, paystack_access_code: init.access_code, status: "pending" })
        .eq("id", payment.id);
      if (paymentErr) return internalError(paymentErr, "PAYMENT_INIT_FAILED");
    } else {
      const { error: paymentErr } = await auth.admin.from("payments").insert({
        booking_id: booking.id,
        paystack_reference: reference,
        paystack_access_code: init.access_code,
        status: "pending",
        amount_ngn: booking.total_amount_ngn,
      });
      if (paymentErr) return internalError(paymentErr, "PAYMENT_INIT_FAILED");
    }

    return NextResponse.json({ reference, paystack_url: init.authorization_url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to restart payment";
    return apiError("PAYMENT_INIT_FAILED", 500, { message });
  }
}
