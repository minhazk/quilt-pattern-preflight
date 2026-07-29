import { notFound } from "next/navigation";
import { uploadRevision } from "@/app/actions/projects";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function RevisionUploadPage({
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
    .select("id, title, status, revision_deadline, revision_used_at")
    .eq("id", projectId)
    .single();
  if (
    !project ||
    project.status !== "revision_available" ||
    project.revision_used_at
  ) {
    notFound();
  }

  return (
    <main className="workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Included revision</p>
          <h1>Upload version two</h1>
          <p>
            Prior assumptions will be copied for confirmation. The comparison
            reports resolved, remaining and new mathematical findings.
          </p>
        </div>
      </div>
      <form action={uploadRevision} className="wizard-card">
        <input name="projectId" type="hidden" value={project.id} />
        <p className="eyebrow">{project.title}</p>
        <h2>Choose the revised document</h2>
        <label className="upload-zone" htmlFor="revision-file">
          <strong>Choose revised DOCX or text-layer PDF</strong>
          <span>
            Available until{" "}
            {new Date(project.revision_deadline).toLocaleDateString("en-GB")}
          </span>
          <input
            id="revision-file"
            name="patternFile"
            type="file"
            accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
            required
          />
        </label>
        <div className="wizard-actions">
          <p className="form-note">No additional credit will be consumed.</p>
          <button className="button button-primary" type="submit">
            Upload and compare revision
          </button>
        </div>
      </form>
    </main>
  );
}
