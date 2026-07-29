import { PolicyPage } from "@/components/policy-page";

export default function TermsPage() {
  return (
    <PolicyPage title="Pilot terms" updated="29 July 2026">
      <h2>Service scope</h2>
      <p>Quilt Pattern Preflight provides an operator-reviewed mathematical and internal-consistency first pass within the supported, customer-confirmed scope. It is not certification, approval or a guarantee.</p>
      <h2>Your responsibility</h2>
      <p>You retain responsibility for professional technical editing, pattern testing, construction decisions, source-document corrections and final publication.</p>
      <h2>Pilot credits</h2>
      <p>A £20 credit covers one original supported document and one revised upload within 14 days. A £49 pack covers three projects. Credits do not automatically renew.</p>
      <h2>Unsupported documents</h2>
      <p>A credit is not consumed when a file is rejected before processing because it is an unsupported file type, image-only PDF or structurally unsuitable document.</p>
      <h2>Refunds</h2>
      <p>Contact support if a paid supported document cannot be processed or if the report was not released. Refund decisions and credit adjustments are recorded.</p>
    </PolicyPage>
  );
}
