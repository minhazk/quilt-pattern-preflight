import { notFound } from "next/navigation";
import {
  addManualFinding,
  decideFinding,
  updateOperatorReview,
} from "@/app/actions/operator";
import { requireOperator } from "@/lib/auth";
import { createServerNeonClient } from "@/lib/neon/server";

export default async function OperatorProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const operator = await requireOperator();
  if (operator.sample) notFound();
  const { projectId } = await params;
  const supabase = await createServerNeonClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, status, owner_id")
    .eq("id", projectId)
    .single();
  if (!project) notFound();
  const { data: document } = await supabase
    .from("document_versions")
    .select("*")
    .eq("project_id", project.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();
  if (!document) notFound();
  const [
    { data: entities },
    { data: findings },
    { data: review },
    { data: assumptions },
  ] = await Promise.all([
    supabase
      .from("extracted_entities")
      .select("*")
      .eq("document_version_id", document.id),
    supabase
      .from("findings")
      .select("*, finding_sources(*)")
      .eq("document_version_id", document.id)
      .order("severity"),
    supabase
      .from("operator_reviews")
      .select("*")
      .eq("document_version_id", document.id)
      .single(),
    supabase
      .from("assumptions")
      .select("values")
      .eq("document_version_id", document.id)
      .order("version", { ascending: false })
      .limit(1)
      .single(),
  ]);
  if (!review) notFound();

  const hidden = {
    projectId: project.id,
    documentId: document.id,
    reviewId: review.id,
  };

  return (
    <main className="workspace admin-workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Operator quality control</p>
          <h1>{project.title}</h1>
          <p>
            {document.original_filename} · {document.size_bytes} bytes · SHA-256{" "}
            {document.sha256.slice(0, 12)}…
          </p>
        </div>
        <span className="status-pill">
          {review.status.replaceAll("_", " ")}
        </span>
      </div>
      <section className="settings-card">
        <h2>Confirmed assumptions</h2>
        <pre className="model-json">
          {JSON.stringify(assumptions?.values ?? {}, null, 2)}
        </pre>
      </section>
      <section className="settings-card">
        <h2>Source-linked extraction</h2>
        <div className="operator-entities">
          {(entities ?? []).map((entity) => (
            <article key={entity.id}>
              <span>
                {entity.entity_type} · {entity.confirmation_status} ·{" "}
                {Math.round(Number(entity.confidence) * 100)}%
              </span>
              <strong>{entity.normalized_value}</strong>
              <blockquote>{entity.source_excerpt}</blockquote>
            </article>
          ))}
        </div>
      </section>
      <section className="settings-card">
        <h2>Automated and operator findings</h2>
        <div className="operator-findings">
          {(findings ?? []).map((finding) => (
            <article key={finding.id}>
              <header>
                <span className={`severity severity-${finding.severity}`}>
                  {finding.severity}
                </span>
                <strong>{finding.title}</strong>
                <small>{finding.status.replaceAll("_", " ")}</small>
              </header>
              <p>{finding.explanation}</p>
              <code>{finding.formula}</code>
              {finding.finding_sources.map(
                (source: {
                  id: string;
                  excerpt: string;
                  page: number | null;
                }) => (
                  <blockquote key={source.id}>
                    {source.page ? `Page ${source.page}: ` : ""}
                    {source.excerpt}
                  </blockquote>
                ),
              )}
              <form action={decideFinding} className="operator-action-form">
                <input name="findingId" type="hidden" value={finding.id} />
                <input name="projectId" type="hidden" value={project.id} />
                <label>
                  Decision note
                  <textarea
                    name="note"
                    defaultValue={finding.operator_note ?? ""}
                  />
                </label>
                <button
                  className="button"
                  name="decision"
                  value="operator_suppressed"
                  type="submit"
                >
                  Suppress
                </button>
                <button
                  className="button button-primary"
                  name="decision"
                  value="operator_approved"
                  type="submit"
                >
                  Approve
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
      <section className="settings-card">
        <h2>Add a manual source-linked finding</h2>
        <form action={addManualFinding} className="operator-manual-form">
          <input name="projectId" type="hidden" value={project.id} />
          <input name="documentId" type="hidden" value={document.id} />
          <div className="form-grid">
            <label>
              Severity
              <select name="severity" defaultValue="review">
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="review">Review</option>
                <option value="information">Information</option>
              </select>
            </label>
            <label>
              Page (optional)
              <input name="sourcePage" type="number" min="1" />
            </label>
            <label>
              Title
              <input name="title" required />
            </label>
            <label>
              Recommended action
              <input name="recommendedAction" required />
            </label>
          </div>
          <label>
            Explanation
            <textarea name="explanation" required />
          </label>
          <label>
            Exact source excerpt
            <textarea name="sourceExcerpt" required />
          </label>
          <button className="button" type="submit">
            Add manual finding
          </button>
        </form>
      </section>
      <section className="settings-card">
        <h2>Review decision</h2>
        <form action={updateOperatorReview} className="operator-review-form">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))}
          <label>
            Review note or clarification request
            <textarea name="note" />
          </label>
          <div className="operator-buttons">
            <button
              className="button"
              name="action"
              value="start"
              type="submit"
            >
              Start review
            </button>
            <button
              className="button"
              name="action"
              value="clarify"
              type="submit"
            >
              Request clarification
            </button>
            <button
              className="button button-primary"
              name="action"
              value="release"
              type="submit"
            >
              Approve and release report
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
