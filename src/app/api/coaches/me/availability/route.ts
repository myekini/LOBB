import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import type { CoachAvailabilityRow, CoachAvailabilityBlock, CoachAvailabilitySlotBlock } from "@/lib/types";

function missingSlotBlockTable(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        error.message?.includes("coach_availability_slot_blocks"))
  );
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const auth = await requireRole(["coach", "admin"]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [slotsResult, blocksResult, slotBlocksResult] = await Promise.all([
      auth.admin
        .from("coach_availability")
        .select("*")
        .eq("coach_id", auth.user.id)
        .order("day_of_week")
        .order("starts_at"),
      auth.admin
        .from("coach_availability_blocks")
        .select("*")
        .eq("coach_id", auth.user.id)
        .order("blocked_date"),
      auth.admin
        .from("coach_availability_slot_blocks")
        .select("*")
        .eq("coach_id", auth.user.id)
        .order("slot_starts_at"),
    ]);

    if (slotsResult.error) {
      return NextResponse.json({ error: slotsResult.error.message }, { status: 500 });
    }
    if (blocksResult.error) {
      return NextResponse.json({ error: blocksResult.error.message }, { status: 500 });
    }
    if (slotBlocksResult.error && !missingSlotBlockTable(slotBlocksResult.error)) {
      return NextResponse.json({ error: slotBlocksResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      slots: (slotsResult.data ?? []) as CoachAvailabilityRow[],
      blocks: (blocksResult.data ?? []) as CoachAvailabilityBlock[],
      slot_blocks: slotBlocksResult.error ? [] : ((slotBlocksResult.data ?? []) as CoachAvailabilitySlotBlock[]),
    });
  } catch {
    return NextResponse.json({ error: "Unable to load availability" }, { status: 500 });
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
// Full replace of weekly slots + blocked dates.
// Body: { slots: { day_of_week, starts_at, ends_at }[], blocked_dates: string[] }

type SlotInput = { day_of_week: number; starts_at: string; ends_at: string };
type SlotBlockInput = { slot_starts_at: string; slot_ends_at: string; reason?: string | null };
type PutBody  = { slots?: SlotInput[]; blocked_dates?: string[]; blocked_slots?: SlotBlockInput[] };

export async function PUT(request: Request) {
  try {
    const auth = await requireRole(["coach", "admin"]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
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

    // Validate blocked slots
    const blockedSlots: SlotBlockInput[] = [];
    if (Array.isArray(body.blocked_slots)) {
      for (const s of body.blocked_slots) {
        if (typeof s.slot_starts_at !== "string" || typeof s.slot_ends_at !== "string") {
          return NextResponse.json({ error: "slot_starts_at and slot_ends_at must be strings" }, { status: 400 });
        }
        const starts = new Date(s.slot_starts_at).getTime();
        const ends = new Date(s.slot_ends_at).getTime();
        if (!Number.isFinite(starts) || !Number.isFinite(ends) || starts >= ends) {
          return NextResponse.json({ error: "Invalid blocked slot time range" }, { status: 400 });
        }
        blockedSlots.push({
          slot_starts_at: new Date(starts).toISOString(),
          slot_ends_at: new Date(ends).toISOString(),
          reason: typeof s.reason === "string" && s.reason.trim() ? s.reason.trim() : null,
        });
      }
    }

    // Replace weekly slots: delete all then insert
    const { error: deleteSlotErr } = await auth.admin
      .from("coach_availability")
      .delete()
      .eq("coach_id", auth.user.id);

    if (deleteSlotErr) {
      return NextResponse.json({ error: deleteSlotErr.message }, { status: 500 });
    }

    if (slots.length > 0) {
      const { error: insertSlotErr } = await auth.admin
        .from("coach_availability")
        .insert(slots.map((s) => ({ coach_id: auth.user.id, ...s })));

      if (insertSlotErr) {
        return NextResponse.json({ error: insertSlotErr.message }, { status: 500 });
      }
    }

    // Replace blocked dates: delete all then insert
    const { error: deleteBlockErr } = await auth.admin
      .from("coach_availability_blocks")
      .delete()
      .eq("coach_id", auth.user.id);

    if (deleteBlockErr) {
      return NextResponse.json({ error: deleteBlockErr.message }, { status: 500 });
    }

    if (blockedDates.length > 0) {
      const { error: insertBlockErr } = await auth.admin
        .from("coach_availability_blocks")
        .insert(blockedDates.map((d) => ({ coach_id: auth.user.id, blocked_date: d })));

      if (insertBlockErr) {
        return NextResponse.json({ error: insertBlockErr.message }, { status: 500 });
      }
    }

    const { error: deleteSlotBlockErr } = await auth.admin
      .from("coach_availability_slot_blocks")
      .delete()
      .eq("coach_id", auth.user.id);

    if (deleteSlotBlockErr && !missingSlotBlockTable(deleteSlotBlockErr)) {
      return NextResponse.json({ error: deleteSlotBlockErr.message }, { status: 500 });
    }

    if (blockedSlots.length > 0 && !deleteSlotBlockErr) {
      const { error: insertSlotBlockErr } = await auth.admin
        .from("coach_availability_slot_blocks")
        .insert(blockedSlots.map((s) => ({ coach_id: auth.user.id, ...s })));

      if (insertSlotBlockErr) {
        return NextResponse.json({ error: insertSlotBlockErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to save availability" }, { status: 500 });
  }
}
