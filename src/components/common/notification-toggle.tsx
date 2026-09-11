"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toastAppError, toastAppSuccess } from "@/lib/client-errors";

export function NotificationToggle({ initialEnabled, disabled }: { initialEnabled: boolean; disabled?: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    try {
      const response = await fetch("/api/profile/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!response.ok) throw new Error("Could not update email notifications");
      setEnabled(next);
      toastAppSuccess(next ? "Email notifications enabled" : "Email notifications disabled");
    } catch (error) {
      toastAppError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      type="button"
      variant="unstyled"
      role="switch"
      aria-checked={enabled}
      disabled={disabled || saving}
      onClick={toggle}
      className="h-auto w-full justify-between gap-4 px-5 py-4 text-left"
    >
      <span>
        <span className="block text-sm font-medium text-[var(--lobb-text-primary)]">Email notifications</span>
        <span className="mt-0.5 block text-xs font-normal text-[var(--lobb-text-tertiary)]">Booking, payout and account updates</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${enabled ? "bg-[var(--lobb-clay)]" : "bg-[var(--lobb-border-strong)]"}`}>
        <span className={`absolute left-1 top-1 size-4 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </span>
    </Button>
  );
}
