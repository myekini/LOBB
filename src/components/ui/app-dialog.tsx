"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  busy?: boolean;
  tone?: "default" | "danger";
  className?: string;
};

export function AppDialog({ open, onOpenChange, title, description, children, footer, busy = false, tone = "default", className }: AppDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[80] bg-[#090807]/50 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-md rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-1.5 shadow-[var(--lobb-shadow-modal)] outline-none transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 sm:inset-x-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
          <section className={cn("rounded-[calc(var(--lobb-radius-lg)-4px)] bg-[var(--lobb-bg-primary)] p-5 sm:p-6", className)}>
            <div className="flex items-start gap-3">
              {tone === "danger" && (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-error)]/10 text-[var(--lobb-error)]">
                  <AlertTriangle className="size-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-lg font-semibold tracking-tight text-[var(--lobb-text-primary)]">{title}</Dialog.Title>
                {description && <Dialog.Description className="mt-1.5 text-sm leading-6 text-[var(--lobb-text-secondary)]">{description}</Dialog.Description>}
              </div>
              <Dialog.Close aria-label="Close" disabled={busy} className="flex size-9 shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] text-[var(--lobb-text-secondary)] transition-colors hover:bg-[var(--lobb-bg-secondary)] disabled:opacity-40">
                <X className="size-4" />
              </Dialog.Close>
            </div>
            {children && <div className="mt-5">{children}</div>}
            {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
          </section>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type ConfirmDialogProps = Omit<AppDialogProps, "children" | "footer"> & {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

export function ConfirmDialog({ confirmLabel = "Continue", cancelLabel = "Cancel", onConfirm, tone = "default", ...props }: ConfirmDialogProps) {
  return (
    <AppDialog
      {...props}
      tone={tone}
      footer={
        <>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={props.busy} className="sm:min-w-24">{cancelLabel}</Button>
          <Button variant={tone === "danger" ? "destructive" : "dark"} onClick={onConfirm} disabled={props.busy} className="sm:min-w-28">
            {props.busy ? "Please wait…" : confirmLabel}
          </Button>
        </>
      }
    />
  );
}
