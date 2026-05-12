import { describe, expect, it } from "vitest";
import type { ExperimentReport, VariantReport } from "@si/shared";
import { aggregateDashboardSummary, mergeExperiment, weightedAvg } from "../analyticsMath";
import { validatePayload } from "../index";

describe("weightedAvg (dashboard / experiment merge)", () => {
  it("matches pooled session-weighted CTR", () => {
    expect(weightedAvg(0.1, 50, 0.2, 10)).toBeCloseTo((0.1 * 50 + 0.2 * 10) / 60, 10);
  });
});

describe("mergeExperiment (live + demo seed)", () => {
  const demo: ExperimentReport = {
    id: "exp_x",
    name: "Test experiment",
    status: "running",
    sessions: 100,
    variants: [
      {
        id: "control",
        name: "Control",
        is_control: true,
        sessions: 50,
        cta_ctr: 0.1,
        conversion_rate: 0.02,
        avg_engagement: 50,
        lift_cta: null,
        lift_conversion: null,
      },
      {
        id: "treatment",
        name: "Treatment",
        is_control: false,
        sessions: 50,
        cta_ctr: 0.2,
        conversion_rate: 0.04,
        avg_engagement: 60,
        lift_cta: null,
        lift_conversion: null,
      },
    ],
  };

  it("pools CTR and recomputes lift vs control", () => {
    const live = new Map<string, VariantReport>([
      [
        "control",
        {
          id: "control",
          name: "control",
          is_control: true,
          sessions: 10,
          cta_ctr: 0.3,
          conversion_rate: 0.05,
          avg_engagement: 55,
          lift_cta: null,
          lift_conversion: null,
        },
      ],
      [
        "treatment",
        {
          id: "treatment",
          name: "treatment",
          is_control: false,
          sessions: 20,
          cta_ctr: 0.4,
          conversion_rate: 0.06,
          avg_engagement: 70,
          lift_cta: null,
          lift_conversion: null,
        },
      ],
    ]);

    const merged = mergeExperiment(demo, live);
    const control = merged.variants.find((v) => v.is_control)!;
    const treatment = merged.variants.find((v) => !v.is_control)!;

    expect(control.sessions).toBe(60);
    expect(control.cta_ctr).toBeCloseTo((0.1 * 50 + 0.3 * 10) / 60, 10);

    const lift = (treatment.cta_ctr - control.cta_ctr) / control.cta_ctr;
    expect(treatment.lift_cta).toBeCloseTo(lift, 10);
    expect(control.lift_cta).toBeNull();
  });
});

describe("aggregateDashboardSummary (SQL parity)", () => {
  it("dedupes sessions and averages per-session intent/engagement like D1 CTE", () => {
    const rows = [
      { session_id: "a", converted: 0, intent_score: 40, engagement_score: 50 },
      { session_id: "a", converted: 1, intent_score: 60, engagement_score: 70 },
      { session_id: "b", converted: 0, intent_score: 20, engagement_score: 30 },
    ];
    const s = aggregateDashboardSummary(rows);
    expect(s.sessions_ingested).toBe(2);
    expect(s.conversions).toBe(1);
    expect(s.avg_intent).toBeCloseTo((50 + 20) / 2, 10);
    expect(s.avg_engagement).toBeCloseTo((60 + 30) / 2, 10);
  });
});

describe("validatePayload", () => {
  it("accepts a minimal valid collect body", () => {
    const payload = {
      session_id: "abcdef-123",
      origin: "https://example.com",
      started_at: 1,
      ended_at: 2,
      summary: {
        pages: 1,
        vdp_views: 0,
        pricing_views: 0,
        finance_interactions: 0,
        compare_interactions: 0,
        cta_clicks: 0,
        max_scroll_depth: 0,
        intent_score: 10,
        urgency_score: 10,
        engagement_score: 10,
        journey_stage: "discovery",
        category_affinity: { suv: 0.2 },
      },
      experiment_assignment: null,
      active_treatments: [],
      converted: false,
      conversion_type: null,
    };
    expect(validatePayload(payload)).toBeNull();
  });

  it("rejects affinity out of range", () => {
    const payload = {
      session_id: "abcdef-123",
      origin: "https://example.com",
      started_at: 1,
      ended_at: 2,
      summary: {
        pages: 1,
        vdp_views: 0,
        pricing_views: 0,
        finance_interactions: 0,
        compare_interactions: 0,
        cta_clicks: 0,
        max_scroll_depth: 0,
        intent_score: 10,
        urgency_score: 10,
        engagement_score: 10,
        journey_stage: "discovery",
        category_affinity: { suv: 2 },
      },
      experiment_assignment: null,
      active_treatments: [],
      converted: false,
      conversion_type: null,
    };
    expect(validatePayload(payload)).toBe("invalid_summary_affinity_value");
  });
});
