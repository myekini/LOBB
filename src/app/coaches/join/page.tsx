import Link from "next/link";

export default function CoachJoinPage() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 py-8 text-[var(--lobb-black)]">
      <section className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-black text-[var(--lobb-muted)]">← Back</Link>
        <h1 className="mt-10 text-4xl font-black tracking-tight">Coach on LOBB</h1>
        <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-[var(--lobb-muted)]">
          Get discovered by serious Lagos players, manage your schedule, and receive payouts after completed sessions.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {["Verified profile", "Booking tools", "Transparent payouts"].map((item) => (
            <div key={item} className="rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-4 text-sm font-black">
              {item}
            </div>
          ))}
        </div>
        <Link href="/auth/login?role=coach" className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-[var(--lobb-clay)] px-7 text-sm font-black text-white">
          Start Coach Signup
        </Link>
      </section>
    </main>
  );
}
