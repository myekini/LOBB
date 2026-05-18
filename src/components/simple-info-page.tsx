import Link from "next/link";

export function SimpleInfoPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 py-8 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-2xl">
        <Link href="/profile" className="text-sm font-black text-[var(--lobb-muted)]">← Back</Link>
        <h1 className="mt-6 text-2xl font-black">{title}</h1>
        <div className="mt-5 rounded-[22px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5 text-sm font-medium leading-6 text-[var(--lobb-muted)]">
          {children}
        </div>
      </section>
    </main>
  );
}
