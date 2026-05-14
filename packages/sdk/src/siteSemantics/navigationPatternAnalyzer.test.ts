import { describe, expect, it } from "vitest";
import { createBlankSignals } from "../session";
import { analyzeNavigationPattern } from "./navigationPatternAnalyzer";

describe("analyzeNavigationPattern", () => {
  it("labels path summary roles with timelineHumanPageLabel (no raw unknown)", () => {
    const steps = [
      { path: "/", generic_kind: "homepage" as const, title_snippet: null, t: 1 },
      { path: "/the-rhythmic-marketer", generic_kind: "unknown" as const, title_snippet: null, t: 2 },
    ];
    const nav = analyzeNavigationPattern(steps, createBlankSignals());
    expect(nav.path_summary).toMatch(/Article or story page/);
    expect(nav.path_summary).not.toMatch(/\(unknown\)/i);
  });
});
