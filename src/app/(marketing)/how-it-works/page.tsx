import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const QA_ITEMS = [
  {
    q: "How does LOBB verify coaches?",
    a: "Every coach goes through a manual approval process. We review their credentials, coaching demo video, and bank account before their profile goes live. A LOBB Verified badge means a real person at LOBB checked this coach — not an algorithm.",
  },
  {
    q: "How does booking work?",
    a: "Browse coaches by location and specialization. Pick a coach, choose an available time slot, add any notes, and pay securely via Paystack. You'll get an SMS confirmation with your coach's phone number immediately after payment.",
  },
  {
    q: "How long is my slot held?",
    a: "Once you start checkout, your chosen slot is held for 10 minutes. If payment isn't completed in that window, the slot is released back to other players.",
  },
  {
    q: "What happens to my money?",
    a: "When you pay, your money is held by LOBB — not sent to the coach immediately. We release the coach's payout two hours after your session starts. If your coach doesn't show, you get a full refund before we release anything.",
  },
  {
    q: "Are court fees included?",
    a: "No. LOBB connects you with the coach. Court access is arranged between you and your coach directly. Each coach profile shows whether they have court access or whether you need to arrange it. Many LOBB coaches operate at Lagos Country Club, Lekki Tennis Centre, and private estate courts.",
  },
  {
    q: "What is the cancellation policy?",
    a: "Cancel more than 24 hours before your session: full refund. Cancel less than 24 hours before: 50% refund. The remaining 50% compensates your coach for their reserved time.",
  },
  {
    q: "What if my coach cancels or doesn't show?",
    a: "You receive a full refund automatically. The coach receives a strike on their account. Three strikes and their account is reviewed.",
  },
  {
    q: "How do I get support?",
    a: "WhatsApp us at +234 XXX XXX XXXX. We respond within 2 hours during Lagos business hours (8am–8pm, Monday–Saturday).",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] px-5 py-10 text-[var(--lobb-black)]">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--lobb-muted)] transition hover:text-[var(--lobb-black)]"
        >
          ← Back
        </Link>

        <div className="mt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-clay)]">
            How it works
          </p>
          <h1 className="mt-2 text-[32px] font-black leading-[1.04] tracking-tight sm:text-[40px]">
            Everything you need to know before you book.
          </h1>
          <p className="mt-3 text-[15px] leading-[1.7] text-[var(--lobb-muted)]">
            Eight questions Lagos players ask before trusting a new platform with their money and their Saturday morning.
          </p>
        </div>

        <div className="mt-10 divide-y divide-[var(--lobb-border)] border-y border-[var(--lobb-border)]">
          {QA_ITEMS.map(({ q, a }) => (
            <div key={q} className="py-7">
              <p className="text-[17px] font-black leading-[1.3] tracking-tight text-[var(--lobb-black)]">
                {q}
              </p>
              <p className="mt-3 text-[15px] leading-[1.75] text-[var(--lobb-muted)]">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-[14px] border border-[var(--lobb-success)]/25 bg-[var(--lobb-success-soft)] p-5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--lobb-success)]" />
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--lobb-success)]">
              LOBB Verified
            </p>
            <p className="mt-2 text-[14px] leading-[1.7] text-[var(--lobb-muted)]">
              A LOBB Verified coach has submitted a coaching demo video reviewed by the LOBB team,
              completed a profile approved by LOBB, connected a verified Nigerian bank account, and
              maintained a clean account with no unresolved complaints. We would rather launch with
              five excellent coaches than twenty inconsistent ones.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-[var(--lobb-border)] pt-6">
          <p className="text-[13px] font-semibold leading-6 text-[var(--lobb-muted)]">
            Still have questions?{" "}
            <Link href="/faq" className="font-black text-[var(--lobb-black)] underline underline-offset-2 transition hover:text-[var(--lobb-clay)]">
              Read the FAQ
            </Link>{" "}
            or{" "}
            <Link href="/contact" className="font-black text-[var(--lobb-black)] underline underline-offset-2 transition hover:text-[var(--lobb-clay)]">
              contact us
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
