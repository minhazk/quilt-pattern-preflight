import type { Finding } from "@preflight/contracts";

export const sampleFindings: Finding[] = [
  {
    id: "9b595e7b-7816-470a-bfd3-7f93083a46ee",
    ruleId: "PIECE_COUNT_RECONCILIATION",
    ruleVersion: "1.0.0",
    severity: "critical",
    category: "Piece quantities",
    title: "8 background rectangles are missing",
    explanation:
      "The confirmed block assembly needs 40 background rectangles, but the cutting table states 32.",
    formula: "(quantity per block × block quantity) + deliberate extras",
    operands: {
      "Quantity per block": "8",
      "Block quantity": "5",
      "Deliberate extras": "0",
    },
    expectedResult: "40 rectangles",
    statedResult: "32 rectangles",
    difference: "8 fewer than expected",
    confidence: 0.99,
    sources: [
      {
        page: 3,
        section: "Background cutting",
        excerpt: "From Background fabric, cut (32) 2½″ × 4½″ rectangles.",
      },
      {
        page: 6,
        section: "Block assembly",
        excerpt: "Make 5 blocks. Each block uses 8 Background rectangles.",
      },
    ],
    assumptions: [
      "5 blocks confirmed",
      "No deliberate extra pieces",
      "Straight-seam construction",
    ],
    recommendedAction:
      "Check whether the cutting quantity or the stated block quantity is incorrect.",
  },
  {
    id: "6f55574c-1d6e-4366-b4ba-290285b2f9bf",
    ruleId: "FINISHED_UNFINISHED_RELATIONSHIP",
    ruleVersion: "1.0.0",
    severity: "warning",
    category: "Dimensions",
    title: "Cut width does not produce the stated finished width",
    explanation:
      "With a confirmed ¼″ seam allowance on both sides, a 4″ finished strip should be cut at 4½″, not 4¼″.",
    formula: "finished width + (2 × seam allowance)",
    operands: {
      "Finished width": "4″",
      "Seam allowance": "¼″",
    },
    expectedResult: "4½″",
    statedResult: "4¼″",
    difference: "¼″ too narrow",
    confidence: 0.96,
    sources: [
      {
        page: 4,
        section: "Accent fabric",
        excerpt: "Cut (10) accent strips 4¼″ × WOF; finishes at 4″.",
      },
    ],
    assumptions: [
      "¼″ seam allowance confirmed",
      "Finished dimension label confirmed",
    ],
    recommendedAction:
      "Confirm whether the cut width or the finished-width label should change.",
  },
  {
    id: "ac4f02a0-01f0-4448-95f3-208872c08040",
    ruleId: "UNSUPPORTED_CONSTRUCTION",
    ruleVersion: "1.0.0",
    severity: "information",
    category: "Supported scope",
    title: "Curved template section needs manual review",
    explanation:
      "A curved template is referenced. Template geometry and curved-seam yield are outside the current preflight scope.",
    formula: "No calculation run",
    operands: {},
    expectedResult: "Manual technical-editor review",
    statedResult: "Curved template detected",
    difference: "Not applicable",
    confidence: 0.91,
    sources: [
      {
        page: 8,
        section: "Optional variation",
        excerpt: "Use Template A to cut the curved corner unit.",
      },
    ],
    assumptions: ["Customer marked optional curved construction as present"],
    recommendedAction:
      "Manual technical-editor review required. This construction is outside the current preflight scope.",
    limitation: "No result was inferred for this section.",
  },
];

export const sampleAssumptions = [
  ["Measurement system", "Imperial"],
  ["Seam allowance", "¼″"],
  ["Usable width of fabric", "40″"],
  ["Fabric rounding", "⅛ yard"],
  ["Layout", "5 blocks, 1 × 5 grid"],
  ["Waste", "Already included where stated"],
];
