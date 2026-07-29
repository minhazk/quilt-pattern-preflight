import { requestAccountDeletion } from "@/app/actions/customer";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ deletion?: string }>;
}) {
  const { deletion } = await searchParams;
  return (
    <main className="workspace">
      <div className="workspace-heading compact">
        <div>
          <p className="eyebrow">Account controls</p>
          <h1>Privacy & settings</h1>
        </div>
      </div>
      {deletion === "requested" && (
        <section className="beta-callout" role="status">
          <span aria-hidden="true">◇</span>
          <div>
            <strong>Your account deletion request is queued.</strong>
            <p>
              The operator will resolve any active payment or refund obligation
              and then remove the account and its private files.
            </p>
          </div>
        </section>
      )}
      <section className="settings-card">
        <h2>Document retention</h2>
        <p>
          Raw uploads are deleted after 30 days by default. You can delete a raw
          upload sooner from its report page without removing the confirmed
          model or report history.
        </p>
      </section>
      <section className="settings-card danger-card">
        <h2>Delete account</h2>
        <p>
          Account deletion removes projects, reports and files after active
          payment or refund obligations are resolved. Project deletion is
          immediate from each project page.
        </p>
        <form action={requestAccountDeletion}>
          <button className="button" type="submit">
            Request account deletion
          </button>
        </form>
      </section>
    </main>
  );
}
