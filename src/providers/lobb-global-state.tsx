"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { Toaster, toast } from "sonner";

export type LobbToastType = "success" | "error" | "info" | "warning";

type LobbToastPayload = {
  type: LobbToastType;
  message: string;
  title?: string;
};

/**
 * App-wide toast helper. Renders through sonner — call sites pass the same
 * payload as before; `title` becomes the toast text with `message` as the
 * description, otherwise `message` is the toast text.
 */
export function showLobbToast(payload: LobbToastPayload) {
  const fn =
    payload.type === "success" ? toast.success :
    payload.type === "error" ? toast.error :
    payload.type === "warning" ? toast.warning :
    toast.info;
  if (payload.title) {
    fn(payload.title, { description: payload.message });
  } else {
    fn(payload.message);
  }
}

export function LobbToaster() {
  return (
    <Toaster
      position="top-center"
      duration={4000}
      gap={8}
      offset={16}
      mobileOffset={{ top: 12 }}
      toastOptions={{
        style: {
          background: "var(--lobb-bg-elevated)",
          color: "var(--lobb-text-primary)",
          border: "1px solid var(--lobb-border-subtle)",
          borderRadius: "14px",
          fontSize: "13px",
          fontWeight: 600,
          boxShadow: "var(--lobb-shadow-modal)",
        },
      }}
    />
  );
}

export function OfflineState() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-3 top-3 z-[90] mx-auto grid min-h-11 max-w-md grid-cols-[auto_1fr] items-center gap-3 rounded-[14px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-inverse)] px-4 py-3 text-sm font-black text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-modal)]">
      <CloudOff className="size-4 shrink-0 text-[var(--lobb-clay)]" />
      <span>
        <span className="block">Offline mode</span>
        <span className="block text-xs font-semibold opacity-70">Showing cached data where available.</span>
      </span>
    </div>
  );
}
