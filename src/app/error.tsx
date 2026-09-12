"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { TennisLineIllustration } from "@/components/common/lobb-empty-state";

// Root-level catch for any uncaught render/client exception. Without this,
// Next.js falls back to a bare, unstyled "Application error" white screen
// with no recovery path — every crash was a dead end. This gives the user
// a branded retry instead, and surfaces the real error to the console so a
// mobile-only crash leaves a trace next time it happens.
export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", error.message, error.digest ?? "", error.stack ?? "");
  }, [error]);

  return (
    <main className="lobb-app-page flex min-h-screen flex-col items-center justify-center px-6 text-center text-[var(--lobb-text-primary)]">
      <TennisLineIllustration className="h-24 w-32 text-[var(--lobb-clay)]" />
      <h1 className="mt-5 text-[18px] font-semibold">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-[280px] text-[13px] font-medium leading-5 text-[var(--lobb-text-secondary)]">
        That page hit a snag. It&apos;s usually a slow connection — try again, and if it keeps happening let us know.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 flex h-12 items-center gap-2 rounded-[var(--lobb-radius-lg)] bg-[var(--lobb-bg-inverse)] px-6 text-sm font-medium text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-card)] transition active:scale-[0.97]"
      >
        <RefreshCw className="size-4" />
        Try again
      </button>
    </main>
  );
}
