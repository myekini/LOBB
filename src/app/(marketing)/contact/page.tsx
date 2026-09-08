import { Mail, MessageCircle } from "lucide-react";
import { SimpleInfoPage } from "@/components/common/simple-info-page";

const supportPhone = process.env.NEXT_PUBLIC_LOBB_SUPPORT_WHATSAPP || "2348000000000";
const supportEmail = process.env.NEXT_PUBLIC_LOBB_SUPPORT_EMAIL || "support@lobb.ng";

export default function ContactPage() {
  return (
    <SimpleInfoPage title="Contact LOBB">
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={`https://wa.me/${supportPhone.replace(/\D/g, "")}`}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--lobb-clay)] px-5 text-sm font-black text-white"
        >
          <MessageCircle className="size-4" />
          WhatsApp Support
        </a>
        <a
          href={`mailto:${supportEmail}`}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--lobb-border)] bg-white px-5 text-sm font-black text-[var(--lobb-black)]"
        >
          <Mail className="size-4" />
          Email Support
        </a>
      </div>
    </SimpleInfoPage>
  );
}
