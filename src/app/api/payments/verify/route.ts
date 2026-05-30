import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack";
import { queueBookingReminderEmails, sendBookingConfirmedEmails, sendPaymentFailedEmail, sendPaymentReceiptEmail } from "@/lib/email-notifications";
import { sendBookingConfirmedSms } from "@/lib/sms-notifications";
import type { BookingRow, BookingWithDetails } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // ── Look up payment + booking by reference ────────────────────────────────
    const { data: payment, error: payErr } = await admin
      .from("payments")
      .select("id, booking_id, status, paid_at, paystack_reference")
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (payErr || !payment?.booking_id) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "paid") {
      await admin
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", payment.booking_id)
        .in("status", ["pending", "pending_payment"]);
      await admin.from("slot_locks").delete().eq("booking_id", payment.booking_id);
    }

    // ── If booking not yet confirmed, call Paystack to double-check ────────────
    // (webhook may not have arrived yet)
    if (payment.status !== "paid") {
      let txn: Awaited<ReturnType<typeof verifyTransaction>> | null = null;
      try {
        txn = await verifyTransaction(reference);
      } catch {
        // Paystack unreachable — fall through and return current booking state.
        // If the webhook has already fired, the booking will be confirmed. If not,
        // the client retries until it is.
      }

      if (txn?.status === "success") {
        // Mark payment paid + confirm booking (idempotent via status checks)
        const { error: updatePaymentErr } = await admin
          .from("payments")
          .update({
            status:      "paid",
            paid_at:     txn.paid_at ?? new Date().toISOString(),
            raw_payload: txn,
          })
          .eq("id", payment.id)
          .neq("status", "paid");

        if (updatePaymentErr) {
          return NextResponse.json({ error: updatePaymentErr.message }, { status: 500 });
        }

        const { data: updatedBooking, error: updateBookingErr } = await admin
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", payment.booking_id)
          .in("status", ["pending", "pending_payment"])
          .select("id, coach_id, player_id, starts_at, ends_at, location, player_notes, location_venue_id, location_court_id, hourly_rate_ngn, convenience_fee_ngn, total_amount_ngn")
          .maybeSingle();

        if (updateBookingErr) {
          return NextResponse.json({ error: updateBookingErr.message }, { status: 500 });
        }

        // Remove slot lock and reserve court slot if applicable
        if (updatedBooking) {
          await admin.from("slot_locks").delete().eq("booking_id", updatedBooking.id);

          // Reserve the National Stadium court slot to prevent double-booking
          if (updatedBooking.location_venue_id === "national_stadium" && updatedBooking.location_court_id) {
            const { error: courtErr } = await admin.from("court_slot_bookings").upsert(
              {
                court_id:      updatedBooking.location_court_id,
                venue_id:      updatedBooking.location_venue_id,
                booking_id:    updatedBooking.id,
                coach_id:      updatedBooking.coach_id,
                player_id:     updatedBooking.player_id,
                slot_starts_at: updatedBooking.starts_at,
                slot_ends_at:   updatedBooking.ends_at,
              },
              { onConflict: "court_id,slot_starts_at", ignoreDuplicates: false }
            );
            if (courtErr) {
              // Court was double-booked despite the pre-check (race condition).
              // Payment is already confirmed — log the conflict for admin resolution
              // rather than failing the verify response.
              console.error("[court-conflict] booking=%s court=%s starts=%s error=%s",
                updatedBooking.id, updatedBooking.location_court_id,
                updatedBooking.starts_at, courtErr.message);
            }
          }

          // Send and schedule transactional emails (webhook may not have fired yet).
          // Atomically claim the event record first (INSERT ... ON CONFLICT DO NOTHING).
          // Two simultaneous verify requests can both reach this branch; only the one
          // that successfully inserts the row should send emails — the other gets back
          // an empty array and skips. This eliminates the SELECT→send→INSERT race.
          const [cp, pp, claimResult] = await Promise.all([
            admin.from("profiles").select("id, phone_number, email, email_notifications_enabled, full_name").eq("id", updatedBooking.coach_id).single(),
            admin.from("profiles").select("id, phone_number, email, email_notifications_enabled, full_name").eq("id", updatedBooking.player_id).single(),
            admin
              .from("paystack_events")
              .upsert(
                { event: "charge.success", reference, payload: txn, processed_at: new Date().toISOString() },
                { onConflict: "reference", ignoreDuplicates: true }
              )
              .select("reference"),
          ]);

          // Only proceed if we inserted the row (won the race vs webhook / concurrent verify)
          if (claimResult.data && claimResult.data.length > 0) {
            const startMs = new Date(updatedBooking.starts_at).getTime();
            const reminderAt = new Date(startMs - 24 * 60 * 60 * 1000).toISOString();
            const reviewAt = new Date(startMs + 2 * 60 * 60 * 1000).toISOString();
            const info = {
              bookingId:    updatedBooking.id,
              coachName:   cp.data?.full_name  ?? "Your coach",
              playerName:  pp.data?.full_name  ?? "Your player",
              startsAt:    updatedBooking.starts_at,
              endsAt:      updatedBooking.ends_at,
              location:    updatedBooking.location,
              playerNotes: updatedBooking.player_notes,
              reference,
              coachPhone:  cp.data?.phone_number ?? null,
              playerPhone: pp.data?.phone_number ?? null,
              paidAt:      txn.paid_at ?? new Date().toISOString(),
              sessionFeeNgn: updatedBooking.hourly_rate_ngn,
              convenienceFeeNgn: updatedBooking.convenience_fee_ngn,
              totalAmountNgn: updatedBooking.total_amount_ngn,
              paymentStatus: "paid",
              paymentMethod: "Paystack",
            };
            await Promise.allSettled([
              sendBookingConfirmedSms(admin, info, pp.data, cp.data),
              sendBookingConfirmedEmails(admin, info, pp.data, cp.data),
              sendPaymentReceiptEmail(admin, info, pp.data, cp.data),
              queueBookingReminderEmails(admin, info, pp.data, cp.data, reminderAt, reviewAt),
            ]);
          }
        }
      } else if (txn?.status === "abandoned" || txn?.status === "failed") {
        // Mark payment failed
        await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
        const { data: failedBooking } = await admin
          .from("bookings")
          .update({ status: "cancelled", cancellation_reason: "Payment was not completed" })
          .eq("id", payment.booking_id)
          .eq("status", "pending")
          .select("id, coach_id, player_id, starts_at, ends_at, location, player_notes")
          .maybeSingle();
        await admin.from("slot_locks").delete().eq("booking_id", payment.booking_id);
        if (failedBooking) {
          const [cp, pp] = await Promise.all([
            admin.from("profiles").select("id, phone_number, email, email_notifications_enabled, full_name").eq("id", failedBooking.coach_id).single(),
            admin.from("profiles").select("id, phone_number, email, email_notifications_enabled, full_name").eq("id", failedBooking.player_id).single(),
          ]);
          await sendPaymentFailedEmail(
            admin,
            {
              bookingId: failedBooking.id,
              coachName: cp.data?.full_name ?? "Your coach",
              playerName: pp.data?.full_name ?? "Player",
              startsAt: failedBooking.starts_at,
              endsAt: failedBooking.ends_at,
              location: failedBooking.location,
              playerNotes: failedBooking.player_notes,
              reference,
              coachPhone: cp.data?.phone_number ?? null,
              playerPhone: pp.data?.phone_number ?? null,
              paymentStatus: "failed",
              paymentMethod: "Paystack",
            },
            pp.data,
            cp.data
          ).catch(() => null);
        }
        return NextResponse.json({ error: "Payment was not completed" }, { status: 402 });
      }
      // txn null (Paystack unreachable) or status "pending" → fall through and return
      // current booking state so the client can display it and retry if needed
    }

    // ── Return full booking details ────────────────────────────────────────────
    const { data: booking, error: bookingErr } = await admin
      .from("bookings")
      .select(`
        *,
        coach:coaches ( full_name, profile_photo_url, slug ),
        payment:payments ( paystack_reference, status, paid_at )
      `)
      .eq("id", payment.booking_id)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Fetch profiles directly by id — avoids FK hint ambiguity with coaches/players tables
    const base = booking as unknown as BookingRow;
    const [{ data: coachProfile }, { data: playerProfile }] = await Promise.all([
      admin.from("profiles").select("phone_number").eq("id", base.coach_id).maybeSingle(),
      admin.from("profiles").select("full_name, phone_number, avatar_url").eq("id", base.player_id).maybeSingle(),
    ]);

    // Flatten into BookingWithDetails shape
    const coach = booking.coach as { full_name: string; profile_photo_url: string | null; slug: string | null } | null;
    const pmt   = Array.isArray(booking.payment) ? booking.payment[0] : booking.payment as { paystack_reference: string | null; status: string | null; paid_at: string | null } | null;

    const detail: BookingWithDetails = {
      ...base,
      coach_full_name:          coach?.full_name                ?? "",
      coach_phone:              coachProfile?.phone_number      ?? null,
      coach_profile_photo_url:  coach?.profile_photo_url        ?? null,
      coach_slug:               coach?.slug                     ?? null,
      player_full_name:         playerProfile?.full_name        ?? "",
      player_phone:             playerProfile?.phone_number     ?? null,
      player_avatar_url:        playerProfile?.avatar_url       ?? null,
      paystack_reference:       pmt?.paystack_reference         ?? null,
      payment_status:           (pmt?.status as BookingWithDetails["payment_status"]) ?? null,
      paid_at:                  pmt?.paid_at                    ?? null,
    };

    return NextResponse.json({ booking: detail });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
