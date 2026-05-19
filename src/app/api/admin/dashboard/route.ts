import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [metrics, coaches, bookings, disputes] = await Promise.all([
    auth.admin.from("admin_core_metrics").select("*").maybeSingle(),
    auth.admin.from("coaches").select("*").eq("status", "pending_review").order("created_at"),
    auth.admin.from("bookings").select("*").order("starts_at", { ascending: false }).limit(25),
    auth.admin.from("disputes").select("*").eq("status", "open").order("created_at"),
  ]);

  for (const result of [metrics, coaches, bookings, disputes]) {
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    metrics: metrics.data,
    pending_coach_approvals: coaches.data ?? [],
    recent_bookings: bookings.data ?? [],
    open_disputes: disputes.data ?? [],
  });
}
