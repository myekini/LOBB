import Link from "next/link";
import { ThemeToggle } from "@/components/common/theme-toggle";

export function Navbar() {
  return (
    <header className="border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="font-black tracking-[0.18em]">LOBB</Link>
        <div className="flex items-center gap-2">
          <Link href="/coaches" className="text-sm font-black text-[var(--lobb-clay)]">Browse coaches</Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
