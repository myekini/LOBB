"use client";

import { X } from "lucide-react";

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/40 p-4 md:items-center" onClick={onClose}>
      <section className="mx-auto w-full max-w-md rounded-t-[24px] bg-[var(--lobb-bg-elevated)] p-5 shadow-[var(--lobb-shadow-modal)] md:rounded-[24px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-black">{title}</h2>
          <button onClick={onClose} aria-label="Close"><X className="size-5" /></button>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}
