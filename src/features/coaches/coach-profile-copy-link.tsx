"use client";

import { Copy } from "lucide-react";
import { showLobbToast } from "@/providers/lobb-global-state";

export function CoachProfileCopyLink({
  disabled,
  profileUrl,
}: {
  disabled?: boolean;
  profileUrl: string;
}) {
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      showLobbToast({ type: "success", message: "Profile link copied" });
    } catch {
      showLobbToast({ type: "error", message: "Could not copy link" });
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={copyLink}
      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] px-3 text-xs font-black text-[var(--lobb-text-primary)] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Copy className="size-3.5 text-[var(--lobb-clay)]" />
      Copy link
    </button>
  );
}
