"use server";

import { createHash, randomUUID } from "node:crypto";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { isLocalSampleMode } from "@/lib/env";
import {
  extractPatternDocument,
  runPatternPreflight,
  type PatternModelPayload,
} from "@/lib/preflight-client";
import { compareFindings } from "@/lib/revision";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const acceptedFiles = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

const uploadSchema = z.object({
  title: z.string().trim().min(1).max(200),
  source: z.enum([
    "direct_email",
    "instagram",
    "facebook_group",
    "reddit",
    "designer_directory",
    "technical_editor_referral",
    "other",
  ]),
  seamAllowance: z.string().trim().min(1).max(20),
  usableWof: z.string().trim().min(1).max(20),
  rounding: z.string().trim().min(1).max(20),
  measurementState: z.enum(["finished", "unfinished", "mixed"]),
  blockRows: z.coerce.number().int().positive().max(1000),
  blockColumns: z.coerce.number().int().positive().max(1000),
});

function fileExtension(filename: string): keyof typeof acceptedFiles | null {
  const extension = filename.toLowerCase().split(".").pop();
  return extension === "pdf" || extension === "docx" ? extension : null;
}

function validateFile(value: FormDataEntryValue | null): File {
  if (!(value instanceof File) || value.size === 0) {
    throw new Error("Choose a DOCX or text-layer PDF");
  }
  if (value.size > MAX_UPLOAD_BYTES) {
    throw new Error("The document exceeds the 15 MB upload limit");
  }
  const extension = fileExtension(value.name);
  if (!extension || value.type !== acceptedFiles[extension]) {
    throw new Error("The file type and extension must be a DOCX or PDF");
  }
  return value;
}

export async function createProjectUpload(formData: FormData) {
  const user = await requireUser();
  if (isLocalSampleMode() || user.sample) {
    redirect("/demo");
  }

  const values = uploadSchema.parse(Object.fromEntries(formData));
  const file = validateFile(formData.get("patternFile"));
  const extraction = await extractPatternDocument(file);
  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storagePath = `${user.id}/${randomUUID()}.${extraction.file_type}`;
  const deleteAfter = new Date();
  deleteAfter.setUTCDate(
    deleteAfter.getUTCDate() +
      Number(process.env.RAW_FILE_RETENTION_DAYS ?? "30"),
  );

  const admin = createAdminSupabaseClient();
  let projectId: string | null = null;
  let uploaded = false;

  try {
    const { data: source, error: sourceError } = await admin
      .from("acquisition_sources")
      .insert({ owner_id: user.id, source: values.source })
      .select("id")
      .single();
    if (sourceError) throw sourceError;

    const { data: project, error: projectError } = await admin
      .from("projects")
      .insert({
        owner_id: user.id,
        acquisition_source_id: source.id,
        title: values.title,
        status: "ready_for_upload",
      })
      .select("id")
      .single();
    if (projectError) throw projectError;
    projectId = project.id;

    const { error: extractingError } = await admin
      .from("projects")
      .update({ status: "extracting" })
      .eq("id", projectId);
    if (extractingError) throw extractingError;

    const { data: storageObject, error: storageError } = await admin.storage
      .from("pattern-documents")
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });
    if (storageError) throw storageError;
    uploaded = true;

    const { data: document, error: documentError } = await admin
      .from("document_versions")
      .insert({
        project_id: projectId,
        version_number: 1,
        original_filename: file.name,
        storage_path: storagePath,
        file_type: extraction.file_type,
        size_bytes: file.size,
        mime_type: file.type,
        sha256,
        page_count: extraction.page_count,
        text_layer_available: extraction.text_layer_available,
        extraction_status: "succeeded",
        raw_file_delete_after: deleteAfter.toISOString(),
      })
      .select("id")
      .single();
    if (documentError) throw documentError;

    const entityRows = extraction.entities.map((entity) => ({
      document_version_id: document.id,
      entity_type: entity.entity_type,
      raw_value: entity.value,
      normalized_value: entity.normalized_value,
      source_page: entity.source.page,
      source_section: entity.source.section,
      source_excerpt: entity.source.excerpt,
      source_bounding_box: entity.source.bounding_box,
      extraction_method: entity.extraction_method,
      confidence: entity.confidence,
      confirmation_status: "proposed",
    }));
    if (entityRows.length) {
      const { error } = await admin.from("extracted_entities").insert(entityRows);
      if (error) throw error;
    }

    const assumptions = {
      version: 1,
      measurement_system: "imperial",
      seam_allowance: values.seamAllowance,
      usable_wof: values.usableWof,
      fabric_rounding_increment: values.rounding,
      default_measurement_state: values.measurementState,
      block_rows: values.blockRows,
      block_columns: values.blockColumns,
      waste_included: formData.get("wasteIncluded") === "on",
      extra_pieces_deliberate: formData.get("extraPiecesDeliberate") === "on",
      strip_piecing: formData.get("stripPiecing") === "on",
      sashing_used: formData.get("sashingUsed") === "on",
      borders_used: formData.get("bordersUsed") === "on",
      complete_cutting_tables: formData.get("completeTables") === "on",
      construction_flags: formData.getAll("constructionFlags").map(String),
    };

    const writes = await Promise.all([
      admin.from("uploads").insert({
        document_version_id: document.id,
        storage_object_id: storageObject.id ?? null,
        validation_result: {
          page_count: extraction.page_count,
          text_layer_available: extraction.text_layer_available,
          structural_suitability: extraction.structural_suitability,
          warning_codes: extraction.warnings,
        },
      }),
      admin.from("extraction_jobs").insert({
        document_version_id: document.id,
        idempotency_key: `extract:${document.id}:${sha256}`,
        status: "succeeded",
        parser_version: "deterministic-v1",
        attempt_count: 1,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }),
      admin.from("assumptions").insert({
        document_version_id: document.id,
        version: 1,
        values: assumptions,
      }),
      admin.from("analytics_events").insert({
        owner_id: user.id,
        project_id: projectId,
        event_name: "file_uploaded",
        properties: {
          file_type: extraction.file_type,
          structural_suitability: extraction.structural_suitability,
        },
      }),
    ]);
    const writeError = writes.find((result) => result.error)?.error;
    if (writeError) throw writeError;

    const { error: readyError } = await admin
      .from("projects")
      .update({ status: "awaiting_customer_confirmation" })
      .eq("id", projectId);
    if (readyError) throw readyError;
  } catch (error) {
    if (uploaded) {
      await admin.storage.from("pattern-documents").remove([storagePath]);
    }
    if (projectId) {
      await admin.from("projects").update({ status: "failed" }).eq("id", projectId);
    }
    throw new Error(
      error instanceof Error && error.message
        ? `Project upload failed: ${error.message}`
        : "Project upload failed",
    );
  }

  redirect(`/dashboard/projects/${projectId}/confirm` as Route);
}

export async function uploadRevision(formData: FormData) {
  const user = await requireUser();
  if (user.sample) redirect("/demo");
  const projectId = z.string().uuid().parse(formData.get("projectId"));
  const file = validateFile(formData.get("patternFile"));
  const admin = createAdminSupabaseClient();
  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, owner_id, status, revision_deadline, revision_used_at")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .single();
  if (
    projectError ||
    project.status !== "revision_available" ||
    project.revision_used_at ||
    !project.revision_deadline ||
    new Date(project.revision_deadline) < new Date()
  ) {
    throw new Error("The included revision is not currently available");
  }

  const extraction = await extractPatternDocument(file);
  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storagePath = `${user.id}/${randomUUID()}.${extraction.file_type}`;
  const deleteAfter = new Date();
  deleteAfter.setUTCDate(
    deleteAfter.getUTCDate() +
      Number(process.env.RAW_FILE_RETENTION_DAYS ?? "30"),
  );
  let uploaded = false;

  try {
    const { error: processingError } = await admin
      .from("projects")
      .update({ status: "revision_processing" })
      .eq("id", project.id);
    if (processingError) throw processingError;

    const { data: storageObject, error: storageError } = await admin.storage
      .from("pattern-documents")
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      });
    if (storageError) throw storageError;
    uploaded = true;

    const { data: document, error: documentError } = await admin
      .from("document_versions")
      .insert({
        project_id: project.id,
        version_number: 2,
        original_filename: file.name,
        storage_path: storagePath,
        file_type: extraction.file_type,
        size_bytes: file.size,
        mime_type: file.type,
        sha256,
        page_count: extraction.page_count,
        text_layer_available: extraction.text_layer_available,
        extraction_status: "succeeded",
        raw_file_delete_after: deleteAfter.toISOString(),
      })
      .select("id")
      .single();
    if (documentError) throw documentError;

    const { data: previousDocument, error: previousError } = await admin
      .from("document_versions")
      .select("id")
      .eq("project_id", project.id)
      .eq("version_number", 1)
      .single();
    if (previousError) throw previousError;
    const { data: previousAssumptions, error: assumptionsError } = await admin
      .from("assumptions")
      .select("values")
      .eq("document_version_id", previousDocument.id)
      .order("version", { ascending: false })
      .limit(1)
      .single();
    if (assumptionsError) throw assumptionsError;

    const entityRows = extraction.entities.map((entity) => ({
      document_version_id: document.id,
      entity_type: entity.entity_type,
      raw_value: entity.value,
      normalized_value: entity.normalized_value,
      source_page: entity.source.page,
      source_section: entity.source.section,
      source_excerpt: entity.source.excerpt,
      source_bounding_box: entity.source.bounding_box,
      extraction_method: entity.extraction_method,
      confidence: entity.confidence,
      confirmation_status: "proposed",
    }));
    const writes = await Promise.all([
      entityRows.length
        ? admin.from("extracted_entities").insert(entityRows)
        : Promise.resolve({ error: null }),
      admin.from("uploads").insert({
        document_version_id: document.id,
        storage_object_id: storageObject.id ?? null,
        validation_result: {
          page_count: extraction.page_count,
          text_layer_available: extraction.text_layer_available,
          structural_suitability: extraction.structural_suitability,
          warning_codes: extraction.warnings,
        },
      }),
      admin.from("extraction_jobs").insert({
        document_version_id: document.id,
        idempotency_key: `extract:${document.id}:${sha256}`,
        status: "succeeded",
        parser_version: "deterministic-v1",
        attempt_count: 1,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      }),
      admin.from("assumptions").insert({
        document_version_id: document.id,
        version: 1,
        values: previousAssumptions.values,
      }),
      admin.from("analytics_events").insert({
        owner_id: user.id,
        project_id: project.id,
        event_name: "revision_uploaded",
        properties: {
          file_type: extraction.file_type,
          copied_prior_assumptions: true,
        },
      }),
    ]);
    const writeError = writes.find((write) => write.error)?.error;
    if (writeError) throw writeError;

    const { error: readyError } = await admin
      .from("projects")
      .update({ status: "awaiting_customer_confirmation" })
      .eq("id", project.id);
    if (readyError) throw readyError;
  } catch (error) {
    if (uploaded) {
      await admin.storage.from("pattern-documents").remove([storagePath]);
    }
    await admin.from("projects").update({ status: "failed" }).eq("id", project.id);
    throw new Error(
      error instanceof Error ? `Revision upload failed: ${error.message}` : "Revision upload failed",
    );
  }

  redirect(`/dashboard/projects/${project.id}/confirm` as Route);
}

const confirmationSchema = z.object({
  projectId: z.string().uuid(),
  documentId: z.string().uuid(),
  title: z.string().min(1).max(200),
  pieceName: z.string().trim().min(1).max(200),
  cutWidth: z.string().trim().min(1).max(40),
  cutHeight: z.string().trim().min(1).max(40),
  quantityPerBlock: z.coerce.number().int().nonnegative(),
  statedTotalQuantity: z.coerce.number().int().nonnegative(),
  blockName: z.string().trim().min(1).max(200),
  finishedWidth: z.string().trim().min(1).max(40),
  finishedHeight: z.string().trim().min(1).max(40),
  blockQuantity: z.coerce.number().int().positive(),
  statedQuiltWidth: z.string().trim().max(40).optional(),
  statedQuiltHeight: z.string().trim().max(40).optional(),
});

export async function confirmAndSubmitPreflight(formData: FormData) {
  const user = await requireUser();
  if (user.sample) redirect("/demo");
  const values = confirmationSchema.parse(Object.fromEntries(formData));
  const admin = createAdminSupabaseClient();

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id, owner_id, title, status")
    .eq("id", values.projectId)
    .eq("owner_id", user.id)
    .single();
  if (projectError || project.status !== "awaiting_customer_confirmation") {
    throw new Error("This project is not available for confirmation");
  }

  const { data: document, error: documentError } = await admin
    .from("document_versions")
    .select("id, version_number")
    .eq("id", values.documentId)
    .eq("project_id", project.id)
    .single();
  if (documentError) throw new Error("Document version was not found");

  const { data: assumptionsRow, error: assumptionsError } = await admin
    .from("assumptions")
    .select("values")
    .eq("document_version_id", document.id)
    .eq("version", 1)
    .single();
  if (assumptionsError) throw new Error("Confirmed assumptions were not found");

  const { data: entities, error: entitiesError } = await admin
    .from("extracted_entities")
    .select("*")
    .eq("document_version_id", document.id)
    .order("created_at");
  if (entitiesError) throw new Error("Extracted entities could not be read");

  for (const entity of entities) {
    const corrected = String(formData.get(`entity_${entity.id}`) ?? "").trim();
    const status =
      formData.get(`include_${entity.id}`) === "on"
        ? corrected === entity.normalized_value
          ? "confirmed"
          : "corrected"
        : "rejected";
    const { error } = await admin
      .from("extracted_entities")
      .update({
        normalized_value: corrected || entity.normalized_value,
        confirmation_status: status,
      })
      .eq("id", entity.id);
    if (error) throw new Error("An extracted value could not be confirmed");
  }

  const assumptions = assumptionsRow.values as PatternModelPayload["assumptions"];
  const sources = entities.slice(0, 3).map((entity) => ({
    page: entity.source_page,
    section: entity.source_section,
    excerpt: entity.source_excerpt,
    bounding_box: entity.source_bounding_box,
  }));
  const model: PatternModelPayload = {
    schema_version: "1.0.0",
    project_id: project.id,
    document_version: document.version_number,
    title: values.title,
    assumptions,
    fabrics: [],
    pieces: [
      {
        name: values.pieceName,
        cut_width: values.cutWidth,
        cut_height: values.cutHeight,
        quantity_per_block: values.quantityPerBlock,
        stated_total_quantity: values.statedTotalQuantity,
        extra_quantity: 0,
        sources,
        confirmed: true,
      },
    ],
    blocks: [
      {
        name: values.blockName,
        finished_width: values.finishedWidth,
        finished_height: values.finishedHeight,
        quantity: values.blockQuantity,
        grid_rows: assumptions.block_rows,
        grid_columns: assumptions.block_columns,
        stated_quilt_width: values.statedQuiltWidth || null,
        stated_quilt_height: values.statedQuiltHeight || null,
        sources,
        confirmed: true,
      },
    ],
    used_piece_names: [values.pieceName],
  };

  const result = await runPatternPreflight(model);
  const { error: readyError } = await admin
    .from("projects")
    .update({ status: "ready_for_preflight" })
    .eq("id", project.id);
  if (readyError) throw new Error("Project could not enter preflight");

  if (document.version_number === 1) {
    const userSupabase = await createServerSupabaseClient();
    const { error: creditError } = await userSupabase.rpc(
      "consume_project_credit",
      { p_project_id: project.id },
    );
    if (creditError) {
      throw new Error("A paid pattern credit is required before submission");
    }
  } else {
    const { error: processingError } = await admin
      .from("projects")
      .update({ status: "processing" })
      .eq("id", project.id);
    if (processingError) throw processingError;
  }

  try {
    const [{ error: pieceError }, { error: blockError }] = await Promise.all([
      admin.from("pieces").insert({
        document_version_id: document.id,
        name: values.pieceName,
        cut_width: values.cutWidth,
        cut_height: values.cutHeight,
        quantity_per_block: values.quantityPerBlock,
        stated_total_quantity: values.statedTotalQuantity,
        source_references: sources,
        confirmed: true,
      }),
      admin.from("blocks").insert({
        document_version_id: document.id,
        name: values.blockName,
        finished_width: values.finishedWidth,
        finished_height: values.finishedHeight,
        quantity: values.blockQuantity,
        grid_rows: assumptions.block_rows,
        grid_columns: assumptions.block_columns,
        source_references: sources,
        confirmed: true,
      }),
    ]);
    if (pieceError || blockError) throw pieceError ?? blockError;

    for (const finding of result.findings) {
      const { data: inserted, error: findingError } = await admin
        .from("findings")
        .insert({
          id: finding.id,
          document_version_id: document.id,
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
          confidence: finding.confidence,
          assumptions_used: finding.assumptions,
          recommended_action: finding.recommended_action,
          limitation: finding.limitation,
          automated_snapshot: finding,
        })
        .select("id")
        .single();
      if (findingError) throw findingError;
      if (finding.sources.length) {
        const { error: sourceError } = await admin
          .from("finding_sources")
          .insert(
            finding.sources.map((source) => ({
              finding_id: inserted.id,
              page: source.page,
              section: source.section,
              excerpt: source.excerpt,
              bounding_box: source.bounding_box,
            })),
          );
        if (sourceError) throw sourceError;
      }
    }

    let comparison = null;
    if (document.version_number === 2) {
      const { data: previousDocument } = await admin
        .from("document_versions")
        .select("id")
        .eq("project_id", project.id)
        .eq("version_number", 1)
        .single();
      const { data: previousFindings } = await admin
        .from("findings")
        .select("id, rule_id, category, title, operands")
        .eq("document_version_id", previousDocument?.id ?? "");
      comparison = compareFindings(previousFindings ?? [], result.findings);
      if (comparison.resolved.length) {
        const { error: resolvedError } = await admin
          .from("findings")
          .update({ status: "resolved_in_revision" })
          .in("id", comparison.resolved);
        if (resolvedError) throw resolvedError;
      }
    }

    const writes = await Promise.all([
      admin.from("operator_reviews").insert({
        document_version_id: document.id,
        status: "not_started",
        automated_findings_count: result.findings.length,
      }),
      admin
        .from("document_versions")
        .update({
          submitted_at: new Date().toISOString(),
          confirmed_model: model,
          preflight_metadata: {
            engine_version: result.engine_version,
            rule_versions: result.rule_versions,
            generated_at: result.generated_at,
            model_hash: result.model_hash,
            checked_areas: result.checked_areas,
            unsupported_areas: result.unsupported_areas,
          },
          comparison_result: comparison,
        })
        .eq("id", document.id),
      admin
        .from("projects")
        .update({
          status: "awaiting_operator_review",
          ...(document.version_number === 2
            ? { revision_used_at: new Date().toISOString() }
            : {}),
        })
        .eq("id", project.id),
      admin.from("analytics_events").insert({
        owner_id: user.id,
        project_id: project.id,
        event_name: "preflight_submitted",
        properties: {
          finding_count: result.findings.length,
          engine_version: result.engine_version,
        },
      }),
    ]);
    const writeError = writes.find((write) => write.error)?.error;
    if (writeError) throw writeError;
  } catch (error) {
    await admin.from("projects").update({ status: "failed" }).eq("id", project.id);
    throw new Error(
      error instanceof Error ? error.message : "Preflight persistence failed",
    );
  }

  redirect(`/dashboard/projects/${project.id}` as Route);
}
