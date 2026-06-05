import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

export const GET = withRole("admin", async (_request, auth) => {
  const { data, error } = await auth.admin
    .from("coaches")
    .select("*")
    .eq("status", "pending_review")
    .order("created_at");

  if (error) return internalError(error);
  return NextResponse.json({ coaches: data ?? [] });
});
