import { describe, expect, it } from "vitest";
import { classifyVertical } from "./siteIntelligence/verticalClassifier";
import { runSiteScan } from "./siteIntelligence";
import { parseSiteVerticalOverride, resolveSiteVertical } from "./siteVerticalOverride";

describe("parseSiteVerticalOverride", () => {
  it("accepts auto_retail and common aliases", () => {
    expect(parseSiteVerticalOverride("auto_retail")).toBe("auto_retail");
    expect(parseSiteVerticalOverride("auto-retail")).toBe("auto_retail");
    expect(parseSiteVerticalOverride("auto")).toBe("auto_retail");
  });

  it("rejects unknown tokens", () => {
    expect(parseSiteVerticalOverride("not_a_vertical")).toBeUndefined();
  });
});

describe("resolveSiteVertical", () => {
  it("uses explicit override instead of inferred B2B SaaS scan", () => {
    const scan = runSiteScan();
    scan.page_title = "Optiview — Live decision demo";
    scan.top_terms = ["optiview", "runtime", "integration", "dashboard", "demo"];
    scan.content_themes = ["Measurement & learning", "Demo / talk-to-sales intent"];
    const inferred = classifyVertical(scan, "/compare");
    expect(inferred.vertical).toBe("b2b_saas");

    const resolved = resolveSiteVertical(scan, "/compare", "auto_retail");
    expect(resolved.vertical).toBe("auto_retail");
    expect(resolved.confidence).toBe(100);
  });
});
