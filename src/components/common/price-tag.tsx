import { money } from "@/lib/dashboard-client-types";

export function PriceTag({ amount, suffix = "" }: { amount: number; suffix?: string }) {
  return <span className="font-black">{money(amount)}{suffix}</span>;
}
