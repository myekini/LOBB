import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CoachAvailabilityRow, CoachAvailabilityBlock } from "@/lib/types";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const admin = createAdminClient();

    const [slotsResult, blocksResult] = await Promise.all([
      admin
        .from("coach_availability")
        .select("*")
        .eq("coach_id", user.id)
        .order("day_of_week")
        .order("starts_at"),
      admin
        .from("coach_availability_blocks")
        .select("*")
        .eq("coach_id", user.id)
        .order("blocked_date"),
    ]);

    if (slotsResult.error) {
      return NextResponse.json({ error: slotsResult.error.message }, { status: 500 });
    }
    if (blocksResult.error) {
      return NextResponse.json({ error: blocksResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      slots: (slotsResult.data ?? []) as CoachAvailabilityRow[],
      blocks: (blocksResult.data ?? []) as CoachAvailabilityBlock[],
    });
  } catch {
    return NextResponse.json({ error: "Unable to load availability" }, { status: 500 });
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
// Full replace of weekly slots + blocked dates.
// Body: { slots: { day_of_week, starts_at, ends_at }[], blocked_dates: string[] }

type SlotInput = { day_of_week: number; starts_at: string; ends_at: string };
type PutBody  = { slots?: SlotInput[]; blocked_dates?: string[] };

export async function PUT(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Verify caller is a coach
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "coach") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as PutBody;

    // Validate slots
    const slots: SlotInput[] = [];
    if (Array.isArray(body.slots)) {
      for (const s of body.slots) {
        const dow = Number(s.day_of_week);
        if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
          return NextResponse.json({ error: "day_of_week must be 0–6" }, { status: 400 });
        }
        if (typeof s.starts_at !== "string" || typeof s.ends_at !== "string") {
          return NextResponse.json({ error: "starts_at and ends_at must be strings" }, { status: 400 });
        }
        if (s.starts_at >= s.ends_at) {
          return NextResponse.json({ error: "starts_at must be before ends_at" }, { status: 400 });
        }
        slots.push({ day_of_week: dow, starts_at: s.starts_at, ends_at: s.ends_at });
      }
    }

    // Validate blocked_dates
    const blockedDates: string[] = [];
    if (Array.isArray(body.blocked_dates)) {
      for (const d of body.blocked_dates) {
        if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          return NextResponse.json({ error: `Invalid date format: ${d}` }, { status: 400 });
        }
        blockedDates.push(d);
      }
    }

    const admin = createAdminClient();

    // Replace weekly slots: delete all then insert
    const { error: deleteSlotErr } = await admin
      .from("coach_availability")
      .delete()
      .eq("coach_id", user.id);

    if (deleteSlotErr) {
      return NextResponse.json({ error: deleteSlotErr.message }, { status: 500 });
    }

    if (slots.length > 0) {
      const { error: insertSlotErr } = await admin
        .from("coach_availability")
        .insert(slots.map((s) => ({ coach_id: user.id, ...s })));

      if (insertSlotErr) {
        return NextResponse.json({ error: insertSlotErr.message }, { status: 500 });
      }
    }

    // Replace blocked dates: delete all then insert
    const { error: deleteBlockErr } = await admin
      .from("coach_availability_blocks")
      .delete()
      .eq("coach_id", user.id);

    if (deleteBlockErr) {
      return NextResponse.json({ error: deleteBlockErr.message }, { status: 500 });
    }

    if (blockedDates.length > 0) {
      const { error: insertBlockErr } = await admin
        .from("coach_availability_blocks")
        .insert(blockedDates.map((d) => ({ coach_id: user.id, blocked_date: d })));

      if (insertBlockErr) {
        return NextResponse.json({ error: insertBlockErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to save availability" }, { status: 500 });
  }
}
