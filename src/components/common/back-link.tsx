import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({
  href,
  label = "Back",
  className = "",
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 text-sm font-black text-[var(--lobb-black)] transition hover:bg-[var(--lobb-surface-2)] ${className}`}
      aria-label={label}
    >
      <ArrowLeft className="size-4" />
      <span>{label}</span>
    </Link>
  );
}
