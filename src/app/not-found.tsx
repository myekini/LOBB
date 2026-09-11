import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--lobb-bg-primary)] px-5 text-center text-[var(--lobb-bg-inverse)]">
      <p className="text-7xl font-semibold text-[var(--lobb-clay)]">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-3 text-sm font-medium text-[var(--lobb-text-secondary)]">
        This page doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-[var(--lobb-radius-lg)] bg-[var(--lobb-bg-inverse)] px-7 text-sm font-medium text-[var(--lobb-text-inverse)]"
      >
        Back to Home
      </Link>
    </main>
  );
}
