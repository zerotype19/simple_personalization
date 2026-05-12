import { describe, expect, it } from "vitest";
import { Batcher } from "../batcher";
import { DEFAULT_CONFIG } from "../defaults";
import { chooseRecommendation } from "../recommender";
import { runRules } from "../rules";
import { createBlankSignals } from "../session";
import { selectTreatments } from "../personalization";
import { recomputeScores } from "../scorer";
import { minimalProfile, treatmentAssignment } from "../test/fixtures";

describe("Batcher payload ↔ live profile (dashboard + inspector)", () => {
  it("summary mirrors intent, affinity, and journey_stage exactly", () => {
    const profile = minimalProfile({
      experiment_assignment: treatmentAssignment(),
      signals: {
        ...createBlankSignals(),
        pages_viewed: 4,
        vdp_views: 2,
        pricing_views: 2,
        finance_interactions: 2,
        cta_clicks: 3,
        category_hits: { suv: 12, sedan: 4 },
      },
    });
    recomputeScores(profile);

    const batcher = new Batcher({
      endpoint: "https://worker.example/collect",
      getProfile: () => profile,
      isConverted: () => false,
      conversionType: () => null,
    });
    const payload = batcher.buildPayload();

    expect(payload.summary.intent_score).toBe(profile.intent_score);
    expect(payload.summary.urgency_score).toBe(profile.urgency_score);
    expect(payload.summary.engagement_score).toBe(profile.engagement_score);
    expect(payload.summary.journey_stage).toBe(profile.journey_stage);
    expect(payload.summary.pages).toBe(profile.signals.pages_viewed);
    expect(payload.summary.category_affinity).toEqual(profile.category_affinity);
    expect(payload.experiment_assignment).toEqual(profile.experiment_assignment);
  });
});

describe("Happy-path click sequence (math-linked recommendations)", () => {
  it("finance engagement surfaces payment-sensitive recommendation before sedan affinity", () => {
    const p = minimalProfile({
      experiment_assignment: treatmentAssignment(),
      signals: {
        ...createBlankSignals(),
        pages_viewed: 3,
        vdp_views: 1,
        finance_interactions: 2,
        cta_clicks: 2,
        category_hits: { sedan: 20, suv: 2 },
      },
    });
    recomputeScores(p);
    const { matches } = runRules(DEFAULT_CONFIG.rules, p);
    const rec = chooseRecommendation(
      p,
      matches.map((m) => m.recommendation),
    );
    expect(rec?.treatment_hint).toBe("payment_sensitive");
  });

  it("strong sedan affinity yields sedan fallback when finance rules quiet", () => {
    const p = minimalProfile({
      experiment_assignment: treatmentAssignment(),
      signals: {
        ...createBlankSignals(),
        pages_viewed: 2,
        vdp_views: 1,
        finance_interactions: 0,
        pricing_views: 0,
        cta_clicks: 1,
        category_hits: { sedan: 40, suv: 1 },
      },
    });
    recomputeScores(p);
    expect(p.category_affinity.sedan ?? 0).toBeGreaterThanOrEqual(0.36);

    const { matches } = runRules(DEFAULT_CONFIG.rules, p);
    const rec = chooseRecommendation(
      p,
      matches.map((m) => m.recommendation),
    );
    expect(rec?.treatment_hint).toBe("researcher");
    expect(rec?.next_best_action.toLowerCase()).toContain("sedan");
  });

  it("treatment arm stacks experiment + payment rule treatments when both qualify", () => {
    const p = minimalProfile({
      experiment_assignment: treatmentAssignment(),
      page_type: "home",
      signals: {
        ...createBlankSignals(),
        pages_viewed: 3,
        vdp_views: 1,
        finance_interactions: 2,
        pricing_views: 2,
        cta_clicks: 4,
        category_hits: {},
      },
    });
    recomputeScores(p);
    const picks = selectTreatments(DEFAULT_CONFIG.treatments, p);
    const ids = picks.map((x) => x.id);
    expect(ids).toContain("t_high_intent");
    expect(ids).toContain("t_payment_sensitive");
  });
});
