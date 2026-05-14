import { describe, expect, it } from "vitest";
import { buildActivationPayload, buildPersonalizationSignal } from "../siteSemantics/activationPayload";
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

  it("matches first-visit deep reader via scroll depth (Rhythm90 session 2) without return_visit", () => {
    const seed = minimalProfile();
    const profile = minimalProfile({
      site_context: {
        ...seed.site_context,
        vertical: "b2b_saas",
        scan: { ...seed.site_context.scan, domain: "rhythm90.io", primary_ctas: [] },
      },
      engagement_score: 52,
      signals: {
        ...seed.signals,
        return_visit: false,
        cta_clicks: 0,
        max_scroll_depth: 62,
        pages_viewed: 1,
      },
      concept_affinity: {
        "Team operating rhythm": 0.32,
        "Quarterly planning": 0.24,
      },
      concept_evidence: {},
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
    expect(ao.playbook).not.toBeNull();
    expect(ao.playbook?.why.some((w) => w.includes("Deep scroll"))).toBe(true);
  });

  it("includes si.playbook_match on activation payload when playbook matches", () => {
    const seed = minimalProfile();
    const profile = minimalProfile({
      site_context: { ...seed.site_context, vertical: "b2b_saas", scan: { ...seed.site_context.scan, primary_ctas: [] } },
      engagement_score: 55,
      persona: "implementation_evaluator",
      signals: {
        ...seed.signals,
        return_visit: true,
        cta_clicks: 0,
        max_scroll_depth: 70,
        pages_viewed: 2,
      },
      concept_affinity: { "Quarterly planning": 0.3 },
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
    const merged = { ...profile, activation_opportunity: ao };
    merged.personalization_signal = buildPersonalizationSignal(merged);
    const payload = buildActivationPayload(merged);
    expect(payload.si.playbook_match).toEqual(ao.playbook);
  });

  it("does not match cold homepage (no momentum, no depth) even with strong concepts", () => {
    const seed = minimalProfile();
    const profile = minimalProfile({
      site_context: {
        ...seed.site_context,
        vertical: "b2b_saas",
        scan: { ...seed.site_context.scan, primary_ctas: [] },
      },
      engagement_score: 48,
      signals: {
        ...seed.signals,
        return_visit: false,
        cta_clicks: 0,
        max_scroll_depth: 18,
        pages_viewed: 1,
      },
      concept_affinity: {
        "Implementation readiness": 0.4,
        "Team operating rhythm": 0.35,
      },
      concept_evidence: {},
    });
    const env = {
      ...emptySiteEnvironmentSnapshot(),
      page: { ...emptySiteEnvironmentSnapshot().page, generic_kind: "homepage" as const, confidence: 0.65 },
      conversion: { ...emptySiteEnvironmentSnapshot().conversion, confidence: 0.5 },
    };
    const ao = inferActivationOpportunity({
      profile,
      env,
      scan: profile.site_context.scan,
      semantics: emptyPageSemantics(),
    });
    expect(ao.playbook).toBeNull();
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
