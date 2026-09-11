import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PUBLIC ROUTE — no authentication required.
// Uptime probe: confirms the app is serving and the database answers, and
// which environment it's actually wired to — the fastest way to catch a
// staging deploy accidentally pointed at production (or vice versa).
// Returns no internal details beyond up/down per dependency and a project
// ref (already public — every client bundle ships NEXT_PUBLIC_SUPABASE_URL).

export const dynamic = "force-dynamic";

function supabaseProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? "unknown";
}

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
    {
      status: healthy ? "ok" : "degraded",
      database,
      supabaseProject: supabaseProjectRef(),
      gitBranch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
