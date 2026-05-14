import { describe, expect, it } from "vitest";
import { buildSiteEnvironment } from "../siteEnvironment/buildSiteEnvironment";
import { classifyGenericPage, timelineHumanPageLabel } from "../siteEnvironment/genericPageClassifier";

const emptyScan = {
  domain: "example.com",
  site_name: "Example",
  page_title: "Checkout",
  top_terms: ["checkout", "pay", "ship"],
  primary_ctas: ["Place order"],
  content_themes: [],
};

describe("classifyGenericPage", () => {
  it("detects checkout from path", () => {
    const r = classifyGenericPage("/checkout", emptyScan, "other", []);
    expect(r.generic_kind).toBe("checkout_page");
    expect(r.confidence).toBeGreaterThan(0.8);
  });

  it("detects article from JSON-LD Article", () => {
    const r = classifyGenericPage("/foo", { ...emptyScan, page_title: "Post" }, "other", ["NewsArticle"]);
    expect(r.generic_kind).toBe("article_page");
  });
});

describe("timelineHumanPageLabel", () => {
  it("uses path hints for unknown kinds instead of unknown-page copy", () => {
    expect(timelineHumanPageLabel("unknown", "/part-iii/chapter-6")).toBe("Chapter page");
    expect(timelineHumanPageLabel("unknown", "/dive-into-rhythm90/manifesto")).toBe("Guide or manifesto page");
    expect(timelineHumanPageLabel("unknown", "/dive-into-rhythm90/overview")).toBe("Learning or onboarding page");
    expect(timelineHumanPageLabel("article_page", "/blog/x")).toBe("Long-form editorial content");
  });
});

describe("buildSiteEnvironment", () => {
  it("returns ladder and fingerprint", () => {
    const env = buildSiteEnvironment({
      pathname: "/pricing",
      scan: {
        ...emptyScan,
        page_title: "Plans and pricing",
        primary_ctas: ["Start free trial", "Book a demo"],
      },
      vertical: "b2b_saas",
      verticalConfidencePct: 72,
      pageType: "other",
    });
    expect(env.site.site_type).toBe("b2b_saas");
    expect(env.page.generic_kind).toBe("pricing_page");
    expect(env.ladder.level).toBeGreaterThanOrEqual(1);
    expect(env.conversion.detected_elements.length).toBeGreaterThan(0);
  });
});
