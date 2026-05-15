import type { ExperienceDecision, ExperienceRecipe } from "@si/shared";
import { describe, expect, it } from "vitest";
import {
  emptyExperienceProgressionMemory,
  progressionGateDecision,
  recordProgressionAfterPrimary,
} from "../progressionMemory";

const mockRecipe = (partial: Partial<ExperienceRecipe>): ExperienceRecipe =>
  ({
    id: "test_recipe",
    label: "t",
    verticals: ["b2b_saas"],
    surfaces: ["s1"],
    decision: {
      message_angle: "a",
      offer_type: "o",
      headline: "h",
      body: "b",
      cta_label: "c",
      timing: "after_scroll",
    },
    ...partial,
  }) as ExperienceRecipe;

const mockDecision = (surface_id: string, surface_type?: string): ExperienceDecision =>
  ({
    surface_id,
    surface_type,
    action: "show",
    confidence: 0.8,
    timing: "after_scroll",
    friction: "low",
    message_angle: "a",
    offer_type: "o",
    headline: "h",
    body: "b",
    cta_label: "c",
    reason: [],
    evidence: [],
  }) as unknown as ExperienceDecision;

describe("progressionMemory", () => {
  it("gates high_intent_escalation when escalation_stage is low", () => {
    const p = emptyExperienceProgressionMemory();
    p.escalation_stage = 1;
    const d = mockDecision("guided_walkthrough_request", "soft_modal");
    const r = mockRecipe({ id: "b2b_governed_walkthrough_earned", decision_family: "high_intent_escalation" });
    expect(progressionGateDecision({ decision: d, recipe: r, progression: p, now: 1_000_000 }).ok).toBe(false);
  });

  it("does not double-record the same primary on the same navigation tick", () => {
    const p = emptyExperienceProgressionMemory();
    p.navigation_tick = 2;
    const d = mockDecision("article_inline_mid");
    const r = mockRecipe({ id: "b2b_implementation_readiness_inline", decision_family: "implementation_guidance" });
    recordProgressionAfterPrimary(p, d, r, 1000);
    expect(p.recent_surfaces_shown).toEqual(["article_inline_mid"]);
    recordProgressionAfterPrimary(p, d, r, 1001);
    expect(p.recent_surfaces_shown).toEqual(["article_inline_mid"]);
  });

  it("records again when navigation_tick advances", () => {
    const p = emptyExperienceProgressionMemory();
    p.navigation_tick = 2;
    const d = mockDecision("article_inline_mid");
    const r = mockRecipe({ decision_family: "implementation_guidance" });
    recordProgressionAfterPrimary(p, d, r, 1000);
    p.navigation_tick = 3;
    recordProgressionAfterPrimary(p, d, r, 2000);
    expect(p.recent_surfaces_shown.filter((s) => s === "article_inline_mid").length).toBe(2);
  });
});
