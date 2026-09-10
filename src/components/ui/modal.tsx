"use client";

import { AppDialog } from "@/components/ui/app-dialog";

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <AppDialog open onOpenChange={(open) => { if (!open) onClose(); }} title={title}>{children}</AppDialog>;
}
