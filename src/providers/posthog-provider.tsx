"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { Suspense, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

let initialized = false;

function initPostHog() {
  if (initialized || !posthogKey || typeof window === "undefined") return;

  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    loaded: (client) => {
      if (process.env.NODE_ENV === "development") {
        client.opt_out_capturing();
      }
    },
  });

  initialized = true;
}

function PostHogPageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (!initialized || !pathname) return;

    const query = searchParams.toString();
    const url = query ? `${window.origin}${pathname}?${query}` : `${window.origin}${pathname}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

function PostHogIdentity() {
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    initPostHog();
    if (!posthogKey) return;

    const supabase = createClient();

    const syncIdentity = async (userId: string | null) => {
      if (!initialized) return;

      if (!userId) {
        lastUserId.current = null;
        posthog.reset();
        return;
      }

      if (lastUserId.current === userId) return;

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      posthog.identify(userId, {
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

export function LobbPostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageviews />
      </Suspense>
      <PostHogIdentity />
      {children}
    </PHProvider>
  );
}
