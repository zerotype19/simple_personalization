import { describe, expect, it } from "vitest";
import { classifyVertical } from "../siteIntelligence/verticalClassifier";
import type { SiteScanSummary } from "@si/shared";

function baseScan(overrides: Partial<SiteScanSummary> = {}): SiteScanSummary {
  return {
    domain: "example.com",
    site_name: "Example",
    page_title: "",
    top_terms: [],
    primary_ctas: [],
    content_themes: [],
    ...overrides,
  };
}

describe("classifyVertical", () => {
  it("does not classify auto_retail from finance/lease/inventory language alone", () => {
    const scan = baseScan({
      page_title: "Inventory financing and lease options",
      top_terms: ["finance", "lease", "inventory", "credit", "approval", "terms"],
    });
    const { vertical } = classifyVertical(scan, "/loans");
    expect(vertical).not.toBe("auto_retail");
    expect(vertical).not.toBe("auto_oem");
  });

  it("classifies auto_oem when OEM / brand-site cues dominate", () => {
    const scan = baseScan({
      page_title: "Build & Price — choose trims and current offers",
      top_terms: ["models", "trims", "offers", "configure"],
    });
    expect(classifyVertical(scan, "/shopping-tools/build-and-price.html").vertical).toBe("auto_oem");
  });

  it("classifies auto_retail when vehicle-specific cues are present", () => {
    const scan = baseScan({
      page_title: "Used SUVs with VIN check",
      top_terms: ["suv", "dealership", "test", "drive", "msrp", "trim"],
    });
    expect(classifyVertical(scan, "/inventory/used").vertical).toBe("auto_retail");
  });

  it("does not default rich token lists to b2b_saas without SaaS cues", () => {
    const scan = baseScan({
      page_title: "Family owned plumbing since 1982",
      top_terms: ["plumbing", "drain", "repair", "emergency", "local", "licensed", "insured"],
    });
    const { vertical } = classifyVertical(scan, "/");
    expect(vertical).not.toBe("b2b_saas");
    expect(["unknown", "general_business", "local_services", "home_services"]).toContain(vertical);
  });

  it("uses b2b_saas fallback only when explicit SaaS cues exist", () => {
    const scan = baseScan({
      page_title: "API workflow platform pricing",
      top_terms: ["integration", "teams", "dashboard", "workflow", "billing", "security"],
    });
    expect(classifyVertical(scan, "/product").vertical).toBe("b2b_saas");
  });

  it("fixture: healthcare lead-gen page", () => {
    const scan = baseScan({
      page_title: "Schedule a telehealth visit",
      top_terms: ["patient", "clinic", "physician", "appointment", "insurance"],
    });
    expect(classifyVertical(scan, "/patients").vertical).toBe("healthcare");
  });

  it("fixture: B2B SaaS pricing page", () => {
    const scan = baseScan({
      page_title: "Plans and pricing — start your trial",
      top_terms: ["saas", "integration", "api", "security", "sso", "uptime"],
    });
    expect(classifyVertical(scan, "/pricing").vertical).toBe("b2b_saas");
  });

  it("fixture: generic unknown business (sparse cues)", () => {
    const scan = baseScan({
      page_title: "Welcome",
      top_terms: ["welcome", "info"],
    });
    expect(classifyVertical(scan, "/").vertical).toBe("unknown");
  });

  it("fixture: real estate listing", () => {
    const scan = baseScan({
      page_title: "3 bed 2 bath — open house Sunday",
      top_terms: ["listing", "realtor", "hoa", "mortgage", "neighborhood"],
    });
    expect(classifyVertical(scan, "/homes/123").vertical).toBe("real_estate");
  });

  it("fixture: publisher article", () => {
    const scan = baseScan({
      page_title: "Weekly editorial: what changed in markets",
      top_terms: ["article", "author", "newsletter", "subscribe"],
    });
    expect(classifyVertical(scan, "/blog/post-1").vertical).toBe("publisher_content");
  });
});
