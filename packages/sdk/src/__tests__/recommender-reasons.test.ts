import { describe, expect, it } from "vitest";
import { collectReasonSupplementsForTests } from "../recommender";
import { minimalProfile } from "../test/fixtures";

describe("collectReasonSupplementsForTests (vertical-safe counters)", () => {
  it("uses neutral copy for detail views when vertical is not automotive", () => {
    const seed = minimalProfile();
    const p = minimalProfile({
      site_context: { ...seed.site_context, vertical: "b2b_saas" },
      signals: { ...seed.signals, vdp_views: 3 },
    });
    const lines = collectReasonSupplementsForTests(p);
    expect(lines.some((l) => /\bVDP\b/i.test(l))).toBe(false);
    expect(lines.some((l) => /detail-page views/i.test(l))).toBe(true);
  });

  it("keeps VDP label for auto_retail", () => {
    const p = minimalProfile({ signals: { ...minimalProfile().signals, vdp_views: 2 } });
    expect(p.site_context.vertical).toBe("auto_retail");
    const lines = collectReasonSupplementsForTests(p);
    expect(lines.some((l) => /VDP views/.test(l))).toBe(true);
  });

  it("keeps VDP label for auto_oem", () => {
    const seed = minimalProfile();
    const p = minimalProfile({
      site_context: { ...seed.site_context, vertical: "auto_oem" },
      signals: { ...seed.signals, vdp_views: 2 },
    });
    const lines = collectReasonSupplementsForTests(p);
    expect(lines.some((l) => /VDP views/.test(l))).toBe(true);
  });
});
