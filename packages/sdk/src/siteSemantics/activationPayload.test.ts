import { describe, expect, it } from "vitest";
import { createBlankSignals } from "../session";
import { buildActivationPayload, buildPersonalizationSignal } from "./activationPayload";
import { buildBehaviorSnapshot } from "./behaviorSnapshot";
import { inferActivationOpportunity } from "./conversionArchitecture";
import { emptyPageSemantics } from "./defaults";
import { emptySiteEnvironmentSnapshot } from "../siteEnvironment/emptySnapshot";
import { minimalProfile } from "../test/fixtures";

describe("buildActivationPayload behavior.timeline_preview", () => {
  it("includes at most 5 clock-prefixed lines and activation_debug context", () => {
    const started = Date.now() - 120_000;
    const p = minimalProfile({
      started_at: started,
      intel_timeline: [
        { t: started + 1000, message: "A" },
        { t: started + 2000, message: "B" },
        { t: started + 3000, message: "C" },
        { t: started + 4000, message: "D" },
        { t: started + 5000, message: "E" },
        { t: started + 6000, message: "F" },
        { t: started + 7000, message: "G" },
      ],
    });
    buildBehaviorSnapshot(p);
    const payload = buildActivationPayload(p);
    const behavior = payload.si.behavior as Record<string, unknown>;
    expect(behavior.context).toBe("activation_debug_preview");
    const preview = behavior.timeline_preview as string[];
    expect(preview.length).toBe(5);
    expect(preview[0]).toMatch(/^\d{2}:\d{2} C$/);
    expect(preview[4]).toMatch(/^\d{2}:\d{2} G$/);
  });

  it("collapses http URLs in timeline lines to path-only", () => {
    const started = Date.now() - 5000;
    const p = minimalProfile({
      started_at: started,
      intel_timeline: [{ t: started + 1000, message: "Visit https://evil.example/foo?x=1 done" }],
    });
    buildBehaviorSnapshot(p);
    const payload = buildActivationPayload(p);
    const behavior = payload.si.behavior as Record<string, unknown>;
    const preview = behavior.timeline_preview as string[];
    expect(preview[0]).toContain("/foo?x=1");
    expect(preview[0]).not.toContain("https://");
  });
});

describe("buildActivationPayload page.kind normalization", () => {
  it("coerces classifier unknown to article_page with display_kind when path hints exist", () => {
    const seed = minimalProfile();
    const env = {
      ...emptySiteEnvironmentSnapshot(),
      page: {
        ...emptySiteEnvironmentSnapshot().page,
        generic_kind: "unknown" as const,
        confidence: 0.42,
        signals_used: ["insufficient page-specific cues"],
      },
    };
    const profile = minimalProfile({
      site_context: { ...seed.site_context, vertical: "b2b_saas" },
      site_environment: env,
      signals: {
        ...createBlankSignals(),
        path_sequence: ["/", "/dive-into-rhythm90/manifesto"],
      },
      page_journey: [
        { path: "/", generic_kind: "homepage", title_snippet: null, t: 1 },
        { path: "/dive-into-rhythm90/manifesto", generic_kind: "unknown", title_snippet: null, t: 2 },
      ],
    });
    const ao = inferActivationOpportunity({
      profile,
      env,
      scan: profile.site_context.scan,
      semantics: emptyPageSemantics(),
    });
    const full = { ...profile, activation_opportunity: ao };
    full.personalization_signal = buildPersonalizationSignal(full);
    const payload = buildActivationPayload(full);
    const page = payload.si.page as Record<string, unknown>;
    expect(page.kind).toBe("article_page");
    expect(page.classifier_kind).toBe("unknown");
    expect(String(page.display_kind)).toMatch(/manifesto|Guide/i);
  });
});
