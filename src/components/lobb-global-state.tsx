"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, Info, RotateCcw, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type LobbToastType = "success" | "error" | "info" | "warning";

type LobbToastPayload = {
  type: LobbToastType;
  message: string;
};

type LobbToast = LobbToastPayload & {
  id: number;
};

const toastStyles: Record<LobbToastType, { border: string; Icon: LucideIcon }> = {
  success: { border: "border-l-[var(--lobb-success)]", Icon: CheckCircle2 },
  error: { border: "border-l-[#BA1A1A]", Icon: XCircle },
  info: { border: "border-l-[var(--lobb-clay)]", Icon: Info },
  warning: { border: "border-l-[var(--lobb-warning)]", Icon: AlertTriangle },
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

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-4">
      {toasts.map((toast) => {
        const { Icon, border } = toastStyles[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[16px] border border-[var(--lobb-border)] border-l-4 bg-[var(--lobb-surface)] px-4 py-3 text-sm font-black text-[var(--lobb-black)] shadow-[0_16px_38px_rgba(13,13,13,0.16)]",
              "animate-[toastSlideDown_300ms_ease-out]",
              border,
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{toast.message}</span>
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--lobb-bg)] px-6 text-center text-[var(--lobb-black)]">
      <section className="w-full max-w-sm">
        <div className="mx-auto flex size-24 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-clay)]">
          <CloudOff className="size-12" />
        </div>
        <h1 className="mt-6 text-2xl font-black">No connection</h1>
        <p className="mx-auto mt-3 max-w-[260px] text-sm font-semibold leading-6 text-[var(--lobb-muted)]">
          LOBB needs internet to work. Check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--lobb-clay)] px-6 text-sm font-black text-white"
        >
          <RotateCcw className="size-4" />
          Retry
        </button>
      </section>
    </div>
  );
}
