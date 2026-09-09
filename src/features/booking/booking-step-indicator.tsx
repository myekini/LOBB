export function BookingStepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--lobb-text-secondary)]">Step {step} / 3</p>;
}
