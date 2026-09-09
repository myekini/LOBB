"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[80] bg-black/40" />
        <Dialog.Popup
          className="fixed inset-x-0 bottom-0 z-[80] p-4 md:flex md:items-center md:justify-center md:inset-0"
          aria-labelledby="lobb-modal-title"
        >
          <section className="mx-auto w-full max-w-md rounded-t-[var(--lobb-radius-lg)] bg-[var(--lobb-bg-elevated)] p-5 shadow-[var(--lobb-shadow-modal)] md:rounded-[var(--lobb-radius-lg)]">
            <div className="flex items-start justify-between gap-4">
              <h2 id="lobb-modal-title" className="text-lg font-semibold">{title}</h2>
              <Dialog.Close
                onClick={onClose}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-[var(--lobb-radius-sm)] text-[var(--lobb-text-secondary)] transition hover:bg-[var(--lobb-bg-secondary)]"
              >
                <X className="size-5" />
              </Dialog.Close>
            </div>
            <div className="mt-4">{children}</div>
          </section>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
