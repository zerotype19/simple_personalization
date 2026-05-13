import { describe, expect, it } from "vitest";
import { createBlankSignals } from "../session";
import { computeClampedScores, mergeAffinityFromHits, recomputeScores } from "../scorer";
import { minimalProfile } from "../test/fixtures";

describe("computeClampedScores", () => {
  it("matches hand-calculated intent for a mid-funnel session", () => {
    const s = createBlankSignals();
    s.pages_viewed = 3;
    s.vdp_views = 2;
    s.pricing_views = 1;
    s.finance_interactions = 1;
    s.compare_interactions = 0;
    s.cta_clicks = 4;
    s.return_visit = false;
    s.session_duration_ms = 120_000;
    s.max_scroll_depth = 50;

    const rawIntent =
      2 * 14 + 1 * 12 + 1 * 11 + 0 * 9 + 4 * 6 + 0 + Math.min(3, 8) * 2;
    expect(rawIntent).toBe(28 + 12 + 11 + 24 + 6);

    const scores = computeClampedScores(s, "auto_retail");
    expect(scores.intent_score).toBe(Math.min(100, Math.max(0, Math.round(rawIntent))));
    expect(scores.intent_score).toBe(81);
  });

  it("clamps intent at 100 for very heavy engagement", () => {
    const s = createBlankSignals();
    s.pages_viewed = 8;
    s.vdp_views = 10;
    s.pricing_views = 10;
    s.finance_interactions = 10;
    s.compare_interactions = 10;
    s.cta_clicks = 20;
    s.return_visit = true;
    const scores = computeClampedScores(s, "auto_retail");
    expect(scores.intent_score).toBe(100);
  });
});

describe("mergeAffinityFromHits", () => {
  it("applies EMA toward session share (first hit)", () => {
    const prev = {};
    const hits = { suv: 10, sedan: 10 };
    const next = mergeAffinityFromHits(prev, hits);
    expect(next.suv).toBeCloseTo(0.2, 5);
    expect(next.sedan).toBeCloseTo(0.2, 5);
  });
});

describe("recomputeScores + inspector fields", () => {
  it("keeps profile.intent_score aligned with computeClampedScores(signals)", () => {
    const p = minimalProfile({
      signals: {
        ...createBlankSignals(),
        pages_viewed: 2,
        vdp_views: 1,
        cta_clicks: 2,
        category_hits: { suv: 5 },
      },
    });
    recomputeScores(p);
    const again = computeClampedScores(p.signals, p.site_context.vertical);
    expect(p.intent_score).toBe(again.intent_score);
    expect(p.urgency_score).toBe(again.urgency_score);
    expect(p.engagement_score).toBe(again.engagement_score);
  });
});
