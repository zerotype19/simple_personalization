import { describe, expect, it } from "vitest";
import {
  CONCEPT_DISPLAY_MIN_SCORE,
  computeConceptAffinity,
  computeConceptAffinityDetailed,
  conceptSignalLabel,
} from "./mapConcepts";
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

  it("normalizes scores to 0–1 and applies display floor", () => {
    const out = computeConceptAffinity("b2b_saas", scan(), {});
    for (const v of Object.values(out)) {
      expect(v).toBeGreaterThanOrEqual(CONCEPT_DISPLAY_MIN_SCORE);
      expect(v).toBeLessThanOrEqual(1);
    }
    const max = Math.max(...Object.values(out));
    expect(max).toBe(1);
  });

  it("matches intent_phrases against page text for stronger implementation signal", () => {
    const aff: CategoryAffinity = {};
    const scanTitle = scan({
      page_title: "How to implement this operating cadence for your team",
      top_terms: ["team", "cadence"],
    });
    const out = computeConceptAffinityDetailed("b2b_saas", scanTitle, aff);
    expect(out.affinity["Implementation readiness"]).toBeDefined();
    const ev = out.evidence["Implementation readiness"] ?? [];
    expect(ev.some((t) => t.includes("implement"))).toBe(true);
  });
});

describe("conceptSignalLabel", () => {
  it("maps score bands to copy", () => {
    expect(conceptSignalLabel(0.09)).toBeNull();
    expect(conceptSignalLabel(0.15)).toBe("light signal");
    expect(conceptSignalLabel(0.55)).toBe("emerging signal");
    expect(conceptSignalLabel(0.88)).toBe("strong signal");
  });
});
