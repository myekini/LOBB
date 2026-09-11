"use client";

import { Button as LobbButton } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";

const DISMISS_KEY = "lobb.security-nudge-dismissed";

/**
 * Shown to signed-in users who have neither a password nor a passkey — they can
 * currently only get back in via an email code. Dismissible; re-appears if they
 * still have no credential on the next full page load after ~14 days.
 */
export function SecurityNudge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    } catch {
      /* private mode */
    }
    if (dismissedAt && Date.now() - dismissedAt < 14 * 24 * 60 * 60 * 1000) return;

    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const u = data?.user;
        if (u && !u.has_password && !u.has_passkey) setShow(true);
      })
      .catch(() => null);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="mb-4 flex items-start gap-3 border border-[var(--lobb-clay)]/25 bg-[var(--lobb-clay)]/8 px-4 py-3.5">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[var(--lobb-clay)]" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[var(--lobb-text-primary)]">
          Add a password or passkey
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--lobb-text-secondary)]">
          Right now you can only sign back in with a verification code sent by email.{" "}
          <Link href="/account/security" className="font-medium text-[var(--lobb-clay)] underline-offset-2 hover:underline">
            Set one up →
          </Link>
        </p>
      </div>
      <LobbButton variant="unstyled"
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-mr-1 -mt-1 shrink-0 rounded-[var(--lobb-radius-lg)] p-1 text-[var(--lobb-text-tertiary)] transition hover:text-[var(--lobb-text-primary)]"
      >
        <X className="size-4" />
      </LobbButton>
    </div>
  );
}
