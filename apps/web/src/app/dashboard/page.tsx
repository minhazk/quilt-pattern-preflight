import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Customer workspace</p>
          <h1>Your preflights</h1>
          <p>Track extraction, review and revisions without losing the evidence trail.</p>
        </div>
        <Link className="button button-primary" href="/dashboard/projects/new">
          New pattern preflight
        </Link>
      </div>
      <section className="project-list" aria-labelledby="recent-projects">
        <h2 id="recent-projects">Recent projects</h2>
        <article>
          <div className="project-monogram">ML</div>
          <div>
            <span className="status-pill">Report ready</span>
            <h3>Meadow Lines Throw</h3>
            <p>Version 1 · Operator reviewed · 3 findings</p>
          </div>
          <div className="project-meta">
            <span>Revision available until</span>
            <strong>12 Aug 2026</strong>
          </div>
          <Link className="text-link" href="/demo">View report →</Link>
        </article>
      </section>
      <section className="beta-callout">
        <span aria-hidden="true">◇</span>
        <div><strong>What happens during beta quality control?</strong><p>After you confirm extracted values, deterministic checks run first. An authorised operator then validates source excerpts, suppresses false positives and records every edit before releasing your report.</p></div>
      </section>
    </main>
  );
}
