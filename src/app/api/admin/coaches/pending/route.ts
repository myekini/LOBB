import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";

export async function GET() {
  const auth = await requireRole("admin");
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.admin
    .from("coaches")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coaches: data ?? [] });
}
