import { describe, expect, it } from "vitest";
import { chooseRecommendation } from "../recommender";
import { DEFAULT_CONFIG } from "../defaults";
import { runRules } from "../rules";
import { createBlankSignals } from "../session";
import { recomputeScores } from "../scorer";
import { minimalProfile } from "../test/fixtures";

describe("Panel ↔ runtime ↔ collect summary (QA parity)", () => {
  it("rule match sets persona and surfaces rule recommendation confidence", () => {
    const p = minimalProfile({
      signals: {
        ...createBlankSignals(),
        pages_viewed: 2,
        finance_interactions: 1,
      },
    });
    recomputeScores(p);
    const { profile, matches } = runRules(DEFAULT_CONFIG.rules, p);
    expect(matches.some((m) => m.rule.id === "r_payment_sensitive")).toBe(true);
    expect(profile.persona).toBe("payment_sensitive");
    const pay = matches.find((m) => m.rule.id === "r_payment_sensitive")!;
    expect(pay.recommendation?.confidence).toBe(0.74);
    const rec = chooseRecommendation(
      profile,
      matches.map((m) => m.recommendation),
    );
    expect(rec?.confidence).toBe(0.74);
    expect(rec?.treatment_hint).toBe("payment_sensitive");
  });

  it("category affinity in profile matches EMA from category_hits (inspector + collect payload)", () => {
    const p = minimalProfile({
      signals: {
        ...createBlankSignals(),
        pages_viewed: 1,
        category_hits: { suv: 10, sedan: 5 },
      },
    });
    recomputeScores(p);
    expect(Object.keys(p.category_affinity).sort()).toEqual(["sedan", "suv"]);
    expect(p.category_affinity.suv).toBeGreaterThan(p.category_affinity.sedan!);
  });
});
