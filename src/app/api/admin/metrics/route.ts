import { NextResponse } from "next/server";
import { withRole } from "@/lib/api-auth";
import { internalError } from "@/lib/api-response";

export const GET = withRole("admin", async (_request, auth) => {
  const { data, error } = await auth.admin.from("admin_core_metrics").select("*").maybeSingle();
  if (error) return internalError(error);
  return NextResponse.json({ metrics: data });
});
