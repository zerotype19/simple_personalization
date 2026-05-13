import { describe, expect, it } from "vitest";
import { computeConceptAffinity } from "./mapConcepts";
import type { CategoryAffinity, SiteScanSummary } from "../index";

function scan(overrides: Partial<SiteScanSummary> = {}): SiteScanSummary {
  return {
    domain: "rhythm90.io",
    site_name: "Rhythm90",
    page_title: "Quarterly planning and team operating rhythm",
    top_terms: ["quarter", "planning", "rhythm90", "signal", "learning", "team", "alignment", "implementation"],
    primary_ctas: [],
    content_themes: [],
    ...overrides,
  };
}

describe("computeConceptAffinity", () => {
  it("maps Rhythm90-style tokens to business concepts, not brand noise", () => {
    const aff: CategoryAffinity = {};
    const out = computeConceptAffinity("b2b_saas", scan(), aff);
    expect(out["Quarterly planning"]).toBeGreaterThan(0);
    expect(out["Team operating rhythm"]).toBeGreaterThan(0);
    expect(out["Measurement & learning"]).toBeGreaterThan(0);
    expect(out["Implementation readiness"]).toBeGreaterThan(0);
    expect(out["Rhythm90"]).toBeUndefined();
    expect(out["rhythm90"]).toBeUndefined();
  });

  it("normalizes scores to 0–1", () => {
    const out = computeConceptAffinity("b2b_saas", scan(), {});
    for (const v of Object.values(out)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    const max = Math.max(...Object.values(out));
    expect(max).toBe(1);
  });
});
