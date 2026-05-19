import { money } from "@/lib/dashboard-client-types";

export function BookingPriceSummary({ coachRate, convenienceFee }: { coachRate: number; convenienceFee: number }) {
  return (
    <div className="space-y-2 text-sm font-semibold">
      <p className="flex justify-between"><span>Coach rate</span><span>{money(coachRate)}</span></p>
      <p className="flex justify-between"><span>Convenience fee</span><span>{money(convenienceFee)}</span></p>
      <p className="flex justify-between border-t border-[var(--lobb-border)] pt-2 font-black"><span>Total</span><span>{money(coachRate + convenienceFee)}</span></p>
    </div>
  );
}
