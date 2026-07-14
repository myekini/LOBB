import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PUBLIC ROUTE — no authentication required.
// Uptime probe: confirms the app is serving and the database answers.
// Returns no internal details beyond up/down per dependency.

export const dynamic = "force-dynamic";

export async function GET() {
  let database = false;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
    database = !error;
  } catch {
    database = false;
  }

  const healthy = database;
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", database, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  );
}
