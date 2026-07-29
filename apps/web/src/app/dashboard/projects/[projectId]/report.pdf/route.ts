import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  preflightResultSchema,
  renderApprovedReport,
  type PatternModelPayload,
} from "@/lib/preflight-client";
import { createServerNeonClient } from "@/lib/neon/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const user = await requireUser();
  if (user.sample) {
    return NextResponse.redirect(
      new URL(
        "/sample-preflight-report.pdf",
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      ),
    );
  }
  const { projectId } = await context.params;
  const supabase = await createServerNeonClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, status")
    .eq("id", projectId)
    .single();
  if (
    !project ||
    !["report_ready", "revision_available", "completed"].includes(
      project.status,
    )
  ) {
    return NextResponse.json(
      { error: "Report is not released" },
      { status: 404 },
    );
  }
  const { data: document } = await supabase
    .from("document_versions")
    .select("id, confirmed_model, preflight_metadata")
    .eq("project_id", project.id)
    .eq("review_status", "released")
    .order("version_number", { ascending: false })
    .limit(1)
    .single();
  if (!document?.confirmed_model || !document.preflight_metadata) {
    return NextResponse.json(
      { error: "Approved report snapshot is unavailable" },
      { status: 404 },
    );
  }
  const { data: findings } = await supabase
    .from("findings")
    .select("*, finding_sources(*)")
    .eq("document_version_id", document.id)
    .neq("status", "operator_suppressed");

  const metadata = document.preflight_metadata;
  const result = preflightResultSchema.parse({
    ...metadata,
    findings: (findings ?? []).map((finding) => ({
      id: finding.id,
      rule_id: finding.rule_id,
      rule_version: finding.rule_version,
      severity: finding.severity,
      category: finding.category,
      title: finding.title,
      explanation: finding.explanation,
      formula: finding.formula,
      operands: finding.operands,
      expected_result: finding.expected_result,
      stated_result: finding.stated_result,
      difference: finding.difference,
      confidence: Number(finding.confidence),
      sources: finding.finding_sources.map(
        (source: {
          page: number | null;
          section: string | null;
          excerpt: string;
          bounding_box: unknown;
        }) => ({
          page: source.page,
          section: source.section,
          excerpt: source.excerpt,
          bounding_box: source.bounding_box,
        }),
      ),
      assumptions: finding.assumptions_used,
      recommended_action: finding.recommended_action,
      limitation: finding.limitation,
    })),
  });
  const content = await renderApprovedReport({
    model: document.confirmed_model as PatternModelPayload,
    result,
  });
  await supabase.from("analytics_events").insert({
    owner_id: user.id,
    project_id: project.id,
    event_name: "report_downloaded",
    properties: {},
  });

  return new NextResponse(content, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="preflight-report.pdf"',
      "cache-control": "private, no-store",
    },
  });
}
