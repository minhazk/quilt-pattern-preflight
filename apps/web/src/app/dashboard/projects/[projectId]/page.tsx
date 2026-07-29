import { notFound } from "next/navigation";
import Link from "next/link";
import {
  deleteRawDocument,
  deleteProject,
  respondToFinding,
} from "@/app/actions/customer";
import { FindingCard } from "@/components/finding-card";
import { requireUser } from "@/lib/auth";
import { createServerNeonClient } from "@/lib/neon/server";

export default async function ProjectReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ feedback?: string }>;
}) {
  const user = await requireUser();
  if (user.sample) notFound();
  const { projectId } = await params;
  const query = await searchParams;
  const supabase = await createServerNeonClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, status, revision_deadline")
    .eq("id", projectId)
    .single();
  if (!project) notFound();
  const { data: document } = await supabase
    .from("document_versions")
    .select(
      "id, version_number, review_status, approved_at, comparison_result, raw_file_deleted_at",
    )
    .eq("project_id", project.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();
  if (!document) notFound();
  const { data: findings } = await supabase
    .from("findings")
    .select("*, finding_sources(*)")
    .eq("document_version_id", document.id)
    .neq("status", "operator_suppressed")
    .order("severity");

  const released =
    project.status === "report_ready" ||
    project.status === "revision_available" ||
    project.status === "completed";

  return (
    <main className="workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Project report</p>
          <h1>{project.title}</h1>
          <p>
            Version {document.version_number} ·{" "}
            {released
              ? "Operator reviewed"
              : "Beta quality control in progress"}
          </p>
        </div>
        <div className="report-actions">
          <span className="status-pill">
            {released ? "Report ready" : "Awaiting operator review"}
          </span>
          {released && (
            <a
              className="button"
              href={`/dashboard/projects/${project.id}/report.pdf`}
              download
            >
              Download approved PDF
            </a>
          )}
          {released && (
            <Link
              className="button"
              href={`/dashboard/projects/${project.id}/feedback`}
            >
              Give pilot feedback
            </Link>
          )}
          {project.status === "revision_available" && (
            <Link
              className="button button-primary"
              href={`/dashboard/projects/${project.id}/revision`}
            >
              Upload included revision
            </Link>
          )}
        </div>
      </div>
      {query.feedback === "thanks" && (
        <section className="beta-callout" role="status">
          <span aria-hidden="true">◇</span>
          <div>
            <strong>Thank you—your structured feedback is stored.</strong>
            <p>No document text was included in the analytics event.</p>
          </div>
        </section>
      )}
      {released && document.comparison_result && (
        <section className="revision-summary">
          <p className="eyebrow">Revision comparison</p>
          <h2>Issue resolution across confirmed models</h2>
          <div className="severity-counts">
            <div>
              <strong>
                {document.comparison_result.resolved?.length ?? 0}
              </strong>
              <span>Resolved</span>
            </div>
            <div>
              <strong>
                {document.comparison_result.remaining?.length ?? 0}
              </strong>
              <span>Remaining</span>
            </div>
            <div>
              <strong>{document.comparison_result.new?.length ?? 0}</strong>
              <span>New</span>
            </div>
          </div>
        </section>
      )}
      {released && (
        <section className="document-retention">
          <div>
            <strong>Raw document retention</strong>
            <p>
              {document.raw_file_deleted_at
                ? "The raw uploaded file has been deleted. Confirmed values and report history remain."
                : "You can delete the raw uploaded file immediately. Confirmed values and report history remain."}
            </p>
          </div>
          {!document.raw_file_deleted_at && (
            <form action={deleteRawDocument}>
              <input name="projectId" type="hidden" value={project.id} />
              <input name="documentId" type="hidden" value={document.id} />
              <button className="button" type="submit">
                Delete raw file now
              </button>
            </form>
          )}
        </section>
      )}
      <section className="settings-card danger-card">
        <h2>Delete this project</h2>
        <p>
          This permanently deletes raw files, confirmed values, findings,
          feedback and report history. Payment records remain for financial
          compliance but are detached from the project.
        </p>
        <form action={deleteProject} className="project-delete-form">
          <input name="projectId" type="hidden" value={project.id} />
          <label>
            Enter <strong>{project.title}</strong> to confirm
            <input name="confirmation" required autoComplete="off" />
          </label>
          <button className="button" type="submit">
            Permanently delete project
          </button>
        </form>
      </section>
      {!released ? (
        <section className="beta-callout">
          <span aria-hidden="true">◇</span>
          <div>
            <strong>The deterministic checks are complete.</strong>
            <p>
              An authorised operator is now checking source excerpts, formulas
              and unsupported conditions. Findings remain hidden until release.
            </p>
          </div>
        </section>
      ) : (
        <section className="findings-list">
          {(findings ?? []).map((finding, index) => (
            <div key={finding.id}>
              <FindingCard
                index={index}
                finding={{
                  id: finding.id,
                  severity: finding.severity,
                  category: finding.category,
                  title: finding.title,
                  explanation: finding.explanation,
                  formula: finding.formula,
                  operands: finding.operands,
                  expectedResult: finding.expected_result,
                  statedResult: finding.stated_result,
                  difference: finding.difference,
                  confidence: Number(finding.confidence),
                  sources: finding.finding_sources.map(
                    (source: {
                      page: number | null;
                      section: string | null;
                      excerpt: string;
                    }) => ({
                      page: source.page,
                      section: source.section,
                      excerpt: source.excerpt,
                    }),
                  ),
                  assumptions: finding.assumptions_used,
                  recommendedAction: finding.recommended_action,
                  limitation: finding.limitation,
                  ruleId: finding.rule_id,
                  ruleVersion: finding.rule_version,
                }}
              />
              <form action={respondToFinding} className="finding-response">
                <input name="projectId" type="hidden" value={project.id} />
                <input name="findingId" type="hidden" value={finding.id} />
                <label>
                  Optional comment for quality measurement
                  <textarea
                    name="comment"
                    defaultValue={finding.customer_comment ?? ""}
                  />
                </label>
                <button
                  className="button"
                  name="response"
                  value="customer_disputed"
                  type="submit"
                >
                  Mark incorrect
                </button>
                <button
                  className="button button-primary"
                  name="response"
                  value="customer_accepted"
                  type="submit"
                >
                  Mark useful
                </button>
              </form>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
