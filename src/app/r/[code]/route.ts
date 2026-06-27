import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE_NAME = "lobb_ref";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const home = new URL("/", request.url);
  const response = NextResponse.redirect(home);

  // First-touch attribution: never overwrite an existing cookie
  const cookieHeader = request.headers.get("cookie") ?? "";
  const existing = cookieHeader.split(";").find((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
  if (existing) return response;

  // Referral codes are stored in uppercase. Normalize incoming links so both
  // manually typed lowercase URLs and the uppercase dashboard link work.
  const code = params.code.trim().toUpperCase();

  // Validate the code belongs to an active coach
  const admin = createAdminClient();
  const { data: coach } = await admin
    .from("coaches")
    .select("id")
    .eq("referral_code", code)
    .eq("status", "active")
    .maybeSingle();

  if (!coach) return response; // unknown or inactive coach — redirect clean

  response.cookies.set(COOKIE_NAME, code, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
