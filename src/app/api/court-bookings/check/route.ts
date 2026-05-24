import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NATIONAL_STADIUM_COURTS } from "@/lib/types";

export const dynamic = "force-dynamic";

function isWeekday(iso: string) {
  const day = new Date(iso).getDay();
  return day >= 1 && day <= 5;
}

function slotHour(iso: string) {
  // Interpret in Africa/Lagos (UTC+1)
  return new Date(iso).getHours();
}

function isMemberCourtAccessible(iso: string) {
  return isWeekday(iso) && slotHour(iso) < 16;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courtId      = searchParams.get("court_id");
  const slotStartsAt = searchParams.get("slot_starts_at");

  if (!courtId || !slotStartsAt) {
    return NextResponse.json({ error: "court_id and slot_starts_at are required" }, { status: 400 });
  }

  // Validate that the court exists
  const court = NATIONAL_STADIUM_COURTS.find((c) => c.id === courtId);
  if (!court) {
    return NextResponse.json({ error: "Unknown court" }, { status: 400 });
  }

  // Check member court access rule
  if (court.isMemberCourt && !isMemberCourtAccessible(slotStartsAt)) {
    const isWeekend = !isWeekday(slotStartsAt);
    return NextResponse.json({
      available: false,
      reason: isWeekend
        ? "This court is for members only on weekends."
        : "This court is for members only after 4pm on weekdays.",
    });
  }

  // Check if the slot is already booked at the DB level
  const admin = createAdminClient();
  const slotStart = new Date(slotStartsAt);
  const slotEnd   = new Date(slotStart.getTime() + 60 * 60 * 1000).toISOString();

  const { data: existing, error } = await admin
    .from("court_slot_bookings")
    .select("id")
    .eq("court_id", courtId)
    .eq("slot_starts_at", slotStartsAt)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ available: false, reason: "This court is already booked for that time slot." });
  }

  return NextResponse.json({ available: true, slot_ends_at: slotEnd });
}
