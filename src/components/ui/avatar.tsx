import { User } from "lucide-react";

export function Avatar({ src, alt = "" }: { src?: string | null; alt?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="size-12 rounded-full object-cover" />
  ) : (
    <span className="flex size-12 items-center justify-center rounded-full bg-[var(--lobb-surface-2)] text-[var(--lobb-muted)]">
      <User className="size-4" />
    </span>
  );
}
