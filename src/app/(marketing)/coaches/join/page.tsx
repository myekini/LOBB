import Link from "next/link";

export default function CoachJoinPage() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg-primary)] px-5 py-8 text-[var(--lobb-bg-inverse)]">
      <section className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-medium text-[var(--lobb-text-secondary)]">← Back</Link>
        <h1 className="mt-10 text-4xl font-semibold tracking-tight">Coach on LOBB</h1>
        <p className="mt-4 max-w-xl text-base font-medium leading-7 text-[var(--lobb-text-secondary)]">
          Get discovered by serious Lagos players, manage your schedule, and receive payouts after completed sessions.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {["Verified profile", "Booking tools", "Transparent payouts"].map((item) => (
            <div key={item} className="rounded-[var(--lobb-radius-lg)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-4 text-sm font-medium">
              {item}
            </div>
          ))}
        </div>
        <Link href="/auth/login?role=coach" className="mt-8 inline-flex h-14 items-center justify-center rounded-[var(--lobb-radius-lg)] bg-[var(--lobb-clay)] px-7 text-sm font-medium text-white">
          Start Coach Signup
        </Link>
      </section>
    </main>
  );
}
