import type { Route } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createServerNeonClient } from "@/lib/neon/server";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.sample) {
    return (
      <main className="workspace">
        <DashboardHeading />
        <section className="project-list" aria-labelledby="recent-projects">
          <h2 id="recent-projects">Local sample project</h2>
          <article>
            <div className="project-monogram">ML</div>
            <div>
              <span className="status-pill">Report ready</span>
              <h3>Meadow Lines Throw</h3>
              <p>Version 1 · Operator reviewed · 3 findings</p>
            </div>
            <div className="project-meta">
              <span>Development adapter</span>
              <strong>No private data stored</strong>
            </div>
            <Link className="text-link" href="/demo">
              View report →
            </Link>
          </article>
        </section>
        <QualityControlCallout />
      </main>
    );
  }

  const supabase = await createServerNeonClient();
  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, title, status, revision_deadline, created_at, document_versions(version_number), findings(id)",
    )
    .order("created_at", { ascending: false });

  return (
    <main className="workspace">
      <DashboardHeading />
      <section className="project-list" aria-labelledby="recent-projects">
        <h2 id="recent-projects">Recent projects</h2>
        {(projects ?? []).map((project) => {
          const destination =
            project.status === "awaiting_customer_confirmation"
              ? `/dashboard/projects/${project.id}/confirm`
              : `/dashboard/projects/${project.id}`;
          return (
            <article key={project.id}>
              <div className="project-monogram">
                {project.title.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="status-pill">
                  {project.status.replaceAll("_", " ")}
                </span>
                <h3>{project.title}</h3>
                <p>
                  Version{" "}
                  {Math.max(
                    1,
                    ...project.document_versions.map(
                      (document: { version_number: number }) =>
                        document.version_number,
                    ),
                  )}{" "}
                  · {project.findings.length} findings
                </p>
              </div>
              <div className="project-meta">
                <span>Revision deadline</span>
                <strong>
                  {project.revision_deadline
                    ? new Date(project.revision_deadline).toLocaleDateString(
                        "en-GB",
                      )
                    : "After report release"}
                </strong>
              </div>
              <Link className="text-link" href={destination as Route}>
                Open →
              </Link>
            </article>
          );
        })}
        {!projects?.length && (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>Buy a credit, then upload a supported completed pattern.</p>
          </div>
        )}
      </section>
      <QualityControlCallout />
    </main>
  );
}

function DashboardHeading() {
  return (
    <div className="workspace-heading">
      <div>
        <p className="eyebrow">Customer workspace</p>
        <h1>Your preflights</h1>
        <p>
          Track extraction, quality control and revisions without losing the
          evidence trail.
        </p>
      </div>
      <Link className="button button-primary" href="/dashboard/projects/new">
        New pattern preflight
      </Link>
    </div>
  );
}

function QualityControlCallout() {
  return (
    <section className="beta-callout">
      <span aria-hidden="true">◇</span>
      <div>
        <strong>What happens during beta quality control?</strong>
        <p>
          Deterministic checks run first. An authorised operator then validates
          source excerpts, suppresses false positives and records every change
          before releasing your report.
        </p>
      </div>
    </section>
  );
}
