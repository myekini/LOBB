import { SimpleInfoPage } from "@/components/simple-info-page";

export default function FaqPage() {
  return (
    <SimpleInfoPage title="FAQs">
      <p><strong>Can I cancel?</strong> Yes, free cancellation is available until 24 hours before the session.</p>
      <p className="mt-4"><strong>Are coaches verified?</strong> LOBB reviews coach profiles, certifications, and demo materials before they go live.</p>
      <p className="mt-4"><strong>How do payments work?</strong> Payment is handled securely and held until after your session.</p>
    </SimpleInfoPage>
  );
}
