import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  // Vercel cron sends Authorization: Bearer <secret>
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Also support x-admin-secret for manual triggers
  return request.headers.get("x-admin-secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const admin = createAdminClient();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // Find all confirmed bookings whose session has ended 2+ hours ago with no escrow release
  const { data: bookings, error: fetchError } = await admin
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .lte("ends_at", twoHoursAgo)
    .is("escrow_released_at", null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const ids = (bookings ?? []).map((b) => b.id);
  if (ids.length === 0) {
    return NextResponse.json({ released: 0 });
  }

  const results = await Promise.allSettled(
    ids.map((id) => admin.rpc("release_escrow", { p_booking_id: id }))
  );

  const released = results.filter((r) => r.status === "fulfilled").length;
  const failed   = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ released, failed, total: ids.length });
}
