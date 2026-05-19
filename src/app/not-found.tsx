import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--lobb-bg)] px-5 text-center text-[var(--lobb-black)]">
      <p className="text-7xl font-black text-[var(--lobb-clay)]">404</p>
      <h1 className="mt-4 text-2xl font-black">Page not found</h1>
      <p className="mt-3 text-sm font-semibold text-[var(--lobb-muted)]">
        This page doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[var(--lobb-black)] px-7 text-sm font-black text-white"
      >
        Back to Home
      </Link>
    </main>
  );
}
