import { describe, expect, it } from "vitest";
import { inferActivationOpportunity } from "../siteSemantics/conversionArchitecture";
import { emptyPageSemantics } from "../siteSemantics/defaults";
import { emptySiteEnvironmentSnapshot } from "../siteEnvironment/emptySnapshot";
import { minimalProfile } from "../test/fixtures";

describe("decision quality hardening", () => {
  it("playbook why uses distinct pages, not inflated route transitions", () => {
    const seed = minimalProfile();
    const profile = minimalProfile({
      site_context: {
        ...seed.site_context,
        vertical: "b2b_saas",
        scan: { ...seed.site_context.scan, domain: "rhythm90.io", primary_ctas: [] },
      },
      engagement_score: 58,
      page_journey: [
        { path: "/", generic_kind: "homepage", title_snippet: null, t: 1 },
        { path: "/guide", generic_kind: "unknown", title_snippet: null, t: 2 },
      ],
      signals: {
        ...seed.signals,
        return_visit: false,
        cta_clicks: 0,
        max_scroll_depth: 72,
        pages_viewed: 59,
      },
      concept_affinity: {
        "Implementation readiness": 0.35,
        "Team operating rhythm": 0.28,
      },
      concept_evidence: {},
    });
    const env = {
      ...emptySiteEnvironmentSnapshot(),
      page: { ...emptySiteEnvironmentSnapshot().page, generic_kind: "homepage" as const, confidence: 0.72 },
      conversion: { ...emptySiteEnvironmentSnapshot().conversion, confidence: 0.58 },
    };
    const ao = inferActivationOpportunity({
      profile,
      env,
      scan: profile.site_context.scan,
      semantics: emptyPageSemantics(),
    });
    expect(ao.playbook).not.toBeNull();
    expect(ao.playbook?.why.some((w) => w.includes("2 distinct"))).toBe(true);
    expect(ao.playbook?.why.some((w) => w.includes("Multiple pages viewed"))).toBe(false);
  });
});
