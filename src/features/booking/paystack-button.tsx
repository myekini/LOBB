import { Button as LobbButton } from "@/components/ui/button";
export function PaystackButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return <LobbButton variant="unstyled" disabled={disabled} onClick={onClick} className="h-14 w-full rounded-[var(--lobb-radius-lg)] bg-[var(--lobb-clay)] text-sm font-semibold text-white disabled:opacity-60">Pay with Paystack</LobbButton>;
}
