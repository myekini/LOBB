import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  const { supabase, user } = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = typeof body?.password === "string" ? body.password : "";

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("weak") || msg.includes("pwned") || msg.includes("password")) {
      return NextResponse.json(
        { error: "That password is too weak or has been found in a data breach. Pick another." },
        { status: 400 },
      );
    }
    if (msg.includes("same") || msg.includes("different from the old")) {
      return NextResponse.json(
        { error: "That's already your password." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Could not set your password. Try again." }, { status: 400 });
  }

  // UI hint only — auth.users is the source of truth.
  await createAdminClient()
    .from("profiles")
    .update({ has_password: true })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
