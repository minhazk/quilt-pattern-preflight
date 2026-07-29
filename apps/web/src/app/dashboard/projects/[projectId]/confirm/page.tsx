import { notFound } from "next/navigation";
import { confirmAndSubmitPreflight } from "@/app/actions/projects";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ModelFields } from "@/app/dashboard/projects/[projectId]/confirm/model-fields";

function splitDimension(value: string | undefined): [string, string] {
  const parts = value?.split(/\s+x\s+/i);
  return [parts?.[0] ?? "", parts?.[1] ?? ""];
}

export default async function ConfirmExtractionPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await requireUser();
  if (user.sample) notFound();
  const { projectId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, status")
    .eq("id", projectId)
    .single();
  if (!project || project.status !== "awaiting_customer_confirmation") {
    notFound();
  }
  const { data: document } = await supabase
    .from("document_versions")
    .select("id, original_filename, page_count, file_type")
    .eq("project_id", project.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();
  if (!document) notFound();
  const { data: entities } = await supabase
    .from("extracted_entities")
    .select("*")
    .eq("document_version_id", document.id)
    .order("created_at");

  const dimensions = (entities ?? []).filter(
    (entity) => entity.entity_type === "dimension",
  );
  const quantities = (entities ?? []).filter(
    (entity) => entity.entity_type === "quantity",
  );
  const [cutWidth, cutHeight] = splitDimension(dimensions[0]?.normalized_value);
  const [finishedWidth, finishedHeight] = splitDimension(
    dimensions.at(-2)?.normalized_value ?? dimensions.at(-1)?.normalized_value,
  );
  const [quiltWidth, quiltHeight] = splitDimension(
    dimensions.at(-1)?.normalized_value,
  );

  return (
    <main className="workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Customer confirmation</p>
          <h1>Confirm the extracted model</h1>
          <p>
            {document.original_filename} · {document.page_count} page
            {document.page_count === 1 ? "" : "s"} ·{" "}
            {document.file_type.toUpperCase()}
          </p>
        </div>
      </div>
      <form action={confirmAndSubmitPreflight} className="wizard-card">
        <input name="projectId" type="hidden" value={project.id} />
        <input name="documentId" type="hidden" value={document.id} />
        <input name="title" type="hidden" value={project.title} />
        <p className="eyebrow">Source-linked proposals</p>
        <h2>Correct or exclude extracted values</h2>
        <div className="entity-table confirmation-table" role="table">
          <div role="row">
            <strong role="columnheader">Use</strong>
            <strong role="columnheader">Type</strong>
            <strong role="columnheader">Value</strong>
            <strong role="columnheader">Source</strong>
          </div>
          {(entities ?? []).map((entity) => (
            <div role="row" key={entity.id}>
              <input
                aria-label={`Use ${entity.raw_value}`}
                name={`include_${entity.id}`}
                type="checkbox"
                defaultChecked
              />
              <span>{entity.entity_type}</span>
              <input
                aria-label={`Confirmed value for ${entity.raw_value}`}
                name={`entity_${entity.id}`}
                defaultValue={entity.normalized_value}
                required
              />
              <span>
                {entity.source_page
                  ? `Page ${entity.source_page}`
                  : entity.source_section || "Document"}
              </span>
              <blockquote>{entity.source_excerpt}</blockquote>
            </div>
          ))}
        </div>
        <p className="eyebrow form-section-label">
          Canonical simple-grid model
        </p>
        <h2>Declare the relationship to check</h2>
        <p className="form-note">
          Extraction proposes evidence; you declare the mathematical
          relationship. The engine never guesses unsupported construction.
        </p>
        <ModelFields
          initialCutWidth={cutWidth || "2 1/2"}
          initialCutHeight={cutHeight || "4 1/2"}
          initialTotal={quantities[0]?.normalized_value || "1"}
          initialFinishedWidth={finishedWidth || "12"}
          initialFinishedHeight={finishedHeight || "12"}
          initialBlockQuantity={quantities.at(-1)?.normalized_value || "1"}
          initialQuiltWidth={quiltWidth}
          initialQuiltHeight={quiltHeight}
        />
        <div className="wizard-actions">
          <p className="form-note">
            Submitting consumes one credit atomically and places the automated
            result in beta quality control.
          </p>
          <button className="button button-primary" type="submit">
            Confirm and submit preflight
          </button>
        </div>
      </form>
    </main>
  );
}
