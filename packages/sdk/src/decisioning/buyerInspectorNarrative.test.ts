import type { ExperienceDecisionEnvelope, ExperienceProgressionMemory, SessionProfile } from "@si/shared";
import { describe, expect, it } from "vitest";
import { buildSessionProgressionNarrative } from "./experienceInspectorNarrative";
import {
  buildBuyerInspectorView,
  buyerInspectorNarrativeCredibilityIssue,
  joinBuyerInspectorNarrativeForTests,
} from "./buyerInspectorNarrative";
import { isBuyerUnsafeString } from "./buyerCopySafety";
import type { ReplayResult } from "./replay/types";
import { minimalProfile } from "../test/fixtures";

function behaviorSnapshot(
  overrides: Partial<NonNullable<SessionProfile["behavior_snapshot"]>> = {},
): NonNullable<SessionProfile["behavior_snapshot"]> {
  const traffic = {
    channel_guess: "organic_search" as const,
    landing_path: "/pricing",
    utm_source: null as string | null,
    utm_medium: null as string | null,
    utm_campaign: null as string | null,
    utm_term: null as string | null,
    utm_content: null as string | null,
    has_click_id: false,
    arrival_confidence_0_100: 55,
    acquisition_evidence: [] as string[],
    acquisition_narrative: "Organic search landing",
    acquisition_interpretation: null as string | null,
    entry_page_kind: "article_page" as const,
    landing_pattern_summary: null as string | null,
    query_themes: [] as string[],
  };
  return {
    traffic,
    referral_model: {
      arrival_channel: "organic_search" as const,
      arrival_subchannel: "",
      arrival_type: "",
      campaign_detected: false,
      campaign_confidence_0_1: 0,
      acquisition_strategy: "",
      acquisition_themes: [] as string[],
      acquisition_posture: null,
      creative_interpretation: null,
      commerce_mindset: [] as string[],
      personalization_hint: null,
      acquisition_stage: "research" as const,
      evidence: [] as string[],
      confidence_0_1: 0.5,
    },
    campaign_intent: {
      keyword_themes: [] as string[],
      campaign_angle: null,
      commercial_clues: [] as string[],
      confidence_0_100: 50,
    },
    referrer: { category: "unknown" as const, host: null, narrative: "", channel_hint: null },
    navigation: {
      journey_pattern: "hub_spoke",
      journey_velocity: "deliberate" as const,
      comparison_behavior: true,
      high_intent_transition: false,
      path_summary: "Pricing then article",
    },
    engagement_quality: {
      label: "deep_reader" as const,
      rationale: ["Sustained scroll depth on long-form content pages."],
    },
    activation_readiness: {
      score_0_100: 48,
      interruption_posture: "soft_cta_ready" as const,
      rationale: ["Visitor is exploring, not racing to a form."],
    },
    commercial_journey_phase: "comparison" as const,
    anonymous_similarity_hint: null,
    device_context: {
      coarse_device: "desktop" as const,
      weekday: true,
      hour_local: 10,
      viewport_bucket: "wide" as const,
    },
    ...overrides,
  } as NonNullable<SessionProfile["behavior_snapshot"]>;
}

function envWithPrimary(
  primary: NonNullable<ExperienceDecisionEnvelope["primary_decision"]>,
): ExperienceDecisionEnvelope {
  return {
    event: "si_experience_decision",
    generated_at: Date.now(),
    session_id: "sess-1",
    primary_decision: primary,
    secondary_decisions: [],
    suppression_summary: undefined,
    progression_notes: ["Pacing kept repetition in check for this session."],
  };
}

function envSuppressed(summary: string): ExperienceDecisionEnvelope {
  return {
    event: "si_experience_decision",
    generated_at: Date.now(),
    session_id: "sess-1",
    primary_decision: null,
    secondary_decisions: [],
    suppression_summary: summary,
  };
}

describe("buyerInspectorNarrative", () => {
  it("surfaces withheld escalation when there is no primary", () => {
    const p = minimalProfile({
      behavior_snapshot: behaviorSnapshot({
        activation_readiness: {
          score_0_100: 80,
          interruption_posture: "avoid_interrupt",
          rationale: ["Visitor is exploring, not racing to a form."],
        },
      }),
    });
    const v = buildBuyerInspectorView(p, envSuppressed("Readiness still building for a demo ask."), null);
    expect(v.withheld.length).toBeGreaterThan(0);
    expect(v.withheld.some((w) => /background|exploratory|pacing|restraint|prompts/i.test(w))).toBe(true);
    expect(v.recommended.show).toBe("Restraint recommended");
    expect(v.recommended.restraintBody).toContain("Engagement is high");
    expect(v.recommended.escalationPosture).toBe("Suppression preferred");
  });

  it("does not leak raw percentages into buyer-facing strings", () => {
    const p = minimalProfile({
      behavior_snapshot: behaviorSnapshot(),
    });
    const v = buildBuyerInspectorView(p, envSuppressed("No numeric leaks here."), null);
    const blob = [
      v.commercialRead,
      v.recommended.show,
      v.recommended.surface,
      v.recommended.timing,
      v.recommended.escalationPosture,
      v.recommended.restraintBody ?? "",
      ...v.whyBullets,
      ...v.withheld,
      v.statePresentation.whyThisState,
      v.statePresentation.whatWouldMoveForward,
      v.statePresentation.currentStateLabel,
      v.statePresentation.escalationPosture,
    ].join(" ");
    expect(blob.includes("%")).toBe(false);
  });

  it("maps progression ladder index into range", () => {
    const p = minimalProfile({
      behavior_snapshot: behaviorSnapshot({ commercial_journey_phase: "validation" }),
    });
    const v = buildBuyerInspectorView(p, envSuppressed("x"), null);
    expect(v.progression.currentIndex).toBeGreaterThanOrEqual(0);
    expect(v.progression.currentIndex).toBeLessThan(v.progression.steps.length);
  });

  it("filters technical reason lines with score jargon from bullets", () => {
    const primary = {
      id: "d1",
      surface_id: "article_inline_mid",
      action: "show" as const,
      message_angle: "implementation",
      offer_type: "checklist",
      headline: "Implementation readiness checklist",
      body: "Body",
      cta_label: "Get",
      target_url_hint: "/",
      timing: "after_scroll" as const,
      friction: "low" as const,
      priority: 1,
      confidence: 0.62,
      reason: ["readiness_score crossed 61", "Sustained attention on how-to content."],
      evidence: [],
      ttl_seconds: 300,
      expires_at: Date.now() + 300_000,
      privacy_scope: "session_only" as const,
      visitor_status: "anonymous" as const,
    };
    const bs0 = behaviorSnapshot();
    const p = minimalProfile({
      behavior_snapshot: {
        ...bs0,
        navigation: { ...bs0.navigation, comparison_behavior: false },
      },
    });
    const v = buildBuyerInspectorView(p, envWithPrimary(primary), null);
    expect(v.whyBullets.some((b) => /readiness_score/i.test(b))).toBe(false);
    expect(v.whyBullets.some((b) => /attention/i.test(b))).toBe(true);
  });

  it("summarizes replay transition without LLM", () => {
    const p = minimalProfile({ behavior_snapshot: behaviorSnapshot() });
    const replay: ReplayResult = {
      frames: [],
      transitions: [
        {
          from_index: 0,
          to_index: 1,
          reasons: ["commercial_phase_advanced"],
          primary_surface_from: "a",
          primary_surface_to: "b",
          suppression_delta: "unchanged",
          timing_from: null,
          timing_to: null,
        },
      ],
      progression_summary: "",
      suppression_summary: "",
      timing_summary: "",
    };
    const v = buildBuyerInspectorView(p, envSuppressed("x"), replay);
    expect(v.whatChanged).toBeTruthy();
    expect(v.whatChanged!.toLowerCase()).toContain("shift detected");
  });

  it("uses human experience labels instead of title-cased surface ids", () => {
    const primary = {
      id: "d_fin",
      surface_id: "finance_payment_assist",
      action: "show" as const,
      message_angle: "payment",
      offer_type: "payment_estimate",
      headline: "Estimate payment before you visit",
      body: "Body",
      cta_label: "Estimate",
      target_url_hint: "/finance",
      timing: "next_navigation" as const,
      friction: "low" as const,
      priority: 1,
      confidence: 0.7,
      reason: [],
      evidence: [],
      ttl_seconds: 300,
      expires_at: Date.now() + 300_000,
      privacy_scope: "session_only" as const,
      visitor_status: "anonymous" as const,
    };
    const v = buildBuyerInspectorView(minimalProfile(), envWithPrimary(primary), null);
    expect(v.recommended.surface).toBe("Payment reassurance");
    expect(v.recommended.surface).not.toMatch(/Finance Payment Assist|finance_payment_assist/i);
  });

  it("buyer join text avoids forbidden operator vocabulary", () => {
    const p = minimalProfile({
      behavior_snapshot: behaviorSnapshot({
        activation_readiness: {
          score_0_100: 82,
          interruption_posture: "avoid_interrupt",
          rationale: [],
        },
      }),
    });
    const v = buildBuyerInspectorView(p, envSuppressed("Thin signals for now."), null);
    const blob = joinBuyerInspectorNarrativeForTests(v);
    expect(isBuyerUnsafeString(blob)).toBe(false);
    expect(buyerInspectorNarrativeCredibilityIssue(v)).toBeNull();
  });

  it("high engagement with null primary explains restraint without contradictions", () => {
    const p = minimalProfile({
      engagement_score: 88,
      behavior_snapshot: behaviorSnapshot({
        activation_readiness: {
          score_0_100: 87,
          interruption_posture: "avoid_interrupt",
          rationale: [],
        },
      }),
    });
    const v = buildBuyerInspectorView(
      p,
      envSuppressed("No strong experience decision for this session state (restraint)."),
      null,
    );
    expect(v.commercialRead.toLowerCase()).toMatch(/withheld|research-heavy|decisive commercial/i);
    expect(v.recommended.restraintBody?.toLowerCase()).toContain("engagement");
    const blob = joinBuyerInspectorNarrativeForTests(v);
    expect((blob.match(/No strong experience decision yet/gi) ?? []).length).toBe(0);
  });

  it("withheld excludes progression engine debug notes for buyers", () => {
    const p = minimalProfile({
      behavior_snapshot: behaviorSnapshot({
        activation_readiness: {
          score_0_100: 70,
          interruption_posture: "soft_cta_ready",
          rationale: [],
        },
      }),
    });
    const env: ExperienceDecisionEnvelope = {
      event: "si_experience_decision",
      generated_at: Date.now(),
      session_id: "sess-1",
      primary_decision: null,
      secondary_decisions: [],
      progression_notes: [
        "Progression held implementation_readiness_checklist (progression_surface_cooldown)",
      ],
    };
    const v = buildBuyerInspectorView(p, env, null);
    expect(
      v.withheld.some((w) =>
        /progression_surface_cooldown|implementation_readiness_checklist|Progression held/i.test(w),
      ),
    ).toBe(false);
    const blob = joinBuyerInspectorNarrativeForTests(v);
    expect(isBuyerUnsafeString(blob)).toBe(false);
    expect(buyerInspectorNarrativeCredibilityIssue(v)).toBeNull();
  });

  it("operator session progression narrative keeps diagnostic routing language", () => {
    const mem: ExperienceProgressionMemory = {
      recent_surfaces_shown: ["rollout_complexity_estimator", "workspace_readiness_assessment"],
      recent_recipe_ids: [],
      recent_decision_families: ["comparison_support"],
      suppression_history: [],
      escalation_stage: 4,
      last_decision_emit_at: null,
      navigation_tick: 14,
      last_path_seen: "/",
      last_emit_navigation_tick: null,
      last_modal_emit_at: null,
      last_modal_emit_navigation_tick: null,
    };
    const p = minimalProfile({ experience_progression: mem });
    const text = buildSessionProgressionNarrative(p, envSuppressed("x"));
    expect(text).toMatch(/route ticks counted/i);
    expect(text).toMatch(/Escalation warming is at stage/i);
  });
});
