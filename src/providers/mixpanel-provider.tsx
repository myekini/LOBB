"use client";

import mixpanel from "mixpanel-browser";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const mixpanelToken =
  process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ||
  "a7fd42f9bdc4327b3b07ea52384a467a";

const mixpanelEnabled = process.env.NEXT_PUBLIC_MIXPANEL_ENABLED !== "false";

let initialized = false;

function initMixpanel() {
  if (initialized || !mixpanelToken || !mixpanelEnabled || typeof window === "undefined") return;

  mixpanel.init(mixpanelToken, {
    autocapture: true,
    record_sessions_percent: 100,
    debug: process.env.NODE_ENV === "development",
  });

  initialized = true;
}

function MixpanelPageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initMixpanel();
  }, []);

  useEffect(() => {
    if (!initialized || !pathname) return;

    const query = searchParams.toString();
    mixpanel.track("Page Viewed", {
      path: pathname,
      url: query ? `${window.location.origin}${pathname}?${query}` : `${window.location.origin}${pathname}`,
    });
  }, [pathname, searchParams]);

  return null;
}

function MixpanelIdentity() {
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    initMixpanel();
    if (!initialized) return;

    const supabase = createClient();

    const syncIdentity = async (userId: string | null) => {
      if (!initialized) return;

      if (!userId) {
        lastUserId.current = null;
        mixpanel.reset();
        return;
      }

      if (lastUserId.current === userId) return;

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      mixpanel.identify(userId);
      mixpanel.people.set({
        role: data?.role ?? "unknown",
      });

      lastUserId.current = userId;
    };

    supabase.auth.getUser().then(({ data }) => {
      syncIdentity(data.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncIdentity(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export function LobbMixpanelProvider() {
  return (
    <>
      <Suspense fallback={null}>
        <MixpanelPageviews />
      </Suspense>
      <MixpanelIdentity />
    </>
  );
}
