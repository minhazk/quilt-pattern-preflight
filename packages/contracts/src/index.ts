import { z } from "zod";

export const projectStatusSchema = z.enum([
  "draft",
  "awaiting_payment",
  "ready_for_upload",
  "extracting",
  "awaiting_customer_confirmation",
  "ready_for_preflight",
  "processing",
  "awaiting_operator_review",
  "clarification_requested",
  "report_ready",
  "revision_available",
  "revision_processing",
  "completed",
  "cancelled",
  "failed",
]);

export const severitySchema = z.enum([
  "critical",
  "warning",
  "review",
  "information",
]);

export const sourceReferenceSchema = z.object({
  page: z.number().int().positive().optional(),
  section: z.string().min(1).optional(),
  excerpt: z.string().min(1),
  boundingBox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
});

export const assumptionsSchema = z.object({
  version: z.number().int().positive().default(1),
  measurementSystem: z.literal("imperial"),
  seamAllowance: z.string().default("1/4"),
  usableWof: z.string().default("40"),
  fabricRoundingIncrement: z.string().default("1/8"),
  defaultMeasurementState: z.enum(["finished", "unfinished", "mixed"]),
  blockRows: z.number().int().positive(),
  blockColumns: z.number().int().positive(),
  wasteIncluded: z.boolean(),
  extraPiecesDeliberate: z.boolean(),
  stripPiecing: z.boolean(),
  sashingUsed: z.boolean(),
  bordersUsed: z.boolean(),
  completeCuttingTables: z.boolean(),
  constructionFlags: z.array(z.string()).default([]),
});

export const findingSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().min(1),
  ruleVersion: z.string().min(1),
  severity: severitySchema,
  category: z.string().min(1),
  title: z.string().min(1),
  explanation: z.string().min(1),
  formula: z.string().min(1),
  operands: z.record(z.string(), z.string()),
  expectedResult: z.string(),
  statedResult: z.string(),
  difference: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(sourceReferenceSchema).min(1),
  assumptions: z.array(z.string()),
  recommendedAction: z.string().min(1),
  limitation: z.string().optional(),
});

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type Severity = z.infer<typeof severitySchema>;
export type Finding = z.infer<typeof findingSchema>;
export type PatternAssumptions = z.infer<typeof assumptionsSchema>;

const transitions: Record<ProjectStatus, readonly ProjectStatus[]> = {
  draft: ["awaiting_payment", "ready_for_upload", "cancelled"],
  awaiting_payment: ["ready_for_upload", "cancelled", "failed"],
  ready_for_upload: ["extracting", "cancelled"],
  extracting: ["awaiting_customer_confirmation", "failed", "cancelled"],
  awaiting_customer_confirmation: [
    "ready_for_preflight",
    "extracting",
    "cancelled",
  ],
  ready_for_preflight: ["processing", "cancelled"],
  processing: ["awaiting_operator_review", "failed", "cancelled"],
  awaiting_operator_review: [
    "clarification_requested",
    "report_ready",
    "failed",
  ],
  clarification_requested: ["awaiting_customer_confirmation", "cancelled"],
  report_ready: ["revision_available", "completed"],
  revision_available: ["revision_processing", "completed"],
  revision_processing: ["awaiting_customer_confirmation", "failed"],
  completed: [],
  cancelled: [],
  failed: ["ready_for_upload", "processing", "cancelled"],
};

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return transitions[from].includes(to);
}
