import type { BehaviorSnapshot, CommercialIntentMemory, SessionProfile } from "@si/shared";
import { describe, expect, it } from "vitest";
import { buildCommercialIntentJourney } from "../commercialIntent/testUtils/buildCommercialIntentJourney";
import { emptyCommercialIntentMemory } from "../commercialIntent/updateCommercialIntentMemory";
import { isBuyerUnsafeString } from "./buyerCopySafety";
import {
  COMMERCIAL_INTENT_MAX_NEGATIVE_DELTA,
  COMMERCIAL_INTENT_MAX_POSITIVE_DELTA,
  buildCommercialIntentDecisionReasons,
  rankCandidatesWithCommercialIntent,
  scoreRecipeWithCommercialIntent,
  shouldSuppressForCommercialIntent,
} from "./commercialIntentDecisionCoupling";
import { runExperienceDecisionPipeline } from "./experienceDecisionPipeline";
import { matchRecipeCandidates } from "./recipeMatcher";
import { getExperienceRecipesForVertical, getSurfaceCatalogForVertical } from "@si/shared/experiencePacks";
import { emptyActivationOpportunity } from "../siteSemantics/defaults";
import minBehaviorPreset from "./fixtures/presets/min-behavior.json";

const MIN_BEHAVIOR = minBehaviorPreset as unknown as BehaviorSnapshot;

function runPrimary(profile: SessionProfile, now = 1_700_000_000_000): string | null {
  const { envelope } = runExperienceDecisionPipeline(profile, { now }, false);
  return envelope.primary_decision?.surface_id ?? null;
}

function enrichForRecipes(
  profile: SessionProfile,
  opts: {
    engagement?: number;
    readiness?: number;
    concepts?: Record<string, number>;
    phase?: SessionProfile["commercial_journey_phase"];
    ctaClicks?: number;
  },
): SessionProfile {
  profile.engagement_score = opts.engagement ?? 52;
  profile.commercial_journey_phase = opts.phase ?? "comparison";
  profile.concept_affinity = { ...profile.concept_affinity, ...(opts.concepts ?? {}) };
  profile.signals.cta_clicks = opts.ctaClicks ?? 1;
  const readiness = opts.readiness ?? 52;
  profile.behavior_snapshot = {
    ...structuredClone(MIN_BEHAVIOR),
    activation_readiness: {
      score_0_100: readiness,
      interruption_posture: readiness >= 58 ? "soft_cta_ready" : "observe_only",
      rationale: [],
    },
    commercial_journey_phase: opts.phase ?? "comparison",
    engagement_quality: { label: "deep_reader", rationale: [] },
  };
  profile.activation_opportunity = {
    ...emptyActivationOpportunity(),
    status: "ready",
    confidence: 0.78,
    reason: ["session engagement supports a guided next step"],
    evidence: ["multi-page exploration"],
  };
  profile.personalization_signal = {
    ...profile.personalization_signal,
    activation_readiness_score: readiness,
    conversion_readiness: readiness,
  };
  return profile;
}

function memoryWith(overrides: Partial<CommercialIntentMemory>): CommercialIntentMemory {
  return { ...emptyCommercialIntentMemory(), ...overrides };
}

describe("commercialIntentDecisionCoupling", () => {
  it("keeps score deltas within bounds and applies no boost when commercial_intent is absent", () => {
    const profile = enrichForRecipes(
      buildCommercialIntentJourney("auto_retail", [{ text: "Compare", path: "/compare" }]).profile,
      { concepts: { compare: 0.8 } },
    );
    delete profile.commercial_intent;

    const vertical = profile.site_context.vertical;
    const recipes = getExperienceRecipesForVertical(vertical);
    const catalog = getSurfaceCatalogForVertical(vertical);
    const candidates = matchRecipeCandidates(profile, recipes, catalog, vertical).slice(0, 5);

    const before = candidates.map((c) => c.match_confidence);
    const ranked = rankCandidatesWithCommercialIntent(candidates, profile);
    expect(ranked.map((c) => c.match_confidence)).toEqual(before);
    expect(ranked.every((c) => c.commercial_intent_delta === 0)).toBe(true);
  });

  it("bounded positive and negative deltas when commercial_intent is present", () => {
    const profile = enrichForRecipes(
      buildCommercialIntentJourney("auto_retail", [
        { text: "Compare", path: "/compare" },
        { text: "See payments", path: "/finance", dataSiCta: "finance" },
      ]).profile,
      { concepts: { monthly_payment: 0.82, compare: 0.75 } },
    );
    const vertical = profile.site_context.vertical;
    const recipes = getExperienceRecipesForVertical(vertical);
    const catalog = getSurfaceCatalogForVertical(vertical);
    const candidates = matchRecipeCandidates(profile, recipes, catalog, vertical);

    for (const c of candidates) {
      const scored = scoreRecipeWithCommercialIntent(c, profile);
      expect(scored.delta).toBeGreaterThanOrEqual(COMMERCIAL_INTENT_MAX_NEGATIVE_DELTA);
      expect(scored.delta).toBeLessThanOrEqual(COMMERCIAL_INTENT_MAX_POSITIVE_DELTA);
    }
  });

  it("commercial suppression does not bypass hard decisionSuppression floors", () => {
    const profile = enrichForRecipes(
      buildCommercialIntentJourney("auto_retail", [
        { text: "Book test drive", path: "/test-drive", dataSiIntent: "schedule_test_drive" },
      ]).profile,
      { readiness: 80, concepts: { test_drive: 0.85 } },
    );
    profile.commercial_intent = memoryWith({
      strongest_action_family: "schedule_test_drive",
      momentum: { direction: "increasing", confidence: 0.8, evidence: [], stage_sequence: [] },
      human_escalation_interactions: 2,
    });

    const { envelope } = runExperienceDecisionPipeline(profile, { now: Date.now() }, false);
    const primary = envelope.primary_decision;
    expect(primary).toBeTruthy();
    if (primary && primary.confidence < 0.45) {
      expect(primary.action).not.toBe("show");
    }
  });

  it("buyer decision reasons are safe copy", () => {
    const profile = enrichForRecipes(
      buildCommercialIntentJourney("auto_retail", [
        { text: "Compare", path: "/compare" },
        { text: "Estimate payment", path: "/finance", dataSiCta: "finance" },
      ]).profile,
      { concepts: { monthly_payment: 0.8 } },
    );
    const reasons = buildCommercialIntentDecisionReasons(profile, {
      surface_id: "finance_payment_assist",
      message_angle: "payment_clarity",
      offer_type: "payment_estimate_walkthrough",
    } as never);
    expect(reasons.length).toBeGreaterThan(0);
    for (const r of reasons) {
      expect(isBuyerUnsafeString(r)).toBe(false);
      expect(r).not.toMatch(/financing_or_payment|schedule_test_drive|pricing_uncertainty/i);
    }
  });

  it("auto retail: compare → finance → test drive favors payment/test-drive over generic inventory", () => {
    const journey = buildCommercialIntentJourney("auto_retail", [
      { text: "Compare vehicles", path: "/compare" },
      { text: "See payments for picks", path: "/finance", dataSiCta: "finance" },
      { text: "Book a test drive", path: "/test-drive", dataSiIntent: "schedule_test_drive" },
    ]);
    const profile = enrichForRecipes(journey.profile, {
      engagement: 54,
      readiness: 58,
      concepts: {
        "Book a test drive online this model": 0.82,
        monthly_payment: 0.78,
        compare: 0.76,
      },
      phase: "evaluation",
    });

    const primary = runPrimary(profile);
    expect(primary).toBeTruthy();
    expect(["finance_payment_assist", "test_drive_secondary_cta"]).toContain(primary);
    expect(primary).not.toBe("inventory_assist_module");
  });

  it("auto retail: finance blocker prevents dealer contact from winning too early", () => {
    const journey = buildCommercialIntentJourney("auto_retail", [
      { text: "Compare vehicles", path: "/compare" },
      { text: "Estimate payment", path: "/finance", dataSiCta: "finance" },
    ]);
    const profile = enrichForRecipes(journey.profile, {
      engagement: 50,
      readiness: 48,
      concepts: {
        monthly_payment: 0.8,
        call_dealer: 0.7,
        contact_dealer: 0.68,
      },
      phase: "comparison",
    });

    const primary = runPrimary(profile);
    expect(primary).not.toBe("dealer_contact_assist");
    if (primary) {
      expect(["finance_payment_assist", "trade_in_soft_prompt", "inventory_assist_module"]).toContain(primary);
    }
  });

  it("auto retail: human-contact action + high readiness can surface test-drive", () => {
    const journey = buildCommercialIntentJourney("auto_retail", [
      { text: "Compare", path: "/compare" },
      { text: "Finance", path: "/finance", dataSiCta: "finance" },
      { text: "Book test drive", path: "/test-drive", dataSiIntent: "schedule_test_drive" },
    ]);
    const profile = enrichForRecipes(journey.profile, {
      engagement: 56,
      readiness: 62,
      concepts: { test_drive: 0.85, drive_appointment: 0.8, monthly_payment: 0.75 },
      phase: "evaluation",
    });

    const primary = runPrimary(profile);
    expect(["test_drive_secondary_cta", "finance_payment_assist"]).toContain(primary);
  });

  it("B2B: integration/security/pricing favors implementation/trust before demo at medium readiness", () => {
    const journey = buildCommercialIntentJourney("b2b_saas", [
      { text: "View integrations", path: "/integrations" },
      { text: "Security", path: "/security" },
      { text: "Pricing", path: "/pricing" },
    ]);
    const profile = enrichForRecipes(journey.profile, {
      engagement: 58,
      readiness: 52,
      concepts: {
        implementation_readiness: 0.8,
        integration_and_api_scope: 0.78,
        security: 0.75,
      },
      phase: "evaluation",
    });

    const primary = runPrimary(profile);
    expect(primary).toBeTruthy();
    expect([
      "implementation_readiness_checklist",
      "implementation_readiness_inline",
      "integration_requirements_summary",
      "security_and_implementation_faq",
      "rollout_complexity_estimator",
      "implementation_timeline_example",
      "pricing_page_secondary_cta",
      "soft_roi_framework",
    ]).toContain(primary);
    expect(primary).not.toBe("guided_walkthrough_request");
  });

  it("B2B: schedule demo + high readiness may allow walkthrough", () => {
    const journey = buildCommercialIntentJourney("b2b_saas", [
      { text: "Integrations", path: "/integrations" },
      { text: "Security", path: "/security" },
      { text: "Schedule a demo", path: "/demo" },
    ]);
    const profile = enrichForRecipes(journey.profile, {
      engagement: 82,
      readiness: 62,
      concepts: {
        implementation_readiness: 0.85,
        team_operating_rhythm: 0.8,
      },
      phase: "evaluation",
    });

    const primary = runPrimary(profile);
    expect([
      "guided_walkthrough_request",
      "implementation_workshop_offer",
      "implementation_readiness_checklist",
      "rollout_complexity_estimator",
    ]).toContain(primary);
  });

  it("B2B: schedule demo + medium readiness stays on checklist/reassurance", () => {
    const journey = buildCommercialIntentJourney("b2b_saas", [
      { text: "Pricing", path: "/pricing" },
      { text: "Schedule demo", path: "/demo" },
    ]);
    const profile = enrichForRecipes(journey.profile, {
      engagement: 54,
      readiness: 50,
      concepts: { implementation_readiness: 0.76, quarterly_planning: 0.7 },
      phase: "comparison",
    });
    profile.commercial_intent = memoryWith({
      ...journey.memory,
      strongest_action_family: "schedule_demo",
      momentum: { direction: "validating", confidence: 0.7, evidence: [], stage_sequence: [] },
    });

    const primary = runPrimary(profile);
    expect(primary).not.toBe("guided_walkthrough_request");
    if (primary) {
      expect(primary).toMatch(
        /implementation|integration|roi|pricing|comparison|rollout|article_inline|estimator/i,
      );
    }
  });

  it("ecommerce: reviews/shipping after cart favors reassurance over coupon", () => {
    const journey = buildCommercialIntentJourney("ecommerce", [
      { text: "Compare", path: "/compare" },
      { text: "Reviews", path: "/reviews" },
      { text: "Shipping and returns", path: "/shipping" },
      { text: "Add to cart", path: "/cart" },
    ]);
    const profile = enrichForRecipes(journey.profile, {
      engagement: 52,
      readiness: 46,
      concepts: { comparison_shopping: 0.78, product_discovery: 0.7 },
      phase: "evaluation",
    });

    const primary = runPrimary(profile);
    expect(primary).not.toBe("coupon_offer_secondary");
    if (primary) {
      expect(["shipping_returns_reassurance", "cart_assist_inline", "pdp_comparison_module", "product_fit_assistant"]).toContain(
        primary,
      );
    }
  });

  it("ecommerce: coupon action can favor coupon when coupon interest exists", () => {
    const profile = enrichForRecipes(
      buildCommercialIntentJourney("ecommerce", [{ text: "Apply coupon code", path: "/cart" }]).profile,
      {
        engagement: 48,
        readiness: 44,
        concepts: { loyalty_or_coupon: 0.82, promo: 0.75 },
        phase: "evaluation",
      },
    );
    profile.commercial_intent = memoryWith({
      strongest_action_family: "apply_coupon",
      action_counts: { apply_coupon: 2 },
      blockers: [],
      momentum: { direction: "increasing", confidence: 0.7, evidence: [], stage_sequence: [] },
    });

    const primary = runPrimary(profile);
    expect([
      "coupon_offer_secondary",
      "cart_assist_inline",
      "shipping_returns_reassurance",
      "loyalty_or_email_soft_capture",
    ]).toContain(primary);
  });

  it("healthcare: eligibility action favors eligibility guidance", () => {
    const journey = buildCommercialIntentJourney("healthcare", [
      { text: "Check eligibility", path: "/eligibility" },
    ]);
    const profile = enrichForRecipes(journey.profile, {
      engagement: 48,
      readiness: 50,
      concepts: { eligibility: 0.85, coverage: 0.8, benefits: 0.75 },
      phase: "evaluation",
    });

    const primary = runPrimary(profile);
    expect(["eligibility_guidance_module", "coverage_reassurance_inline"]).toContain(primary);
  });

  it("healthcare: appointment action with medium readiness does not force appointment CTA", () => {
    const profile = enrichForRecipes(
      buildCommercialIntentJourney("healthcare", [{ text: "Book appointment", path: "/appointments" }]).profile,
      {
        engagement: 50,
        readiness: 52,
        concepts: { eligibility: 0.7 },
        phase: "evaluation",
      },
    );
    profile.commercial_intent = memoryWith({
      strongest_action_family: "schedule_appointment",
      human_escalation_interactions: 1,
      momentum: { direction: "validating", confidence: 0.65, evidence: [], stage_sequence: [] },
    });

    const primary = runPrimary(profile);
    expect(primary).not.toBe("appointment_soft_prompt");
    const dec = runExperienceDecisionPipeline(profile, { now: Date.now() }, false).envelope
      .primary_decision;
    if (dec) {
      const sup = shouldSuppressForCommercialIntent(dec, profile);
      if (dec.surface_id === "appointment_soft_prompt") {
        expect(sup).toBeTruthy();
      }
    }
  });

  it("finance: calculator/rates favor rate explainer before application", () => {
    const journey = buildCommercialIntentJourney("financial_services", [
      { text: "Compare rates", path: "/rates" },
      { text: "Payment calculator", path: "/calculator" },
    ]);
    const profile = enrichForRecipes(journey.profile, {
      engagement: 52,
      readiness: 50,
      concepts: { rewards: 0.7, apr: 0.78, calculator: 0.8 },
      phase: "comparison",
    });

    const primary = runPrimary(profile);
    expect(["rate_fee_explainer", "rewards_comparison_module", "security_trust_module"]).toContain(primary);
    expect(primary).not.toBe("application_soft_resume");
  });

  it("finance: application action with medium readiness favors document prep not hard apply", () => {
    const journey = buildCommercialIntentJourney("financial_services", [
      { text: "Continue application", path: "/apply" },
    ]);
    const profile = enrichForRecipes(journey.profile, {
      engagement: 58,
      readiness: 58,
      concepts: { application: 0.82, documents: 0.75, resume: 0.7 },
      phase: "evaluation",
    });
    profile.commercial_intent = memoryWith({
      ...journey.memory,
      strongest_action_family: "apply",
      blockers: [
        {
          id: "application_friction",
          confidence: 0.75,
          evidence: ["path:apply"],
          suggested_response_family: "application_assist",
        },
      ],
    });

    const primary = runPrimary(profile);
    expect(primary).not.toBe("application_soft_resume");
    if (primary) {
      expect([
        "document_prep_checklist",
        "rate_fee_explainer",
        "security_trust_module",
        "card_comparison_module",
      ]).toContain(primary);
    }
  });

  it("re-ranking changes candidate order when intent strongly aligns", () => {
    const profile = enrichForRecipes(
      buildCommercialIntentJourney("auto_retail", [
        { text: "Compare", path: "/compare" },
        { text: "Finance", path: "/finance", dataSiCta: "finance" },
      ]).profile,
      { concepts: { monthly_payment: 0.85, inventory: 0.4 } },
    );
    const vertical = profile.site_context.vertical;
    const recipes = getExperienceRecipesForVertical(vertical);
    const catalog = getSurfaceCatalogForVertical(vertical);
    const raw = matchRecipeCandidates(profile, recipes, catalog, vertical);
    const deduped = new Map<string, (typeof raw)[0]>();
    for (const c of raw) {
      const prev = deduped.get(c.recipe.id);
      if (!prev || c.match_confidence > prev.match_confidence) deduped.set(c.recipe.id, c);
    }
    const before = [...deduped.values()].sort((a, b) => b.match_confidence - a.match_confidence);
    const after = rankCandidatesWithCommercialIntent([...deduped.values()], profile);
    const beforeTop = before[0]?.surface_id;
    const afterTop = after[0]?.surface_id;
    expect(after.some((c) => c.commercial_intent_delta !== 0)).toBe(true);
    if (beforeTop === "inventory_assist_module") {
      expect(afterTop).not.toBe("inventory_assist_module");
    }
  });
});
