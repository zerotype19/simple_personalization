import { describe, expect, it } from "vitest";
import { PROGRESSION_LABELS } from "./journeyConfig";

describe("demo path progress labels", () => {
  it("uses scripted-path wording distinct from inspector escalation earned", () => {
    expect(PROGRESSION_LABELS).toEqual(["Exploring", "Evaluating", "Comparing", "Test-drive step"]);
    expect(PROGRESSION_LABELS).not.toContain("Escalation earned");
  });
});
