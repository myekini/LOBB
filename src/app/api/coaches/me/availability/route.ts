import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import type { CoachAvailabilityRow, CoachAvailabilityBlock, CoachAvailabilitySlotBlock } from "@/lib/types";
import { apiError } from "@/lib/api-response";

type AvailabilityBookingBlock = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  player_name: string | null;
};

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
      return apiError(auth.status === 401 ? "AUTH_EXPIRED" : "FORBIDDEN", auth.status);
    }

    const [slotsResult, blocksResult, slotBlocksResult, bookingBlocksResult] = await Promise.all([
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
      auth.admin
        .from("bookings")
        .select("id, starts_at, ends_at, status, players!bookings_player_id_fkey(full_name)")
        .eq("coach_id", auth.user.id)
        .in("status", ["pending", "pending_payment", "confirmed"])
        .gte("starts_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("starts_at"),
    ]);

    if (slotsResult.error) {
      return apiError("AVAILABILITY_LOAD_FAILED", 500);
    }
    if (blocksResult.error) {
      return apiError("AVAILABILITY_LOAD_FAILED", 500);
    }
    if (slotBlocksResult.error && !missingSlotBlockTable(slotBlocksResult.error)) {
      return apiError("AVAILABILITY_LOAD_FAILED", 500);
    }
    if (bookingBlocksResult.error) {
      return apiError("AVAILABILITY_LOAD_FAILED", 500);
    }

    return NextResponse.json({
      slots: (slotsResult.data ?? []) as CoachAvailabilityRow[],
      blocks: (blocksResult.data ?? []) as CoachAvailabilityBlock[],
      slot_blocks: slotBlocksResult.error ? [] : ((slotBlocksResult.data ?? []) as CoachAvailabilitySlotBlock[]),
      booking_blocks: (bookingBlocksResult.data ?? []).map((booking): AvailabilityBookingBlock => {
        const player = Array.isArray(booking.players) ? booking.players[0] : booking.players;
        return {
          id: booking.id,
          starts_at: new Date(booking.starts_at).toISOString(),
          ends_at: new Date(booking.ends_at).toISOString(),
          status: booking.status,
          player_name: player?.full_name ?? null,
        };
      }),
    });
  } catch {
    return apiError("AVAILABILITY_LOAD_FAILED", 500);
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
// Full replace of weekly slots + blocked dates.
// Body: { slots: { day_of_week, starts_at, ends_at }[], blocked_dates: string[] }

type SlotInput = { day_of_week: number; starts_at: string; ends_at: string };
type SlotBlockInput = { slot_starts_at: string; slot_ends_at: string; reason?: string | null };
type PutBody  = { slots?: SlotInput[]; blocked_dates?: string[]; blocked_slots?: SlotBlockInput[] };

function timeToMinutes(value: string) {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

export async function PUT(request: Request) {
  try {
    const auth = await requireRole(["coach", "admin"]);
    if (auth.error) {
      return apiError(auth.status === 401 ? "AUTH_EXPIRED" : "FORBIDDEN", auth.status);
    }

    const body = (await request.json()) as PutBody;

    // Validate slots
    const slots: SlotInput[] = [];
    if (Array.isArray(body.slots)) {
      for (const s of body.slots) {
        const dow = Number(s.day_of_week);
        if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
          return apiError("VALIDATION_ERROR", 400, { message: "Choose valid days for your weekly hours." });
        }
        if (typeof s.starts_at !== "string" || typeof s.ends_at !== "string") {
          return apiError("AVAILABILITY_INVALID_HOURS", 400);
        }
        if (s.starts_at >= s.ends_at) {
          return apiError("AVAILABILITY_INVALID_HOURS", 400);
        }
        slots.push({ day_of_week: dow, starts_at: s.starts_at, ends_at: s.ends_at });
      }
    }

    for (let dow = 0; dow <= 6; dow += 1) {
      const daySlots = slots
        .filter((slot) => slot.day_of_week === dow)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

      for (let index = 1; index < daySlots.length; index += 1) {
        if (timeToMinutes(daySlots[index].starts_at) < timeToMinutes(daySlots[index - 1].ends_at)) {
          return apiError("AVAILABILITY_OVERLAP", 400);
        }
      }
    }

    // Validate blocked_dates
    const blockedDates: string[] = [];
    if (Array.isArray(body.blocked_dates)) {
      for (const d of body.blocked_dates) {
        if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          return apiError("VALIDATION_ERROR", 400, { message: "Blocked dates must use a valid date format." });
        }
        blockedDates.push(d);
      }
    }

    // Validate blocked slots
    const blockedSlots: SlotBlockInput[] = [];
    if (Array.isArray(body.blocked_slots)) {
      for (const s of body.blocked_slots) {
        if (typeof s.slot_starts_at !== "string" || typeof s.slot_ends_at !== "string") {
          return apiError("VALIDATION_ERROR", 400, { message: "Blocked slots need valid start and end times." });
        }
        const starts = new Date(s.slot_starts_at).getTime();
        const ends = new Date(s.slot_ends_at).getTime();
        if (!Number.isFinite(starts) || !Number.isFinite(ends) || starts >= ends) {
          return apiError("VALIDATION_ERROR", 400, { message: "Blocked slots need a valid time range." });
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
      return apiError("AVAILABILITY_SAVE_FAILED", 500);
    }

    if (slots.length > 0) {
      const { error: insertSlotErr } = await auth.admin
        .from("coach_availability")
        .insert(slots.map((s) => ({ coach_id: auth.user.id, is_active: true, ...s })));

      if (insertSlotErr) {
        return apiError("AVAILABILITY_SAVE_FAILED", 500);
      }
    }

    // Replace blocked dates: delete all then insert
    const { error: deleteBlockErr } = await auth.admin
      .from("coach_availability_blocks")
      .delete()
      .eq("coach_id", auth.user.id);

    if (deleteBlockErr) {
      return apiError("AVAILABILITY_SAVE_FAILED", 500);
    }

    if (blockedDates.length > 0) {
      const { error: insertBlockErr } = await auth.admin
        .from("coach_availability_blocks")
        .insert(blockedDates.map((d) => ({ coach_id: auth.user.id, blocked_date: d })));

      if (insertBlockErr) {
        return apiError("AVAILABILITY_SAVE_FAILED", 500);
      }
    }

    const { error: deleteSlotBlockErr } = await auth.admin
      .from("coach_availability_slot_blocks")
      .delete()
      .eq("coach_id", auth.user.id);

    if (deleteSlotBlockErr && !missingSlotBlockTable(deleteSlotBlockErr)) {
      return apiError("AVAILABILITY_SAVE_FAILED", 500);
    }

    if (blockedSlots.length > 0 && !deleteSlotBlockErr) {
      const { error: insertSlotBlockErr } = await auth.admin
        .from("coach_availability_slot_blocks")
        .insert(blockedSlots.map((s) => ({ coach_id: auth.user.id, ...s })));

      if (insertSlotBlockErr) {
        return apiError("AVAILABILITY_SAVE_FAILED", 500);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return apiError("AVAILABILITY_SAVE_FAILED", 500);
  }
}
