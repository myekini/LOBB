import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith("/api")) {
    return response;
  }

  const playerRoutes = ["/dashboard", "/profile", "/book"];
  const coachRoutes = ["/coach"];
  const adminRoutes = ["/admin"];
  const setupRoutes = ["/auth/role", "/auth/setup"];
  const authRoutes = ["/auth/login", "/auth/verify"];
  const isProtected =
    [...playerRoutes, ...coachRoutes, ...adminRoutes, ...setupRoutes].some((route) => pathname.startsWith(route));

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  if (!user) {
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const isCoachSetupRoute = pathname.startsWith("/auth/setup/coach");
  const isCoachAppRoute = coachRoutes.some((r) => pathname.startsWith(r));

  // Guard: coach accessing app routes but onboarding is incomplete
  if (
    profile?.role === "coach" &&
    isCoachAppRoute &&
    !isCoachSetupRoute
  ) {
    const { data: coach } = await supabase
      .from("coaches")
      .select("bio, experience_years, skill_levels, certifications")
      .eq("id", user.id)
      .maybeSingle();

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.search = "";

    if (!coach) {
      redirectUrl.pathname = "/auth/setup/coach/1";
      return NextResponse.redirect(redirectUrl);
    }

    const hasStep2 =
      typeof coach.bio === "string" &&
      coach.bio.length >= 50 &&
      typeof coach.experience_years === "number" &&
      coach.experience_years > 0;

    const hasStep3 =
      Array.isArray(coach.skill_levels) && (coach.skill_levels as string[]).length > 0;

    const hasStep4 =
      Array.isArray(coach.certifications) && (coach.certifications as string[]).length > 0;

    if (!hasStep2) {
      redirectUrl.pathname = "/auth/setup/coach/2";
      return NextResponse.redirect(redirectUrl);
    }
    if (!hasStep3) {
      redirectUrl.pathname = "/auth/setup/coach/3";
      return NextResponse.redirect(redirectUrl);
    }
    if (!hasStep4) {
      redirectUrl.pathname = "/auth/setup/coach/4";
      return NextResponse.redirect(redirectUrl);
    }
  }

  const role = profile?.role as "player" | "coach" | "admin" | undefined;
  const needsRole = !role && !setupRoutes.some((route) => pathname.startsWith(route));

  if (needsRole && !authRoutes.some((route) => pathname.startsWith(route))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/role";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (role && authRoutes.some((route) => pathname.startsWith(route))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === "coach" ? "/coach/dashboard" : role === "admin" ? "/admin" : "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (adminRoutes.some((route) => pathname.startsWith(route)) && role !== "admin") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = role === "coach" ? "/coach/dashboard" : "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (coachRoutes.some((route) => pathname.startsWith(route)) && role && role !== "coach" && role !== "admin") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (playerRoutes.some((route) => pathname.startsWith(route)) && role === "coach") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/coach/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
