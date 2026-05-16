import type { ExperienceDecisionEnvelope, SessionProfile } from "@si/shared";
import { describe, expect, it } from "vitest";
import { minimalProfile } from "../test/fixtures";
import {
  buildEscalationUnlockCondition,
  buildRuntimeEscalateIfSentence,
  buildRuntimeStayingSentence,
  buildStateReason,
  describeLatestReplayTransition,
  getEscalationPosture,
  getExperienceState,
  getStateProgressionLadder,
  ladderLabel,
} from "./experienceStatePresentation";
import { BUYER_RUNTIME_SIGNAL_STILL_GATHERING } from "./buyerCopySafety";
import type { ReplayResult } from "./replay/types";

function envPrimary(
  partial: Partial<NonNullable<ExperienceDecisionEnvelope["primary_decision"]>> & Pick<
    NonNullable<ExperienceDecisionEnvelope["primary_decision"]>,
    "surface_id" | "headline"
  >,
): ExperienceDecisionEnvelope {
  const primary = {
    id: "d1",
    action: "show" as const,
    message_angle: "help",
    offer_type: "guidance",
    body: "",
    cta_label: "Next",
    target_url_hint: "/",
    timing: "after_scroll" as const,
    friction: "low" as const,
    priority: 80,
    reason: [],
    evidence: [],
    ttl_seconds: 300,
    expires_at: Date.now() + 300_000,
    privacy_scope: "session_only" as const,
    visitor_status: "anonymous" as const,
    confidence: 0.82,
    ...partial,
  };
  return {
    event: "si_experience_decision",
    generated_at: Date.now(),
    session_id: "s1",
    primary_decision: primary as NonNullable<ExperienceDecisionEnvelope["primary_decision"]>,
    secondary_decisions: [],
  };
}

function envSuppressed(summary: string): ExperienceDecisionEnvelope {
  return {
    event: "si_experience_decision",
    generated_at: Date.now(),
    session_id: "s1",
    primary_decision: null,
    secondary_decisions: [],
    suppression_summary: summary,
  };
}

function bs(
  patch: Partial<NonNullable<SessionProfile["behavior_snapshot"]>> = {},
): NonNullable<SessionProfile["behavior_snapshot"]> {
  const base = {
    traffic: {
      channel_guess: "organic_search" as const,
      landing_path: "/",
      utm_source: null as string | null,
      utm_medium: null as string | null,
      utm_campaign: null as string | null,
      utm_term: null as string | null,
      utm_content: null as string | null,
      has_click_id: false,
      arrival_confidence_0_100: 55,
      acquisition_evidence: [] as string[],
      acquisition_narrative: "",
      acquisition_interpretation: null as string | null,
      entry_page_kind: "article_page" as const,
      landing_pattern_summary: null as string | null,
      query_themes: [] as string[],
    },
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
      comparison_behavior: false,
      high_intent_transition: false,
      path_summary: "/",
    },
    engagement_quality: {
      label: "deep_reader" as const,
      rationale: [],
    },
    activation_readiness: {
      score_0_100: 42,
      interruption_posture: "observe_only" as const,
      rationale: [],
    },
    commercial_journey_phase: "research" as const,
    anonymous_similarity_hint: null,
    device_context: {
      coarse_device: "desktop" as const,
      weekday: true,
      hour_local: 10,
      viewport_bucket: "wide" as const,
    },
  };
  return { ...base, ...patch } as NonNullable<SessionProfile["behavior_snapshot"]>;
}

describe("experienceStatePresentation", () => {
  it("maps an early shallow session to Exploring", () => {
    const p = minimalProfile({
      signals: { ...minimalProfile().signals, pages_viewed: 1, path_sequence: ["/"] },
      engagement_score: 14,
      intent_score: 12,
      behavior_snapshot: bs({
        activation_readiness: { score_0_100: 38, interruption_posture: "observe_only", rationale: [] },
        commercial_journey_phase: "research",
      }),
    });
    expect(getExperienceState(p, null, null)).toBe("exploring");
  });

  it("maps comparison behavior to Comparing", () => {
    const p = minimalProfile({
      behavior_snapshot: bs({
        navigation: {
          journey_pattern: "x",
          journey_velocity: "deliberate",
          comparison_behavior: true,
          high_intent_transition: false,
          path_summary: "/compare",
        },
        commercial_journey_phase: "comparison",
      }),
    });
    expect(getExperienceState(p, null, null)).toBe("comparing");
  });

  it("maps an implementation checklist style path to Implementation-focused", () => {
    const p = minimalProfile({
      signals: {
        ...minimalProfile().signals,
        pages_viewed: 2,
        path_sequence: ["/platform", "/implementation-checklist"],
      },
      behavior_snapshot: bs({
        navigation: {
          journey_pattern: "x",
          journey_velocity: "deliberate",
          comparison_behavior: false,
          high_intent_transition: false,
          path_summary: "/implementation-checklist",
        },
        commercial_journey_phase: "evaluation",
      }),
    });
    expect(getExperienceState(p, null, null)).toBe("implementation_focused");
  });

  it("maps high readiness primary surface to Escalation earned", () => {
    const p = minimalProfile({
      intent_score: 60,
      engagement_score: 55,
      behavior_snapshot: bs({
        activation_readiness: { score_0_100: 62, interruption_posture: "hard_cta_ready", rationale: [] },
        commercial_journey_phase: "conversion_ready",
      }),
      personalization_signal: {
        ...minimalProfile().personalization_signal,
        activation_readiness_score: 62,
        conversion_readiness: 62,
      },
    });
    const env = envPrimary({ surface_id: "guided_walkthrough_request", headline: "Book a walkthrough" });
    expect(getExperienceState(p, env, null)).toBe("escalation_earned");
    expect(getEscalationPosture(p, env)).toBe("escalation eligible");
  });

  it("maps null primary with suppression summary to suppression preferred posture", () => {
    const p = minimalProfile({
      behavior_snapshot: bs({
        activation_readiness: { score_0_100: 40, interruption_posture: "soft_cta_ready", rationale: [] },
      }),
    });
    expect(getEscalationPosture(p, envSuppressed("Held back: below_global_confidence_floor."))).toBe("suppression preferred");
  });

  it("exposes a fixed five-rung ladder with correct index", () => {
    const { steps, currentIndex } = getStateProgressionLadder("comparing");
    expect(steps.length).toBe(5);
    expect(steps[currentIndex]).toBe(ladderLabel("comparing"));
  });

  it("summarizes replay transition without numeric leakage", () => {
    const replay: ReplayResult = {
      frames: [],
      transitions: [
        {
          from_index: 0,
          to_index: 1,
          reasons: ["comparison_behavior_detected"],
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
    const s = describeLatestReplayTransition(replay);
    expect(s).toBeTruthy();
    expect(s).not.toMatch(/%|\d+\s*\/\s*100|0\.\d{2,}/);
  });

  it("unknown replay transition reasons collapse to the canonical gathering line", () => {
    const replay: ReplayResult = {
      frames: [],
      transitions: [
        {
          from_index: 0,
          to_index: 1,
          reasons: ["not_a_real_reason" as never],
          primary_surface_from: null,
          primary_surface_to: null,
          suppression_delta: "unchanged",
          timing_from: null,
          timing_to: null,
        },
      ],
      progression_summary: "",
      suppression_summary: "",
      timing_summary: "",
    };
    expect(describeLatestReplayTransition(replay)).toBe(BUYER_RUNTIME_SIGNAL_STILL_GATHERING);
  });

  it("maps timing transition reasons without collapsing to the insufficient-signal fallback", () => {
    const replay: ReplayResult = {
      frames: [],
      transitions: [
        {
          from_index: 0,
          to_index: 1,
          reasons: ["timing_escalated", "timing_relaxed"],
          primary_surface_from: "a",
          primary_surface_to: "b",
          suppression_delta: "unchanged",
          timing_from: "immediate",
          timing_to: "after_scroll",
        },
      ],
      progression_summary: "",
      suppression_summary: "",
      timing_summary: "",
    };
    const s = describeLatestReplayTransition(replay);
    expect(s).toMatch(/Changed because/i);
    expect(s).not.toBe(BUYER_RUNTIME_SIGNAL_STILL_GATHERING);
  });

  it("buyer-visible sentences avoid raw percentages and score jargon", () => {
    const p = minimalProfile({
      signals: { ...minimalProfile().signals, pages_viewed: 2, path_sequence: ["/a", "/b"] },
      behavior_snapshot: bs({
        commercial_journey_phase: "evaluation",
        activation_readiness: { score_0_100: 50, interruption_posture: "soft_cta_ready", rationale: [] },
      }),
    });
    const env = envSuppressed("No leaks.");
    const blob = [
      buildStateReason(p, env, null),
      buildEscalationUnlockCondition(p, env),
      buildRuntimeStayingSentence(p, env, null),
      buildRuntimeEscalateIfSentence(p, env),
    ].join(" ");
    expect(blob).not.toMatch(/%|\d+\s*\/\s*100/);
    expect(blob.toLowerCase()).not.toMatch(/readiness[_\s]?score/);
  });
});
