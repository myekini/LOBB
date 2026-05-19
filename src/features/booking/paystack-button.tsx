export function PaystackButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return <button disabled={disabled} onClick={onClick} className="h-14 w-full rounded-full bg-[var(--lobb-clay)] text-sm font-black text-white disabled:opacity-60">Pay with Paystack</button>;
}
