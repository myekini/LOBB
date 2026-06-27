// PUBLIC ROUTE — no authentication required
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { internalError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = createAdminClient();
  const url = new URL(request.url);
  const location = url.searchParams.get("location");
  const specialization = url.searchParams.get("specialization");
  const priceMin = Number(url.searchParams.get("price_min") ?? "");
  const priceMax = Number(url.searchParams.get("price_max") ?? "");

  let query = admin
    .from("coach_profiles_public")
    .select("*")
    .eq("status", "active")
    .order("avg_rating", { ascending: false, nullsFirst: false });

  if (location) {
    query = query.or(`primary_location.ilike.%${location}%,service_areas.cs.{${location}}`);
  }
  if (specialization) {
    query = query.contains("specializations", [specialization]);
  }
  if (Number.isFinite(priceMin)) {
    query = query.gte("hourly_rate_ngn", priceMin);
  }
  if (Number.isFinite(priceMax)) {
    query = query.lte("hourly_rate_ngn", priceMax);
  }

  const { data, error } = await query.limit(100);
  if (error) return internalError(error);

  return NextResponse.json(
    { coaches: data ?? [] },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
