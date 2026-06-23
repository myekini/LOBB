import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--lobb-border)] bg-[var(--lobb-bg)] px-5 py-8 text-sm font-semibold text-[var(--lobb-muted)]">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-4">
        <Link href="/about">About</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/cancellation-policy">Cancellation Policy</Link>
        <Link href="/contact">Contact</Link>
      </div>
    </footer>
  );
}
