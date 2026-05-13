import { describe, expect, it } from "vitest";
import { buildObjectiveAwareRecommendation } from "../recommendation/objectiveAwareNba";
import { minimalProfile } from "../test/fixtures";
import { recomputeScores } from "../scorer";

describe("objective-aware NBA", () => {
  it("fills objective, surface, and ladder-aligned treatment level on non-auto profiles", () => {
    const seed = minimalProfile();
    const p = minimalProfile({
      site_context: { ...seed.site_context, vertical: "b2b_saas", vertical_confidence: 78 },
      site_environment: {
        ...seed.site_environment,
        page: {
          generic_kind: "article_page",
          confidence: 0.74,
          signals_used: ["content URL segment"],
        },
        conversion: {
          primary_objective: "lead_capture_or_demo",
          secondary_objective: "content_engagement",
          detected_elements: ["lead_cta"],
          confidence: 0.66,
        },
        ladder: { level: 2, label: "Recommend only", detail: "Medium confidence ladder." },
      },
      signals: { ...seed.signals, cta_clicks: 0, pages_viewed: 4 },
    });
    recomputeScores(p);
    const rec = buildObjectiveAwareRecommendation(p);
    expect(rec.objective).toBeTruthy();
    expect(rec.recommended_surface).toBeTruthy();
    expect(rec.recommended_treatment_level).toBe("recommend_only");
    expect(rec.next_best_action.length).toBeGreaterThan(20);
  });
});
