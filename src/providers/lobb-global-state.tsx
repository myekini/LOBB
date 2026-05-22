"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, Info, XCircle, type LucideIcon } from "lucide-react";
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
    <div className="fixed inset-x-3 top-3 z-[90] mx-auto flex min-h-11 max-w-md items-center gap-3 rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-black)] px-4 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
      <CloudOff className="size-4 shrink-0 text-[var(--lobb-clay)]" />
      <span>You&apos;re offline. Showing cached data where available.</span>
    </div>
  );
}
