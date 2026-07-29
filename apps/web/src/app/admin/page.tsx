import Link from "next/link";
import { requireOperator } from "@/lib/auth";
import { createServerNeonClient } from "@/lib/neon/server";

export default async function AdminQueuePage() {
  const operator = await requireOperator();
  if (operator.sample) {
    return (
      <main className="workspace">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">Operator quality control</p>
            <h1>Review queue</h1>
            <p>
              Connect a Neon branch and sign in with a protected operator role
              to exercise the persistent queue.
            </p>
          </div>
        </div>
        <section className="beta-callout">
          <span aria-hidden="true">◇</span>
          <div>
            <strong>Development adapter is active</strong>
            <p>
              The public sample report demonstrates the released result. No
              customer record is fabricated in the operator queue.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const supabase = await createServerNeonClient();
  const [{ data: documents }, { data: funnel }, { data: feedback }] =
    await Promise.all([
      supabase
        .from("document_versions")
        .select(
          "id, project_id, original_filename, file_type, page_count, created_at, projects!inner(title,status), operator_reviews(id,status,created_at)",
        )
        .in("projects.status", [
          "awaiting_operator_review",
          "clarification_requested",
        ])
        .order("created_at"),
      supabase
        .from("validation_funnel")
        .select("event_name, event_count, unique_owners"),
      supabase
        .from("customer_feedback")
        .select("would_pay_again, issue_found, minutes_saved"),
    ]);

  return (
    <main className="workspace admin-workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Operator quality control</p>
          <h1>Review queue</h1>
          <p>Automated results remain separate until a recorded release.</p>
        </div>
      </div>
      <section className="admin-metrics" aria-label="Validation metrics">
        {(funnel ?? []).slice(0, 6).map((event) => (
          <article key={event.event_name}>
            <span>{event.event_name.replaceAll("_", " ")}</span>
            <strong>{event.event_count}</strong>
            <small>{event.unique_owners} identified customers</small>
          </article>
        ))}
        <article>
          <span>feedback responses</span>
          <strong>{feedback?.length ?? 0}</strong>
          <small>
            {feedback?.filter((row) => row.would_pay_again).length ?? 0} would
            pay again
          </small>
        </article>
      </section>
      <section className="project-list">
        <h2>Projects awaiting review</h2>
        {(documents ?? []).map((document) => {
          const project = Array.isArray(document.projects)
            ? document.projects[0]
            : document.projects;
          const review = Array.isArray(document.operator_reviews)
            ? document.operator_reviews[0]
            : document.operator_reviews;
          return (
            <article key={document.id}>
              <div className="project-monogram">QC</div>
              <div>
                <span className="status-pill">
                  {review?.status?.replaceAll("_", " ") ?? "not started"}
                </span>
                <h3>{project?.title}</h3>
                <p>
                  {document.original_filename} ·{" "}
                  {document.file_type.toUpperCase()} ·{" "}
                  {document.page_count ?? "?"} pages
                </p>
              </div>
              <div className="project-meta">
                <span>Queued</span>
                <strong>
                  {new Date(document.created_at).toLocaleDateString("en-GB")}
                </strong>
              </div>
              <Link
                className="text-link"
                href={`/admin/projects/${document.project_id}`}
              >
                Review →
              </Link>
            </article>
          );
        })}
      </section>
    </main>
  );
}
