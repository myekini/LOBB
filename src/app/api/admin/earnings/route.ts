import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

export const GET = withRole("admin", async (_request, auth) => {
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

  if (metrics.error) return internalError(metrics.error);
  if (bookings.error) return internalError(bookings.error);

  return NextResponse.json({
    metrics: metrics.data,
    recent_revenue: bookings.data ?? [],
  });
});
