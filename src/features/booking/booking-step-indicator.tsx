export function BookingStepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">Step {step} / 3</p>;
}
