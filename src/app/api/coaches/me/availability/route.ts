import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import type { CoachAvailabilityRow, CoachAvailabilityBlock } from "@/lib/types";
import { apiError } from "@/lib/api-response";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const auth = await requireRole(["coach", "admin"]);
    if (auth.error) {
      return apiError(auth.status === 401 ? "AUTH_EXPIRED" : "FORBIDDEN", auth.status);
    }

    const [slotsResult, blocksResult] = await Promise.all([
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
    ]);

    if (slotsResult.error) {
      return apiError("AVAILABILITY_LOAD_FAILED", 500);
    }
    if (blocksResult.error) {
      return apiError("AVAILABILITY_LOAD_FAILED", 500);
    }

    return NextResponse.json({
      slots: (slotsResult.data ?? []) as CoachAvailabilityRow[],
      blocks: (blocksResult.data ?? []) as CoachAvailabilityBlock[],
    });
  } catch {
    return apiError("AVAILABILITY_LOAD_FAILED", 500);
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
// Full replace of weekly slots + blocked dates.
// Body: { slots: { day_of_week, starts_at, ends_at }[], blocked_dates: string[] }

type SlotInput = { day_of_week: number; starts_at: string; ends_at: string };
type PutBody  = { slots?: SlotInput[]; blocked_dates?: string[] };

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

    // p_slots is jsonb — pass the array itself; stringifying makes it a jsonb
    // string scalar and jsonb_array_length() fails with "cannot get array
    // length of a scalar"
    const { error: rpcError } = await auth.admin.rpc("set_coach_availability", {
      p_coach_id: auth.user.id,
      p_slots: slots,
      p_blocked_dates: blockedDates,
    });

    if (rpcError) {
      return apiError("AVAILABILITY_SAVE_FAILED", 500);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return apiError("AVAILABILITY_SAVE_FAILED", 500);
  }
}
