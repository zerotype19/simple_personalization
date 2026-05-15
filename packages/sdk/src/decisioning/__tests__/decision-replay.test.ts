import { describe, expect, it } from "vitest";
import type { BehaviorSnapshot, SessionProfile } from "@si/shared";
import { minimalProfile } from "../../test/fixtures";
import { buildPersonalizationSignal } from "../../siteSemantics/activationPayload";
import { runDecisionReplay } from "../replay/runDecisionReplay";
import {
  replayEscalationJumpsLimited,
  replayHasSurfaceFlicker,
  replayTransitionsHaveReasons,
} from "../replay/observabilityInvariants";
import { diffExperienceDecision } from "../decisionDiff";
import minBehaviorPreset from "../fixtures/presets/min-behavior.json";

function finalize(p: SessionProfile): SessionProfile {
  p.personalization_signal = buildPersonalizationSignal(p);
  return p;
}

const bsBase = minBehaviorPreset as unknown as BehaviorSnapshot;

function b2bBase(): SessionProfile {
  return finalize(
    minimalProfile({
      site_context: {
        ...minimalProfile().site_context,
        vertical: "b2b_saas",
        vertical_confidence: 92,
        page_kind: "Product / marketing",
      },
      engagement_score: 44,
      commercial_journey_phase: "research",
      concept_affinity: { "Implementation readiness checklist": 0.72 },
      behavior_snapshot: {
        ...bsBase,
        activation_readiness: { score_0_100: 42, interruption_posture: "soft_cta_ready", rationale: [] },
        commercial_journey_phase: "research",
        engagement_quality: { label: "deep_reader", rationale: [] },
        navigation: {
          journey_pattern: "linear",
          journey_velocity: "deliberate",
          comparison_behavior: false,
          high_intent_transition: false,
          path_summary: "/",
        },
      },
    }),
  );
}

describe("runDecisionReplay", () => {
  it("is deterministic for identical frames and options", () => {
    const a = b2bBase();
    a.signals.path_sequence = ["/"];
    const b = finalize(
      minimalProfile({
        ...a,
        engagement_score: 58,
        commercial_journey_phase: "comparison",
        concept_affinity: {
          "Implementation readiness checklist": 0.74,
          "Pricing comparison spreadsheet": 0.71,
        },
        signals: { ...a.signals, pricing_views: 1 },
        page_journey: [
          ...(a.page_journey ?? []),
          { path: "/pricing", generic_kind: "pricing_page", title_snippet: null, t: Date.now() },
        ],
      }),
    );
    b.signals.path_sequence = ["/", "/pricing"];

    const r1 = runDecisionReplay([a, b], { baseNow: 1_700_065_000_000 });
    const r2 = runDecisionReplay([a, b], { baseNow: 1_700_065_000_000 });
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it("emits transitions with reasons and passes escalation/flicker heuristics on gradual B2B deepen", () => {
    const f0 = b2bBase();
    f0.signals.path_sequence = ["/docs"];
    const f1 = finalize(
      minimalProfile({
        ...f0,
        engagement_score: 52,
        commercial_journey_phase: "comparison",
        behavior_snapshot: {
          ...f0.behavior_snapshot!,
          commercial_journey_phase: "comparison",
          activation_readiness: { score_0_100: 50, interruption_posture: "soft_cta_ready", rationale: [] },
          navigation: {
            ...f0.behavior_snapshot!.navigation,
            comparison_behavior: true,
          },
        },
      }),
    );
    f1.signals.path_sequence = ["/docs", "/pricing"];

    const replay = runDecisionReplay([f0, f1], { baseNow: 2_000_000_000_000 });
    expect(replay.frames.length).toBe(2);
    expect(replayTransitionsHaveReasons(replay)).toBe(true);
    expect(replayHasSurfaceFlicker(replay)).toBe(false);
    expect(replayEscalationJumpsLimited(replay, 3)).toBe(true);
  });
});

describe("diffExperienceDecision", () => {
  it("detects surface and timing shifts", () => {
    const vertical = "b2b_saas" as const;
    const prev = {
      id: "a",
      surface_id: "s1",
      action: "show" as const,
      message_angle: "a",
      offer_type: "o1",
      headline: "h",
      body: "b",
      cta_label: "c",
      target_url_hint: "",
      timing: "after_scroll" as const,
      friction: "low" as const,
      priority: 1,
      confidence: 0.6,
      reason: [],
      evidence: [],
      source_recipe_id: "b2b_implementation_readiness_inline",
      ttl_seconds: 100,
      expires_at: 1,
      privacy_scope: "session_only" as const,
      visitor_status: "anonymous" as const,
    };
    const next = { ...prev, surface_id: "s2", timing: "next_navigation" as const, confidence: 0.62 };
    const d = diffExperienceDecision(prev, next, vertical);
    expect(d.surface_changed).toBe(true);
    expect(d.timing_changed).toBe(true);
  });
});
