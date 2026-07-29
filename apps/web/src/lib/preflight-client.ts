import { z } from "zod";

const sourceSchema = z.object({
  page: z.number().int().positive().nullable(),
  section: z.string().nullable(),
  excerpt: z.string(),
  bounding_box: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .nullable(),
});

export const extractionResultSchema = z.object({
  filename: z.string(),
  file_type: z.enum(["docx", "pdf"]),
  page_count: z.number().int().positive(),
  text_layer_available: z.boolean(),
  structural_suitability: z.enum(["suitable", "review", "unsupported"]),
  plain_text_length: z.number().int().nonnegative(),
  entities: z.array(
    z.object({
      entity_type: z.enum([
        "fabric",
        "piece",
        "dimension",
        "quantity",
        "block",
        "cutting_instruction",
      ]),
      value: z.string(),
      normalized_value: z.string(),
      source: sourceSchema,
      extraction_method: z.string(),
      confidence: z.number().min(0).max(1),
      confirmation_status: z.enum([
        "proposed",
        "confirmed",
        "corrected",
        "rejected",
      ]),
    }),
  ),
  warnings: z.array(z.string()),
});

export const findingSchema = z.object({
  id: z.string().uuid(),
  rule_id: z.string(),
  rule_version: z.string(),
  severity: z.enum(["critical", "warning", "review", "information"]),
  category: z.string(),
  title: z.string(),
  explanation: z.string(),
  formula: z.string(),
  operands: z.record(z.string(), z.string()),
  expected_result: z.string(),
  stated_result: z.string(),
  difference: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(sourceSchema),
  assumptions: z.array(z.string()),
  recommended_action: z.string(),
  limitation: z.string().nullable(),
});

export const preflightResultSchema = z.object({
  engine_version: z.string(),
  rule_versions: z.record(z.string(), z.string()),
  generated_at: z.string(),
  model_hash: z.string(),
  findings: z.array(findingSchema),
  checked_areas: z.array(z.string()),
  unsupported_areas: z.array(z.string()),
});

export type PatternModelPayload = {
  schema_version: "1.0.0";
  project_id: string;
  document_version: number;
  title: string;
  assumptions: {
    version: number;
    measurement_system: "imperial";
    seam_allowance: string;
    usable_wof: string;
    fabric_rounding_increment: string;
    default_measurement_state: "finished" | "unfinished" | "mixed";
    block_rows: number;
    block_columns: number;
    waste_included: boolean;
    extra_pieces_deliberate: boolean;
    strip_piecing: boolean;
    sashing_used: boolean;
    borders_used: boolean;
    complete_cutting_tables: boolean;
    construction_flags: string[];
  };
  fabrics: unknown[];
  pieces: unknown[];
  blocks: unknown[];
  used_piece_names: string[];
};

function serviceHeaders(): HeadersInit {
  const secret = process.env.PREFLIGHT_API_SECRET;
  return secret ? { "x-preflight-secret": secret } : {};
}

function serviceUrl(path: string): string {
  const base = process.env.PREFLIGHT_API_URL ?? "http://localhost:8000";
  return new URL(path, base).toString();
}

export async function extractPatternDocument(file: File) {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch(serviceUrl("/v1/extract"), {
    method: "POST",
    body,
    headers: serviceHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Document extraction rejected (${response.status})`);
  }
  const result = extractionResultSchema.parse(await response.json());
  if (
    !result.text_layer_available ||
    result.structural_suitability === "unsupported"
  ) {
    throw new Error("Document has no supported extractable text structure");
  }
  return result;
}

export async function runPatternPreflight(model: PatternModelPayload) {
  const response = await fetch(serviceUrl("/v1/preflight"), {
    method: "POST",
    body: JSON.stringify(model),
    headers: {
      "content-type": "application/json",
      ...serviceHeaders(),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Preflight engine rejected the model (${response.status})`);
  }
  return preflightResultSchema.parse(await response.json());
}

export async function renderApprovedReport(payload: {
  model: PatternModelPayload;
  result: z.infer<typeof preflightResultSchema>;
}) {
  const response = await fetch(serviceUrl("/v1/approved-report.pdf"), {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
      ...serviceHeaders(),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Report renderer rejected the snapshot (${response.status})`,
    );
  }
  return response.arrayBuffer();
}
