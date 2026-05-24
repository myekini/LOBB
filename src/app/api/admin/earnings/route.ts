import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [metrics, bookings] = await Promise.all([
    auth.admin.from("admin_core_metrics").select("*").maybeSingle(),
    auth.admin
      .from("bookings")
      .select(
        "id, starts_at, status, gross_amount, total_amount_ngn, platform_commission_ngn, convenience_fee_ngn, coaches!bookings_coach_id_fkey(full_name), players!bookings_player_id_fkey(full_name), payments(status, paid_at, paystack_reference)"
      )
      .in("status", ["confirmed", "completed"])
      .order("starts_at", { ascending: false })
      .limit(12),
  ]);

  for (const result of [metrics, bookings]) {
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    metrics: metrics.data,
    recent_revenue: bookings.data ?? [],
  });
}
