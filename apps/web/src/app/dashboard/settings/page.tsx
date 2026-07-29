export default function SettingsPage() {
  return (
    <main className="workspace">
      <div className="workspace-heading compact">
        <div><p className="eyebrow">Account controls</p><h1>Privacy & settings</h1></div>
      </div>
      <section className="settings-card">
        <h2>Document retention</h2>
        <p>Raw uploads are deleted 30 days after the final report by default. Approved report data remains until you delete the project.</p>
        <button className="button" type="button">Request account export</button>
      </section>
      <section className="settings-card danger-card">
        <h2>Delete account</h2>
        <p>Account deletion removes projects, reports and files after active payment or refund obligations are resolved.</p>
        <button className="button" type="button">Request account deletion</button>
      </section>
    </main>
  );
}
