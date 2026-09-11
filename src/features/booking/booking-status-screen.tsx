import Link from "next/link";
import { LobbErrorBanner } from "@/components/common/lobb-error";
import type { AppErrorCode, AppErrorPayload } from "@/lib/app-errors";

type Cta = { href: string; label: string };

/**
 * Centred full-screen state for the booking-confirm flow (payment failed,
 * still-confirming, not-found). The success path renders its own receipt card.
 */
export function BookingStatusScreen({
  icon,
  title,
  body,
  error,
  errorFallbackCode,
  reference,
  primary,
  secondary,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
  error?: AppErrorPayload | null;
  errorFallbackCode?: AppErrorCode;
  reference?: string | null;
  primary: Cta;
  secondary: Cta;
}) {
  return (
    <main className="lobb-app-page flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md text-center">
        {icon}
        <p className={`text-lg font-medium text-[var(--lobb-bg-inverse)] ${icon ? "mt-5" : ""}`}>{title}</p>
        <p className="mt-2 text-sm font-medium text-[var(--lobb-text-secondary)]">{body}</p>
        {errorFallbackCode && (
          <LobbErrorBanner error={error ?? null} fallbackCode={errorFallbackCode} className="mt-5 text-left" />
        )}
        {reference && (
          <p className="mt-3 rounded-[var(--lobb-radius-sm)] bg-[var(--lobb-bg-elevated)] px-4 py-2 font-mono text-sm font-bold select-all">
            {reference}
          </p>
        )}
        <Link
          href={primary.href}
          className="mt-8 flex h-14 w-full items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] text-sm font-medium text-[var(--lobb-text-inverse)]"
        >
          {primary.label}
        </Link>
        <Link href={secondary.href} className="mt-4 block text-sm font-bold text-[var(--lobb-text-secondary)]">
          {secondary.label}
        </Link>
      </div>
    </main>
  );
}
