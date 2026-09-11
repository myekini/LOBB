import Link from "next/link";

export function SimpleInfoPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-5 py-8 text-[var(--lobb-bg-inverse)]">
      <section className="mx-auto max-w-2xl">
        <Link href="/profile" className="text-sm font-medium text-[var(--lobb-text-secondary)]">← Back</Link>
        <h1 className="mt-6 text-2xl font-semibold">{title}</h1>
        <div className="mt-5 rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5 text-sm font-medium leading-6 text-[var(--lobb-text-secondary)]">
          {children}
        </div>
      </section>
    </main>
  );
}
