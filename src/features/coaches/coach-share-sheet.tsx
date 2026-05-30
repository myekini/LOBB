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
        className={triggerClassName ?? "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#d8d2c9] bg-white px-4 text-xs font-black text-[#1a1c1c] transition hover:border-[#9c440f]/35 disabled:cursor-not-allowed disabled:opacity-45"}
      >
        <Share2 className="size-4" />
        {triggerLabel && <span>{triggerLabel}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/45 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOpen(false)}>
          <section
            className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[28px] border border-[#ded9d1] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#ebe4dc] p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9c440f]">Share profile</p>
                <h2 className="mt-1 text-xl font-black leading-tight text-[#1a1c1c]">{coachName}</h2>
                <p className="mt-1 truncate text-sm font-semibold text-[#6b6560]">{profileUrl}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f3f0eb] text-[#444748]">
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-4 p-5">
              <div className="mx-auto rounded-[24px] border border-[#ead7c6] bg-[#fff8f2] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt={`QR code for ${coachName}'s LOBB profile`} className="size-[220px] rounded-[16px] bg-white" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={copyLink} className="flex h-12 items-center justify-center gap-2 rounded-[14px] border border-[#ded9d1] bg-[#f9f9f9] text-sm font-black text-[#1a1c1c]">
                  <Copy className="size-4 text-[#9c440f]" />
                  Copy link
                </button>
                <button type="button" onClick={nativeShare} className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-[#1a1c1c] text-sm font-black text-white">
                  <Share2 className="size-4 text-[#d96b27]" />
                  Share
                </button>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-[14px] border border-[#ded9d1] bg-[#f9f9f9] text-sm font-black text-[#1a1c1c]">
                  <MessageCircle className="size-4 text-[#9c440f]" />
                  WhatsApp
                </a>
                <a href={qrUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-[14px] border border-[#ded9d1] bg-[#f9f9f9] text-sm font-black text-[#1a1c1c]">
                  <Download className="size-4 text-[#9c440f]" />
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
