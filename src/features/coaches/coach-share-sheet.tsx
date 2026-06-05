"use client";

import { Copy, Download, MessageCircle, Share2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { showLobbToast } from "@/providers/lobb-global-state";

export function CoachShareSheet({
  coachName,
  profileUrl,
  disabled,
  triggerClassName,
  triggerLabel = "Share",
}: {
  coachName: string;
  profileUrl: string;
  disabled?: boolean;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=14&data=${encodeURIComponent(profileUrl)}`,
    [profileUrl]
  );
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Book a tennis session with ${coachName} on LOBB: ${profileUrl}`)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      showLobbToast({ type: "success", message: "Profile link copied" });
    } catch {
      showLobbToast({ type: "error", message: "Could not copy link" });
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: `${coachName} on LOBB`,
        text: `Book a tennis session with ${coachName} on LOBB.`,
        url: profileUrl,
      });
    } catch {
      // User cancelled or browser blocked share; no toast needed.
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label="Share coach profile"
        className={triggerClassName ?? "inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 text-xs font-black text-[var(--lobb-text-primary)] transition hover:border-[var(--lobb-clay)]/35 disabled:cursor-not-allowed disabled:opacity-45"}
      >
        <Share2 className="size-4" />
        {triggerLabel && <span>{triggerLabel}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/45 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="coach-share-title"
            className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-modal)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--lobb-border-subtle)] p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--lobb-clay)]">Share profile</p>
                <h2 id="coach-share-title" className="mt-1 text-xl font-black leading-tight text-[var(--lobb-text-primary)]">{coachName}</h2>
                <p className="mt-1 truncate text-sm font-semibold text-[var(--lobb-text-secondary)]">{profileUrl}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-primary)]">
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-4 p-5">
              <div className="mx-auto rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] p-4" data-keep-light>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt={`QR code for ${coachName}'s LOBB profile`} className="size-[220px] rounded-[10px] bg-white" data-keep-light />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={copyLink} className="flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-sm font-black text-[var(--lobb-text-primary)]">
                  <Copy className="size-4 text-[var(--lobb-clay)]" />
                  Copy link
                </button>
                <button type="button" onClick={nativeShare} className="flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[var(--lobb-bg-inverse)] text-sm font-black text-[var(--lobb-text-inverse)]">
                  <Share2 className="size-4 text-[var(--lobb-clay)]" />
                  Share
                </button>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-sm font-black text-[var(--lobb-text-primary)]">
                  <MessageCircle className="size-4 text-[var(--lobb-clay)]" />
                  WhatsApp
                </a>
                <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-primary)] text-sm font-black text-[var(--lobb-text-primary)]">
                  <Download className="size-4 text-[var(--lobb-clay)]" />
                  QR image
                </a>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
