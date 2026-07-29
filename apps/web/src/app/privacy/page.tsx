import { PolicyPage } from "@/components/policy-page";

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy notice" updated="29 July 2026">
      <h2>What we collect</h2>
      <p>
        Account details, billing records, uploaded pattern documents, confirmed
        extraction data, report feedback and limited product events required to
        operate and evaluate the paid pilot.
      </p>
      <h2>How pattern documents are handled</h2>
      <p>
        Documents are held privately in the application database behind
        row-level access controls and a hard storage ceiling. Authorised beta
        operators may access a document only to review extraction and findings.
        Operator access is recorded.
      </p>
      <h2>No model training</h2>
      <p>
        Customer documents are not used to train models. Optional external model
        assistance is disabled by default and cannot be enabled for a document
        without explicit consent.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        Raw files are scheduled for deletion after 30 days by default. Customers
        may delete projects immediately from their account, subject to
        short-lived backups and legal payment-record obligations.
      </p>
      <h2>Analytics</h2>
      <p>
        Events record product actions, identifiers and acquisition source—not
        document text, excerpts, filenames or extracted measurements.
      </p>
    </PolicyPage>
  );
}
