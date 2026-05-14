import { describe, expect, it } from "vitest";
import { inferActivationOpportunity } from "../siteSemantics/conversionArchitecture";
import { emptyPageSemantics } from "../siteSemantics/defaults";
import { emptySiteEnvironmentSnapshot } from "../siteEnvironment/emptySnapshot";
import { minimalProfile } from "../test/fixtures";

describe("activation playbook (b2b marketing ops)", () => {
  it("matches returning engaged B2B visitor with planning/implementation concepts and enriches opportunity", () => {
    const seed = minimalProfile();
    const profile = minimalProfile({
      site_context: {
        ...seed.site_context,
        vertical: "b2b_saas",
        vertical_confidence: 80,
        scan: {
          ...seed.site_context.scan,
          domain: "rhythm90.io",
          page_title: "Operating rhythm",
          primary_ctas: [],
        },
      },
      engagement_score: 58,
      signals: {
        ...seed.signals,
        return_visit: true,
        cta_clicks: 0,
        max_scroll_depth: 72,
        pages_viewed: 1,
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
    expect(ao.playbook?.id).toBe("b2b_marketing_ops_implementation_evaluator");
    expect(ao.inferred_need).toContain("operating model");
    expect(ao.message_angle.toLowerCase()).toContain("practical");
    expect(ao.evidence[0]).toContain("playbook");
  });

  it("does not match when concept signals are below threshold", () => {
    const seed = minimalProfile();
    const profile = minimalProfile({
      site_context: {
        ...seed.site_context,
        vertical: "b2b_saas",
        scan: { ...seed.site_context.scan, primary_ctas: [] },
      },
      engagement_score: 58,
      signals: {
        ...seed.signals,
        return_visit: true,
        cta_clicks: 0,
        max_scroll_depth: 72,
      },
      concept_affinity: {
        "Marketing workflow": 0.22,
      },
    });
    const env = {
      ...emptySiteEnvironmentSnapshot(),
      page: { ...emptySiteEnvironmentSnapshot().page, generic_kind: "homepage" as const, confidence: 0.7 },
      conversion: { ...emptySiteEnvironmentSnapshot().conversion, confidence: 0.55 },
    };
    const ao = inferActivationOpportunity({
      profile,
      env,
      scan: profile.site_context.scan,
      semantics: emptyPageSemantics(),
    });
    expect(ao.playbook).toBeNull();
  });
});
