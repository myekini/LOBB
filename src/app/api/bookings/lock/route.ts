import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError } from "@/lib/api-response";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const LOCK_MINUTES      = 10;
const MIN_ADVANCE_HOURS = 24;
const MAX_ADVANCE_DAYS  = 30;

export async function POST(request: Request) {
  const rl = rateLimit(`booking-lock:${clientIp(request)}`, 10, 5 * 60 * 1000);
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

    // Must be a player
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "player") {
      return apiError("FORBIDDEN", 403, { message: "Only players can lock booking slots." });
    }

    // Must have a players row (completed profile)
    const { data: player } = await supabase
      .from("players")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!player) {
      return apiError("BOOKING_PROFILE_REQUIRED", 403);
    }

    // ── Parse + validate body ─────────────────────────────────────────────────
    const body = (await request.json()) as { coach_slug?: string; slot_starts_at?: string };
    const { coach_slug, slot_starts_at } = body;

    if (!coach_slug || !slot_starts_at) {
      return apiError("VALIDATION_ERROR", 400, { message: "Choose a coach and time before continuing." });
    }

    const slotMs = new Date(slot_starts_at).getTime();
    if (Number.isNaN(slotMs)) {
      return apiError("VALIDATION_ERROR", 400, { message: "Choose a valid session time.", field: "slot_starts_at" });
    }

    const nowMs      = Date.now();
    const minMs      = nowMs + MIN_ADVANCE_HOURS * 60 * 60 * 1000;
    const maxMs      = nowMs + MAX_ADVANCE_DAYS  * 24 * 60 * 60 * 1000;

    if (slotMs < minMs) {
      return apiError("BOOKING_SLOT_TOO_SOON", 400);
    }
    if (slotMs > maxMs) {
      return apiError("BOOKING_SLOT_TOO_FAR", 400);
    }

    // ── Resolve coach ─────────────────────────────────────────────────────────
    const admin = createAdminClient();

    const { data: coach, error: coachErr } = await admin
      .from("coaches")
      .select("id")
      .eq("slug", coach_slug)
      .eq("status", "active")
      .maybeSingle();

    if (coachErr || !coach) {
      return apiError("BOOKING_COACH_UNAVAILABLE", 404);
    }

    const { data: slots, error: slotsErr } = await admin.rpc("get_coach_available_slots", {
      p_coach_id: coach.id,
    });

    if (slotsErr) {
      return apiError("BOOKING_COACH_UNAVAILABLE", 500);
    }

    const requestedSlotMs = new Date(slot_starts_at).getTime();
    const slotIsAvailable = (slots ?? []).some(
      (slot: { slot_starts_at: string }) => new Date(slot.slot_starts_at).getTime() === requestedSlotMs
    );

    if (!slotIsAvailable) {
      return apiError("BOOKING_SLOT_TAKEN", 409);
    }

    // ── Clean up expired locks for this coach/slot ────────────────────────────
    await admin
      .from("slot_locks")
      .delete()
      .eq("coach_id", coach.id)
      .eq("slot_starts_at", slot_starts_at)
      .lt("expires_at", new Date().toISOString());

    // ── Insert lock (unique constraint catches conflicts) ─────────────────────
    const expiresAt = new Date(nowMs + LOCK_MINUTES * 60 * 1000).toISOString();

    const { data: lock, error: lockErr } = await admin
      .from("slot_locks")
      .insert({
        coach_id:       coach.id,
        slot_starts_at,
        locked_by:      user.id,
        expires_at:     expiresAt,
      })
      .select("id, expires_at")
      .single();

    if (lockErr) {
      // Unique constraint violation means slot is already locked
      if (lockErr.code === "23505") {
        return apiError("BOOKING_SLOT_TAKEN", 409);
      }
      return apiError("BOOKING_LOCK_INVALID", 500);
    }

    return NextResponse.json({
      lock_id:    lock.id,
      expires_at: lock.expires_at,
    });
  } catch {
    return apiError("BOOKING_LOCK_INVALID", 500);
  }
}
