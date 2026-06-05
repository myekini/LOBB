"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { showLobbToast } from "@/providers/lobb-global-state";

export function CoachLogoutButton({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Could not log out");
      window.location.href = "/auth/login";
    } catch (error) {
      showLobbToast({ type: "error", message: error instanceof Error ? error.message : "Could not log out" });
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className={
        compact
          ? "flex size-9 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)] disabled:opacity-60"
          : "flex w-full items-center justify-between rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-5 py-4 text-sm font-black text-[var(--lobb-text-secondary)] transition hover:text-red-500 disabled:opacity-60"
      }
      aria-label="Log out"
    >
      {!compact && <span>{busy ? "Signing out" : "Sign out"}</span>}
      {compact && <LogOut className="size-4" />}
    </button>
  );
}
