import { describe, expect, it } from "vitest";
import { canTransition, projectStatusSchema } from "./index";

describe("project state machine", () => {
  it("accepts the complete supported state set", () => {
    expect(projectStatusSchema.parse("awaiting_operator_review")).toBe(
      "awaiting_operator_review",
    );
  });

  it("allows only explicit transitions", () => {
    expect(canTransition("draft", "awaiting_payment")).toBe(true);
    expect(canTransition("draft", "report_ready")).toBe(false);
    expect(canTransition("completed", "draft")).toBe(false);
  });
});
