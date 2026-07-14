import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE_NAME = "lobb_ref";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const code = params.code.trim();

  // Look up the referring coach (case-insensitive — legacy codes vary in case)
  const admin = createAdminClient();
  const { data: coach } = await admin
    .from("coaches")
    .select("id, slug")
    .ilike("referral_code", code)
    .eq("status", "active")
    .maybeSingle();

  // Land referred visitors straight on the coach's profile — when T-Pro shares
  // his link, his students want to book *him*, not browse the homepage.
  const destination = coach?.slug
    ? new URL(`/coaches/${coach.slug}`, request.url)
    : new URL("/", request.url);
  const response = NextResponse.redirect(destination);

  if (!coach) return response; // unknown or inactive code — clean redirect home

  // First-touch attribution: never overwrite an existing referral cookie
  const cookieHeader = request.headers.get("cookie") ?? "";
  const existing = cookieHeader.split(";").find((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
  if (existing) return response;

  response.cookies.set(COOKIE_NAME, code.toUpperCase(), {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
