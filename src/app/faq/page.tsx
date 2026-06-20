import Link from "next/link";
import { SimpleInfoPage } from "@/components/common/simple-info-page";

export default function FaqPage() {
  return (
    <SimpleInfoPage title="FAQs">
      <p>
        <strong>Can I cancel?</strong> Yes. Cancel at least 24 hours before the session and you get a full refund within 2 to 5 business days. Cancel within 24 hours and you receive 50% back — the coach keeps a partial payment for holding the slot.
      </p>
      <p className="mt-4">
        <strong>Are coaches verified?</strong> LOBB reviews coach profiles, credentials, and demo materials before they go live. Every profile is approved manually — not by an algorithm.
      </p>
      <p className="mt-4">
        <strong>How do payments work?</strong> Payment is held by LOBB, not released to the coach until two hours after your session starts. If your coach doesn&apos;t show, you get a full refund before anything is released.
      </p>
      <p className="mt-6 border-t border-[var(--lobb-border)] pt-5">
        For the full picture —{" "}
        <Link
          href="/how-it-works"
          className="font-black text-[var(--lobb-black)] underline underline-offset-2 hover:text-[var(--lobb-clay)]"
        >
          How LOBB works
        </Link>
        .
      </p>
    </SimpleInfoPage>
  );
}
