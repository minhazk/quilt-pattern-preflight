"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOperator } from "@/lib/auth";
import { createServerNeonClient } from "@/lib/neon/server";
import { sendReportReadyEmail } from "@/lib/email";

const findingDecisionSchema = z.object({
  findingId: z.string().uuid(),
  projectId: z.string().uuid(),
  decision: z.enum(["operator_approved", "operator_suppressed"]),
  note: z.string().trim().max(2000),
});

export async function decideFinding(formData: FormData) {
  await requireOperator();
  const values = findingDecisionSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerNeonClient();
  const { error } = await supabase
    .from("findings")
    .update({
      status: values.decision,
      operator_note: values.note || null,
    })
    .eq("id", values.findingId);
  if (error) throw new Error(`Finding decision failed: ${error.code}`);
  revalidatePath(`/admin/projects/${values.projectId}`);
}

const manualFindingSchema = z.object({
  projectId: z.string().uuid(),
  documentId: z.string().uuid(),
  severity: z.enum(["critical", "warning", "review", "information"]),
  title: z.string().trim().min(1).max(240),
  explanation: z.string().trim().min(1).max(4000),
  sourceExcerpt: z.string().trim().min(1).max(1000),
  sourcePage: z.coerce.number().int().positive().optional(),
  recommendedAction: z.string().trim().min(1).max(2000),
});

export async function addManualFinding(formData: FormData) {
  await requireOperator();
  const raw = Object.fromEntries(formData);
  const values = manualFindingSchema.parse({
    ...raw,
    sourcePage: raw.sourcePage || undefined,
  });
  const supabase = await createServerNeonClient();
  const { data: finding, error } = await supabase
    .from("findings")
    .insert({
      document_version_id: values.documentId,
      rule_id: "OPERATOR_MANUAL_REVIEW",
      rule_version: "1.0.0",
      severity: values.severity,
      category: "manual review",
      title: values.title,
      explanation: values.explanation,
      formula: "Operator-declared issue; no automated formula",
      operands: {},
      expected_result: "Source should be internally consistent",
      stated_result: "Operator identified a source-linked contradiction",
      difference: "Manual review required",
      confidence: 1,
      assumptions_used: ["Operator reviewed cited source"],
      recommended_action: values.recommendedAction,
      status: "manual",
      automated_snapshot: {
        origin: "operator_quality_control",
        reason: "manual_source_review",
      },
    })
    .select("id")
    .single();
  if (error) throw new Error(`Manual finding failed: ${error.code}`);

  const { error: sourceError } = await supabase.from("finding_sources").insert({
    finding_id: finding.id,
    page: values.sourcePage ?? null,
    excerpt: values.sourceExcerpt,
  });
  if (sourceError)
    throw new Error(`Finding source failed: ${sourceError.code}`);
  revalidatePath(`/admin/projects/${values.projectId}`);
}

const projectActionSchema = z.object({
  projectId: z.string().uuid(),
  documentId: z.string().uuid(),
  reviewId: z.string().uuid(),
  action: z.enum(["start", "clarify", "release"]),
  note: z.string().trim().max(2000),
});

export async function updateOperatorReview(formData: FormData) {
  const operator = await requireOperator();
  const values = projectActionSchema.parse(Object.fromEntries(formData));
  const supabase = await createServerNeonClient();
  const now = new Date();

  if (values.action === "start") {
    const { error } = await supabase
      .from("operator_reviews")
      .update({
        reviewer_id: operator.id,
        status: "in_progress",
        started_at: now.toISOString(),
        notes: values.note || null,
      })
      .eq("id", values.reviewId);
    if (error) throw new Error(`Review could not start: ${error.code}`);
  }

  if (values.action === "clarify") {
    const [{ error: reviewError }, { error: projectError }] = await Promise.all(
      [
        supabase
          .from("operator_reviews")
          .update({
            reviewer_id: operator.id,
            status: "clarification_requested",
            notes: values.note,
          })
          .eq("id", values.reviewId),
        supabase
          .from("projects")
          .update({ status: "clarification_requested" })
          .eq("id", values.projectId),
      ],
    );
    if (reviewError || projectError) {
      throw new Error("Clarification request could not be recorded");
    }
  }

  if (values.action === "release") {
    const { data: releasedDocument, error: releasedDocumentError } =
      await supabase
        .from("document_versions")
        .select("version_number")
        .eq("id", values.documentId)
        .single();
    if (releasedDocumentError) throw releasedDocumentError;
    const { data: findings, error: findingReadError } = await supabase
      .from("findings")
      .select("id, status")
      .eq("document_version_id", values.documentId);
    if (findingReadError) throw findingReadError;
    const automated = findings.filter(
      (finding) => finding.status === "automated",
    );
    for (const finding of automated) {
      const { error } = await supabase
        .from("findings")
        .update({ status: "operator_approved" })
        .eq("id", finding.id);
      if (error) throw error;
    }

    const approvedCount =
      findings.filter(
        (finding) =>
          finding.status !== "operator_suppressed" &&
          finding.status !== "automated",
      ).length + automated.length;
    const suppressedCount = findings.filter(
      (finding) => finding.status === "operator_suppressed",
    ).length;
    const manualCount = findings.filter(
      (finding) => finding.status === "manual",
    ).length;
    const { data: review } = await supabase
      .from("operator_reviews")
      .select("started_at")
      .eq("id", values.reviewId)
      .single();
    const processingSeconds = review?.started_at
      ? Math.max(
          0,
          Math.round(
            (now.getTime() - new Date(review.started_at).getTime()) / 1000,
          ),
        )
      : null;

    const [{ error: reviewError }, { error: documentError }] =
      await Promise.all([
        supabase
          .from("operator_reviews")
          .update({
            reviewer_id: operator.id,
            status: "released",
            completed_at: now.toISOString(),
            approved_findings_count: approvedCount,
            suppressed_findings_count: suppressedCount,
            manual_findings_count: manualCount,
            processing_seconds: processingSeconds,
            notes: values.note || null,
          })
          .eq("id", values.reviewId),
        supabase
          .from("document_versions")
          .update({
            review_status: "released",
            approved_at: now.toISOString(),
          })
          .eq("id", values.documentId),
      ]);
    if (reviewError || documentError) {
      throw new Error("Review release metadata could not be recorded");
    }

    const { error: reportReadyError } = await supabase
      .from("projects")
      .update({ status: "report_ready" })
      .eq("id", values.projectId);
    if (reportReadyError) throw reportReadyError;
    if (releasedDocument.version_number === 1) {
      const revisionDeadline = new Date(now);
      revisionDeadline.setUTCDate(revisionDeadline.getUTCDate() + 14);
      const { error: revisionError } = await supabase
        .from("projects")
        .update({
          status: "revision_available",
          revision_deadline: revisionDeadline.toISOString(),
        })
        .eq("id", values.projectId);
      if (revisionError) throw revisionError;
    } else {
      const { error: completeError } = await supabase
        .from("projects")
        .update({ status: "completed" })
        .eq("id", values.projectId);
      if (completeError) throw completeError;
    }

    await supabase.from("analytics_events").insert({
      project_id: values.projectId,
      event_name: "operator_review_completed",
      properties: {
        approved_findings: approvedCount,
        suppressed_findings: suppressedCount,
        manual_findings: manualCount,
      },
    });
    const { data: releasedProject } = await supabase
      .from("projects")
      .select("owner_id, title")
      .eq("id", values.projectId)
      .single();
    if (releasedProject) {
      await sendReportReadyEmail({
        ownerId: releasedProject.owner_id,
        projectId: values.projectId,
        projectTitle: releasedProject.title,
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/projects/${values.projectId}`);
  revalidatePath(`/dashboard/projects/${values.projectId}`);
}
