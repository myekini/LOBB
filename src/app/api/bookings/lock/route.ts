import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const LOCK_MINUTES      = 10;
const MIN_ADVANCE_HOURS = 24;
const MAX_ADVANCE_DAYS  = 14;

export async function POST(request: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = createClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Must be a player
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "player") {
      return NextResponse.json({ error: "Only players can lock slots" }, { status: 403 });
    }

    // Must have a players row (completed profile)
    const { data: player } = await supabase
      .from("players")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!player) {
      return NextResponse.json(
        { error: "Complete your player profile first" },
        { status: 403 }
      );
    }

    // ── Parse + validate body ─────────────────────────────────────────────────
    const body = (await request.json()) as { coach_slug?: string; slot_starts_at?: string };
    const { coach_slug, slot_starts_at } = body;

    if (!coach_slug || !slot_starts_at) {
      return NextResponse.json({ error: "coach_slug and slot_starts_at are required" }, { status: 400 });
    }

    const slotMs = new Date(slot_starts_at).getTime();
    if (Number.isNaN(slotMs)) {
      return NextResponse.json({ error: "Invalid slot_starts_at" }, { status: 400 });
    }

    const nowMs      = Date.now();
    const minMs      = nowMs + MIN_ADVANCE_HOURS * 60 * 60 * 1000;
    const maxMs      = nowMs + MAX_ADVANCE_DAYS  * 24 * 60 * 60 * 1000;

    if (slotMs < minMs) {
      return NextResponse.json(
        { error: "Slot must be at least 24 hours in the future" },
        { status: 400 }
      );
    }
    if (slotMs > maxMs) {
      return NextResponse.json(
        { error: "Slot is outside the 14-day booking window" },
        { status: 400 }
      );
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
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
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
        return NextResponse.json(
          { error: "This slot was just taken. Please choose another." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: lockErr.message }, { status: 500 });
    }

    return NextResponse.json({
      lock_id:    lock.id,
      expires_at: lock.expires_at,
    });
  } catch {
    return NextResponse.json({ error: "Unable to lock slot" }, { status: 500 });
  }
}
