import { describe, expect, it } from "vitest";
import { compareFindings, type ComparableFinding } from "@/lib/revision";

function finding(
  id: string,
  rule: string,
  operands: Record<string, string>,
): ComparableFinding {
  return {
    id,
    rule_id: rule,
    category: "arithmetic",
    title: `${rule} finding`,
    operands,
  };
}

describe("compareFindings", () => {
  it("classifies resolved, remaining and new issues without relying on UUIDs", () => {
    const previous = [
      finding("old-count", "COUNT", { expected: "40", stated: "32" }),
      finding("old-grid", "GRID", { expected: "60", stated: "58" }),
    ];
    const current = [
      finding("new-id-same-grid", "GRID", { stated: "58", expected: "60" }),
      finding("new-yardage", "YARDAGE", { expected: "2", stated: "1 3/4" }),
    ];

    expect(compareFindings(previous, current)).toEqual({
      resolved: ["old-count"],
      remaining: ["new-id-same-grid"],
      new: ["new-yardage"],
    });
  });

  it("returns empty groups for two clean versions", () => {
    expect(compareFindings([], [])).toEqual({
      resolved: [],
      remaining: [],
      new: [],
    });
  });
});
