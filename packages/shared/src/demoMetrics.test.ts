import { describe, expect, it } from "vitest";
import { demoLiftPreviewCopy, getDemoExperimentReports } from "./demoMetrics";

describe("getDemoExperimentReports", () => {
  it("has treatment lift matching control vs treatment rates", () => {
    const exp = getDemoExperimentReports()[0]!;
    const c = exp.variants.find((v) => v.is_control)!;
    const t = exp.variants.find((v) => !v.is_control)!;
    expect(t.lift_cta).toBeCloseTo((t.cta_ctr - c.cta_ctr) / c.cta_ctr, 10);
    expect(t.lift_conversion).toBeCloseTo((t.conversion_rate - c.conversion_rate) / c.conversion_rate, 10);
  });
});

describe("demoLiftPreviewCopy", () => {
  it("formats CTR and lead lines for the inspector", () => {
    const { ctaLine, leadLine } = demoLiftPreviewCopy();
    expect(ctaLine).toContain("8.2%");
    expect(ctaLine).toContain("9.7%");
    expect(leadLine).toContain("1.8%");
    expect(leadLine).toContain("2.1%");
  });
});
