import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = (await request.json()) as { enabled?: unknown };
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "Invalid notification preference" }, { status: 400 });

  const { error } = await supabase
    .from("profiles")
    .update({ email_notifications_enabled: body.enabled })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: "Could not update notification preference" }, { status: 500 });
  return NextResponse.json({ enabled: body.enabled });
}
