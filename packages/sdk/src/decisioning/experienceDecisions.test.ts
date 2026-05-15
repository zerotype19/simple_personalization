import type {
  ExperienceDecision,
  ExperienceDecisionEnvelope,
  SessionProfile,
  SiteVertical,
} from "@si/shared";
import { describe, expect, it, vi } from "vitest";
import { buildExperienceDecisionEnvelope } from "./buildExperienceDecisionEnvelope";
import { DecisionBus } from "./decisionBus";
import { experienceDecisionMeaningfullyChanged } from "./decisionDiff";
import { shouldSuppressDecision } from "./decisionSuppression";
import { experienceDecisionToDataLayerPayload } from "../destinations/destinationTypes";
import { emptyActivationOpportunity, emptyPersonalizationSignal } from "../siteSemantics/defaults";
import { emptySiteEnvironmentSnapshot } from "../siteEnvironment";
import { createBlankSignals, defaultSiteContext } from "../session";
import { minimalProfile } from "../test/fixtures";

function behaviorBase(
  overrides: Partial<NonNullable<SessionProfile["behavior_snapshot"]>> = {},
): NonNullable<SessionProfile["behavior_snapshot"]> {
  const traffic = {
    channel_guess: "organic_search" as const,
    landing_path: "/",
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
    has_click_id: false,
    arrival_confidence_0_100: 50,
    acquisition_evidence: [],
    acquisition_narrative: "Organic",
    acquisition_interpretation: null,
    entry_page_kind: "article_page" as const,
    landing_pattern_summary: null,
    query_themes: [],
  };
  const navigation = {
    journey_pattern: "",
    journey_velocity: "deliberate" as const,
    comparison_behavior: false,
    high_intent_transition: false,
    path_summary: "",
  };
  const base = {
    traffic,
    referral_model: {
      arrival_channel: "organic_search" as const,
      arrival_subchannel: "",
      arrival_type: "",
      campaign_detected: false,
      campaign_confidence_0_1: 0,
      acquisition_strategy: "",
      acquisition_themes: [],
      acquisition_posture: null,
      creative_interpretation: null,
      commerce_mindset: [],
      personalization_hint: null,
      acquisition_stage: "research" as const,
      evidence: [],
      confidence_0_1: 0.5,
    },
    campaign_intent: {
      keyword_themes: [],
      campaign_angle: null,
      commercial_clues: [],
      confidence_0_100: 0,
    },
    referrer: { category: "unknown" as const, host: null, narrative: "", channel_hint: null },
    navigation,
    engagement_quality: {
      label: "deep_reader" as const,
      rationale: [],
    },
    activation_readiness: {
      score_0_100: 55,
      interruption_posture: "soft_cta_ready" as const,
      rationale: [],
    },
    commercial_journey_phase: "research" as const,
    anonymous_similarity_hint: null,
    device_context: {
      coarse_device: "desktop" as const,
      weekday: true,
      hour_local: 12,
      viewport_bucket: "wide" as const,
    },
  };
  return { ...base, ...overrides } as NonNullable<SessionProfile["behavior_snapshot"]>;
}

function siteCtx(vertical: SiteVertical) {
  return {
    ...defaultSiteContext(),
    vertical,
    vertical_confidence: 90,
  };
}

describe("experience decisioning", () => {
  it("envelope returns null primary when session is weak", () => {
    const p = minimalProfile({
      site_context: siteCtx("b2b_saas"),
      engagement_score: 10,
      personalization_signal: {
        ...emptyPersonalizationSignal(),
        engagement_score: 10,
        activation_readiness_score: 10,
        confidence: 0.35,
      },
      activation_opportunity: { ...emptyActivationOpportunity(), confidence: 0.35, reason: ["a"], evidence: ["e"] },
    });
    const { envelope } = buildExperienceDecisionEnvelope(p, { now: Date.now() });
    expect(envelope.primary_decision).toBeNull();
  });

  it("suppression summary explains weak sessions", () => {
    const p = minimalProfile({
      site_context: siteCtx("b2b_saas"),
      engagement_score: 10,
      personalization_signal: {
        ...emptyPersonalizationSignal(),
        engagement_score: 10,
        activation_readiness_score: 10,
        confidence: 0.35,
      },
      activation_opportunity: { ...emptyActivationOpportunity(), confidence: 0.35, reason: ["a"], evidence: ["e"] },
    });
    const { envelope } = buildExperienceDecisionEnvelope(p, { now: Date.now() });
    expect(envelope.primary_decision).toBeNull();
    expect(envelope.suppression_summary?.length).toBeGreaterThan(10);
  });

  it("B2B recipe emits implementation checklist when concepts and readiness align", () => {
    const p = minimalProfile({
      site_context: siteCtx("b2b_saas"),
      engagement_score: 55,
      signals: { ...createBlankSignals(), cta_clicks: 0 },
      commercial_journey_phase: "research",
      concept_affinity: { "Implementation readiness": 0.55 },
      concept_evidence: { "Implementation readiness": ["implementation", "cadence"] },
      behavior_snapshot: behaviorBase({ commercial_journey_phase: "research" }),
      site_environment: {
        ...emptySiteEnvironmentSnapshot(),
        page: { generic_kind: "article_page", confidence: 0.7, signals_used: ["h1"] },
      },
      activation_opportunity: {
        ...emptyActivationOpportunity(),
        confidence: 0.78,
        reason: ["Strong read", "recipe context"],
        evidence: ["page signals", "engagement"],
      },
      personalization_signal: {
        ...emptyPersonalizationSignal(),
        engagement_score: 55,
        activation_readiness_score: 55,
        confidence: 0.78,
        top_concepts: [{ id: "implementation_readiness", label: "Implementation readiness", score: 0.55 }],
      },
    });
    const { envelope, slotDecisions } = buildExperienceDecisionEnvelope(p, { now: Date.now() });
    expect(envelope.primary_decision).not.toBeNull();
    expect(envelope.primary_decision?.offer_type).toBe("implementation_checklist");
    expect(["implementation_readiness_checklist", "article_inline_mid"]).toContain(
      envelope.primary_decision?.surface_id,
    );
    expect(envelope.primary_decision?.headline.length).toBeGreaterThan(12);
    const inline = slotDecisions.article_inline_mid;
    expect(inline?.action === "show" || inline?.offer_type === "implementation_checklist").toBe(true);
  });

  it("publisher vertical emits newsletter/related decision on article path with engagement", () => {
    const p = minimalProfile({
      site_context: siteCtx("publisher_content"),
      engagement_score: 50,
      commercial_journey_phase: "research",
      behavior_snapshot: (() => {
        const b = behaviorBase();
        return {
          ...b,
          traffic: { ...b.traffic, entry_page_kind: "article_page" as const },
        } as NonNullable<SessionProfile["behavior_snapshot"]>;
      })(),
      site_environment: {
        ...emptySiteEnvironmentSnapshot(),
        page: { generic_kind: "article_page", confidence: 0.8, signals_used: ["article"] },
      },
      activation_opportunity: {
        ...emptyActivationOpportunity(),
        confidence: 0.72,
        reason: ["r1"],
        evidence: ["e1"],
      },
      personalization_signal: {
        ...emptyPersonalizationSignal(),
        engagement_score: 50,
        activation_readiness_score: 50,
        confidence: 0.72,
      },
    });
    const { envelope } = buildExperienceDecisionEnvelope(p, { now: Date.now() });
    expect(envelope.primary_decision?.offer_type).toMatch(/newsletter|series|digest/i);
  });

  it("ecommerce comparison path emits help-me-choose style offer", () => {
    const p = minimalProfile({
      site_context: siteCtx("ecommerce"),
      engagement_score: 50,
      behavior_snapshot: (() => {
        const b = behaviorBase();
        return {
          ...b,
          navigation: { ...b.navigation, comparison_behavior: true },
        } as NonNullable<SessionProfile["behavior_snapshot"]>;
      })(),
      commercial_journey_phase: "comparison",
      activation_opportunity: {
        ...emptyActivationOpportunity(),
        confidence: 0.74,
        reason: ["compare"],
        evidence: ["multi sku views"],
      },
      personalization_signal: {
        ...emptyPersonalizationSignal(),
        engagement_score: 50,
        activation_readiness_score: 50,
        confidence: 0.74,
      },
    });
    const { envelope } = buildExperienceDecisionEnvelope(p, { now: Date.now() });
    expect(envelope.primary_decision?.offer_type).toBe("guided_shortlist");
  });

  it("healthcare suppresses aggressive urgency decisions", () => {
    const dec: ExperienceDecision = {
      id: "x",
      surface_id: "provider_discussion_cta",
      action: "show",
      message_angle: "urgent_book_now",
      offer_type: "limited_time_booking",
      headline: "Book now — slots disappearing today",
      body: "Act immediately or lose your spot.",
      cta_label: "Book",
      target_url_hint: "",
      timing: "immediate",
      friction: "high",
      priority: 50,
      confidence: 0.8,
      reason: ["r"],
      evidence: ["e"],
      source_recipe_id: "healthcare_flash_urgency_test",
      ttl_seconds: 300,
      expires_at: Date.now() + 300_000,
      privacy_scope: "session_only",
      visitor_status: "anonymous",
    };
    const catalog = { surfaces: [{ surface_id: "provider_discussion_cta", min_confidence: 0.4 }] };
    const out = shouldSuppressDecision({
      profile: minimalProfile({ site_context: siteCtx("healthcare") }),
      vertical: "healthcare",
      decision: dec,
      catalog,
      globalFloor: 0.45,
    });
    expect(out.ok).toBe(false);
    expect(out.reason).toContain("healthcare");
  });

  it("financial services suppresses unsafe approval language", () => {
    const dec: ExperienceDecision = {
      id: "y",
      surface_id: "eligibility_assist",
      action: "show",
      message_angle: "instant_approval",
      offer_type: "guaranteed_approval",
      headline: "Guaranteed approval in 60 seconds",
      body: "Everyone qualifies — no credit check.",
      cta_label: "Apply",
      target_url_hint: "",
      timing: "immediate",
      friction: "high",
      priority: 50,
      confidence: 0.85,
      reason: ["r"],
      evidence: ["e"],
      ttl_seconds: 300,
      expires_at: Date.now() + 300_000,
      privacy_scope: "session_only",
      visitor_status: "anonymous",
    };
    const catalog = { surfaces: [{ surface_id: "eligibility_assist", min_confidence: 0.4 }] };
    const out = shouldSuppressDecision({
      profile: minimalProfile({ site_context: siteCtx("financial_services") }),
      vertical: "financial_services",
      decision: dec,
      catalog,
      globalFloor: 0.45,
    });
    expect(out.ok).toBe(false);
    expect(out.reason).toContain("financial");
  });

  it("event bus only emits on meaningful changes", () => {
    const bus = new DecisionBus();
    const cb = vi.fn();
    const unsub = bus.subscribeAll(cb);
    const env = (primary: ExperienceDecision | null): ExperienceDecisionEnvelope => ({
      event: "si_experience_decision",
      generated_at: 1,
      session_id: "s",
      primary_decision: primary,
      secondary_decisions: [],
    });
    bus.notifyIfChanged(env(null));
    expect(cb).toHaveBeenCalledTimes(1);
    bus.notifyIfChanged(env(null));
    expect(cb).toHaveBeenCalledTimes(1);
    bus.notifyIfChanged({
      event: "si_experience_decision",
      generated_at: 1,
      session_id: "s",
      primary_decision: null,
      secondary_decisions: [],
      suppression_summary: "changed",
    });
    expect(cb).toHaveBeenCalledTimes(2);
    unsub();
  });

  it("unsubscribe stops bus callbacks", () => {
    const bus = new DecisionBus();
    const cb = vi.fn();
    const unsub = bus.subscribeAll(cb);
    bus.notifyIfChanged({
      event: "si_experience_decision",
      generated_at: 1,
      session_id: "s",
      primary_decision: null,
      secondary_decisions: [],
    });
    unsub();
    bus.notifyIfChanged({
      event: "si_experience_decision",
      generated_at: 2,
      session_id: "s",
      primary_decision: null,
      secondary_decisions: [],
      suppression_summary: "x",
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("dataLayer push shape for experience decisions", () => {
    const envelope = {
      event: "si_experience_decision" as const,
      generated_at: 1,
      session_id: "sid",
      primary_decision: {
        id: "d1",
        surface_id: "article_inline_mid",
        action: "show" as const,
        message_angle: "a",
        offer_type: "o",
        headline: "h",
        body: "b",
        cta_label: "c",
        target_url_hint: "",
        timing: "after_scroll" as const,
        friction: "low" as const,
        priority: 50,
        confidence: 0.66,
        reason: [],
        evidence: [],
        ttl_seconds: 100,
        expires_at: 999,
        privacy_scope: "session_only" as const,
        visitor_status: "anonymous" as const,
      },
      secondary_decisions: [],
    };
    const pl = experienceDecisionToDataLayerPayload(envelope);
    expect(pl.event).toBe("si_experience_decision");
    expect(pl.si_decision_surface_id).toBe("article_inline_mid");
    expect(pl.si_decision_confidence).toBe(0.66);
  });

  it("experienceDecisionMeaningfullyChanged detects confidence delta", () => {
    const base = {
      event: "si_experience_decision" as const,
      generated_at: 1,
      session_id: "s",
      primary_decision: {
        id: "d",
        surface_id: "x",
        action: "show" as const,
        message_angle: "m",
        offer_type: "o",
        headline: "",
        body: "",
        cta_label: "",
        target_url_hint: "",
        timing: "immediate" as const,
        friction: "low" as const,
        priority: 1,
        confidence: 0.5,
        reason: [],
        evidence: [],
        ttl_seconds: 1,
        expires_at: 2,
        privacy_scope: "session_only" as const,
        visitor_status: "anonymous" as const,
      },
      secondary_decisions: [],
    };
    const next = {
      ...base,
      primary_decision: { ...base.primary_decision!, confidence: 0.65 },
    };
    expect(experienceDecisionMeaningfullyChanged(base, next)).toBe(true);
  });
});
