import { findingSchema } from "@preflight/contracts";
import { describe, expect, it } from "vitest";
import { sampleFindings } from "./sample-report";

describe("synthetic sample report", () => {
  it("contains only valid, source-linked findings", () => {
    expect(sampleFindings).toHaveLength(3);
    for (const finding of sampleFindings) {
      expect(findingSchema.parse(finding)).toEqual(finding);
      expect(finding.sources.length).toBeGreaterThan(0);
    }
  });

  it("does not misrepresent unsupported construction as a result", () => {
    const unsupported = sampleFindings.find(
      (finding) => finding.ruleId === "UNSUPPORTED_CONSTRUCTION",
    );

    expect(unsupported?.severity).toBe("information");
    expect(unsupported?.formula).toBe("No calculation run");
  });
});
