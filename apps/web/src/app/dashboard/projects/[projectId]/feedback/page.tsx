import { notFound } from "next/navigation";
import { submitFeedback } from "@/app/actions/customer";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function FeedbackPage({
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
  if (!project) notFound();

  return (
    <main className="workspace">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">Structured pilot feedback</p>
          <h1>Help decide what happens next</h1>
          <p>
            This measures real usefulness; it is not a request for a
            testimonial.
          </p>
        </div>
      </div>
      <form action={submitFeedback} className="wizard-card feedback-form">
        <input name="projectId" type="hidden" value={project.id} />
        <h2>{project.title}</h2>
        <div className="form-grid">
          <label>
            Did it identify an issue you would have checked manually?
            <select name="issueFound" required>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label>
            Minutes saved
            <input name="minutesSaved" type="number" min="0" max="1440" required />
          </label>
          <label>
            Would you pay £20 for another pattern?
            <select name="wouldPayAgain" required>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label>
            Use before every technical-editing handoff?
            <select name="beforeEveryHandoff" required>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label>
            Do you currently pay a technical editor?
            <select name="paysTechnicalEditor" required>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label>
            Unsupported construction type that matters most
            <input name="desiredConstructionType" />
          </label>
        </div>
        <label>
          Which findings were incorrect or unhelpful?
          <textarea name="unhelpfulFindings" />
        </label>
        <fieldset>
          <legend>Explicit benchmark consent</legend>
          <label>
            <input name="benchmarkConsent" type="checkbox" required />
            I allow an anonymised result—not my document text or identity—to
            improve the synthetic benchmark.
          </label>
        </fieldset>
        <div className="wizard-actions">
          <span />
          <button className="button button-primary" type="submit">
            Submit feedback
          </button>
        </div>
      </form>
    </main>
  );
}
