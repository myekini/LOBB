export function BookingStepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return <p className="text-xs font-medium text-[var(--lobb-text-secondary)]">Step {step} of 3</p>;
}
