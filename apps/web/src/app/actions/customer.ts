"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const findingResponseSchema = z.object({
  projectId: z.string().uuid(),
  findingId: z.string().uuid(),
  response: z.enum(["customer_accepted", "customer_disputed"]),
  comment: z.string().trim().max(2000),
});

export async function respondToFinding(formData: FormData) {
  await requireUser();
  const values = findingResponseSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("findings")
    .update({
      status: values.response,
      customer_comment: values.comment || null,
    })
    .eq("id", values.findingId);
  if (error) throw new Error(`Finding response failed: ${error.code}`);
  revalidatePath(`/dashboard/projects/${values.projectId}`);
}

const feedbackSchema = z.object({
  projectId: z.string().uuid(),
  issueFound: z.enum(["yes", "no"]),
  minutesSaved: z.coerce.number().int().min(0).max(1440),
  unhelpfulFindings: z.string().trim().max(4000),
  wouldPayAgain: z.enum(["yes", "no"]),
  beforeEveryHandoff: z.enum(["yes", "no"]),
  paysTechnicalEditor: z.enum(["yes", "no"]),
  desiredConstructionType: z.string().trim().max(500),
  benchmarkConsent: z.literal("on"),
});

export async function submitFeedback(formData: FormData) {
  const user = await requireUser();
  const values = feedbackSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("customer_feedback").insert({
    project_id: values.projectId,
    owner_id: user.id,
    issue_found: values.issueFound === "yes",
    minutes_saved: values.minutesSaved,
    unhelpful_findings: values.unhelpfulFindings || null,
    would_pay_again: values.wouldPayAgain === "yes",
    before_every_handoff: values.beforeEveryHandoff === "yes",
    currently_pays_editor: values.paysTechnicalEditor === "yes",
    needed_unsupported_construction: values.desiredConstructionType || null,
    benchmark_consent: true,
  });
  if (error) throw new Error(`Feedback could not be stored: ${error.code}`);
  await supabase.from("consent_records").insert({
    owner_id: user.id,
    project_id: values.projectId,
    consent_type: "anonymised_benchmark",
    granted: true,
    policy_version: "2026-07-29",
  });
  await supabase.from("analytics_events").insert({
    owner_id: user.id,
    project_id: values.projectId,
    event_name: "feedback_submitted",
    properties: {
      would_pay_again: values.wouldPayAgain === "yes",
      issue_found: values.issueFound === "yes",
    },
  });
  redirect(`/dashboard/projects/${values.projectId}?feedback=thanks`);
}

export async function deleteRawDocument(formData: FormData) {
  const user = await requireUser();
  const documentId = z.string().uuid().parse(formData.get("documentId"));
  const projectId = z.string().uuid().parse(formData.get("projectId"));
  const supabase = await createServerSupabaseClient();
  const { data: document, error: readError } = await supabase
    .from("document_versions")
    .select("id, storage_path, raw_file_deleted_at")
    .eq("id", documentId)
    .single();
  if (readError || !document) throw new Error("Document was not found");
  if (!document.raw_file_deleted_at) {
    const { error: storageError } = await supabase.storage
      .from("pattern-documents")
      .remove([document.storage_path]);
    if (storageError) {
      throw new Error(`Raw file deletion failed: ${storageError.message}`);
    }
    const { error: updateError } = await supabase
      .from("document_versions")
      .update({ raw_file_deleted_at: new Date().toISOString() })
      .eq("id", document.id);
    if (updateError) throw new Error("Deletion status could not be recorded");
  }
  await supabase.from("deletion_requests").insert({
    owner_id: user.id,
    project_id: projectId,
    request_type: "raw_file",
    status: "succeeded",
    completed_at: new Date().toISOString(),
  });
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function deleteProject(formData: FormData) {
  const user = await requireUser();
  const projectId = z.string().uuid().parse(formData.get("projectId"));
  const confirmation = z.string().trim().parse(formData.get("confirmation"));
  const supabase = await createServerSupabaseClient();
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .single();
  if (projectError || !project || confirmation !== project.title) {
    throw new Error("Enter the exact project title to confirm deletion");
  }
  const { data: documents, error: documentsError } = await supabase
    .from("document_versions")
    .select("storage_path, raw_file_deleted_at")
    .eq("project_id", project.id);
  if (documentsError) throw new Error("Project documents could not be listed");
  const paths = (documents ?? [])
    .filter((document) => !document.raw_file_deleted_at)
    .map((document) => document.storage_path);
  if (paths.length) {
    const { error: storageError } = await supabase.storage
      .from("pattern-documents")
      .remove(paths);
    if (storageError) {
      throw new Error(
        `Private files could not be deleted: ${storageError.message}`,
      );
    }
  }

  const admin = createAdminSupabaseClient();
  const { error: deletionError } = await admin
    .from("projects")
    .delete()
    .eq("id", project.id)
    .eq("owner_id", user.id);
  if (deletionError) throw new Error("Project records could not be deleted");
  await admin.from("deletion_requests").insert({
    owner_id: user.id,
    request_type: "project",
    status: "succeeded",
    completed_at: new Date().toISOString(),
  });
  redirect("/dashboard");
}

export async function requestAccountDeletion() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("deletion_requests").insert({
    owner_id: user.id,
    request_type: "account",
    status: "queued",
  });
  if (error) throw new Error("Account deletion request could not be queued");
  redirect("/dashboard/settings?deletion=requested");
}
