"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, Info, X, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type LobbToastType = "success" | "error" | "info" | "warning";

type LobbToastPayload = {
  type: LobbToastType;
  message: string;
  title?: string;
};

type LobbToast = LobbToastPayload & {
  id: number;
};

const toastStyles: Record<LobbToastType, { accent: string; bg: string; Icon: LucideIcon; title: string }> = {
  success: { accent: "var(--lobb-success)", bg: "var(--lobb-success-soft)", Icon: CheckCircle2, title: "Done" },
  error: { accent: "var(--lobb-error)", bg: "rgba(214,64,69,0.12)", Icon: XCircle, title: "Action needed" },
  info: { accent: "var(--lobb-clay)", bg: "var(--lobb-clay-light)", Icon: Info, title: "Update" },
  warning: { accent: "var(--lobb-star)", bg: "rgba(244,162,40,0.16)", Icon: AlertTriangle, title: "Heads up" },
};

export function showLobbToast(payload: LobbToastPayload) {
  window.dispatchEvent(new CustomEvent<LobbToastPayload>("lobb:toast", { detail: payload }));
}

export function LobbToaster() {
  const [toasts, setToasts] = useState<LobbToast[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<LobbToastPayload>).detail;
      const id = Date.now();
      setToasts((current) => [...current, { ...detail, id }].slice(-3));
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 4000);
    };

    window.addEventListener("lobb:toast", onToast);
    return () => window.removeEventListener("lobb:toast", onToast);
  }, []);

  const dismiss = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-[100] flex flex-col items-center gap-2 px-4 md:bottom-auto md:right-5 md:left-auto md:top-5 md:items-end md:px-0">
      {toasts.map((toast) => {
        const { Icon, accent, bg, title } = toastStyles[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto relative grid w-full max-w-[390px] grid-cols-[auto_1fr_auto] gap-3 overflow-hidden rounded-[22px] border border-white/55 bg-[var(--lobb-bg-elevated)]/94 px-4 py-3.5 text-[var(--lobb-text-primary)] shadow-[0_18px_54px_rgba(13,13,13,0.18)] backdrop-blur-2xl",
              "animate-[toastSlideDown_300ms_ease-out]"
            )}
          >
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
            <span className="mt-0.5 flex size-10 items-center justify-center rounded-[15px] ring-1 ring-black/5" style={{ background: bg, color: accent }}>
              <Icon className="size-4 shrink-0" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black leading-5">{toast.title ?? title}</span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-[var(--lobb-text-secondary)]">{toast.message}</span>
            </span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="pointer-events-auto flex size-8 items-center justify-center rounded-full text-[var(--lobb-text-tertiary)] transition hover:bg-[var(--lobb-bg-secondary)] hover:text-[var(--lobb-text-primary)]"
              aria-label="Dismiss notification"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
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
    <div className="fixed inset-x-3 top-3 z-[90] mx-auto grid min-h-11 max-w-md grid-cols-[auto_1fr] items-center gap-3 rounded-[16px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-inverse)] px-4 py-3 text-sm font-black text-[var(--lobb-text-inverse)] shadow-[var(--lobb-shadow-modal)]">
      <CloudOff className="size-4 shrink-0 text-[var(--lobb-clay)]" />
      <span>
        <span className="block">Offline mode</span>
        <span className="block text-xs font-semibold opacity-70">Showing cached data where available.</span>
      </span>
    </div>
  );
}
