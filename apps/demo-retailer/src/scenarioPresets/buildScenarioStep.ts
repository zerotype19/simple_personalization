import type {
  BehaviorSnapshot,
  CommercialJourneyPhase,
  JourneyStage,
  PageType,
  SessionSignals,
  SiteVertical,
} from "@si/shared";
import type { FixtureSessionInput } from "@si/sdk";

export interface ScenarioStepSpec {
  path: string[];
  ao: number;
  readiness: number;
  engagement?: number;
  intent?: number;
  posture?: NonNullable<BehaviorSnapshot["activation_readiness"]>["interruption_posture"];
  comparison?: boolean;
  phase?: CommercialJourneyPhase;
  journey?: JourneyStage;
  ctaClicks?: number;
  rapidScanner?: boolean;
  pricingViews?: number;
  compareInteractions?: number;
  financeInteractions?: number;
  mobile?: boolean;
  conceptAffinity?: Record<string, number>;
}

const VERTICAL_CONCEPT_DEFAULTS: Partial<Record<SiteVertical, Record<string, number>>> = {
  b2b_saas: {
    "implementation readiness": 0.62,
    "comparison shopping": 0.52,
    "integration and api scope": 0.44,
    "deep reading": 0.4,
  },
  ecommerce: {
    "product discovery": 0.58,
    "comparison shopping": 0.54,
    "premium quality seeking": 0.46,
    "price promo sensitivity": 0.45,
    "cart checkout intent": 0.42,
    "product fit sizing": 0.4,
  },
  healthcare: {
    eligibility: 0.58,
    coverage: 0.52,
    "next step": 0.48,
    screening: 0.46,
    billing: 0.4,
  },
  financial_services: {
    calculator: 0.56,
    apr: 0.52,
    refinance: 0.5,
    security: 0.5,
    application: 0.44,
  },
  auto_retail: {
    inventory: 0.58,
    "monthly payment": 0.54,
    "test drive": 0.5,
    "trade in": 0.48,
    "contact dealer": 0.46,
  },
};

function defaultConceptAffinity(vertical: SiteVertical): Record<string, number> {
  return { ...(VERTICAL_CONCEPT_DEFAULTS[vertical] ?? { exploration: 0.5 }) };
}

function pageTypeFromPathSegment(lastSegment: string): PageType {
  const s = lastSegment.toLowerCase();
  if (s.includes("inventory")) return "inventory";
  if (s.includes("finance")) return "finance";
  if (s.includes("compare")) return "compare";
  if (s.includes("trade")) return "trade_in";
  if (s.includes("test-drive") || s.includes("test_drive")) return "test_drive";
  if (s.includes("vdp") || s.includes("vehicle")) return "vdp";
  return "other";
}

export function buildScenarioFixture(
  name: string,
  vertical: SiteVertical,
  spec: ScenarioStepSpec,
): FixtureSessionInput {
  const path = spec.path;
  const last = path[path.length - 1] ?? "/";
  const engagement = spec.engagement ?? 38 + path.length * 7;
  const readiness = spec.readiness;
  const posture = spec.posture ?? "soft_cta_ready";
  const phase = spec.phase ?? "research";
  const journey = spec.journey ?? "discovery";
  const intent = spec.intent ?? Math.min(100, engagement + 8);
  const mobile = spec.mobile ?? last.toLowerCase().includes("mobile");

  const signals: Partial<SessionSignals> = {
    pages_viewed: Math.max(1, path.length),
    path_sequence: path,
    cta_clicks: spec.ctaClicks ?? 0,
    pricing_views:
      spec.pricingViews ?? (path.some((p) => /pricing|fees|rates/i.test(p)) ? 1 : 0),
    compare_interactions:
      spec.compareInteractions ?? (path.some((p) => p.includes("compare")) ? 1 : 0),
    finance_interactions:
      spec.financeInteractions ?? (path.some((p) => p.includes("finance")) ? 1 : 0),
    max_scroll_depth: spec.rapidScanner ? 24 : 76,
    session_duration_ms: 50_000 + path.length * 35_000,
    landing_href: `https://demo.optiview.ai${path[0] ?? "/"}`,
    initial_referrer: null,
    offer_surface_clicks: path.some((p) => /shipping|delivery|cart|coupon/i.test(p)) ? 1 : 0,
  };

  const behavior_snapshot = {
    navigation: {
      journey_pattern: "scenario_fixture",
      journey_velocity: spec.rapidScanner ? "rapid" : "deliberate",
      comparison_behavior: spec.comparison ?? false,
      high_intent_transition: phase === "conversion_ready",
      path_summary: last,
    },
    engagement_quality: {
      label: spec.rapidScanner ? "rapid_scanner" : "deep_reader",
      rationale: ["scenario_fixture"],
    },
    activation_readiness: {
      score_0_100: readiness,
      interruption_posture: posture,
      rationale: posture === "avoid_interrupt" ? ["restraint_demo"] : [],
    },
    commercial_journey_phase: phase,
    device_context: {
      coarse_device: mobile ? "mobile" : "desktop",
      weekday: true,
      hour_local: 10,
      viewport_bucket: mobile ? "narrow" : "wide",
    },
  } as unknown as BehaviorSnapshot;

  return {
    name,
    vertical,
    journey_stage: journey,
    commercial_journey_phase: phase,
    engagement_score: engagement,
    intent_score: intent,
    urgency_score: Math.min(100, readiness - 10),
    page_type: pageTypeFromPathSegment(last),
    activation_opportunity: {
      confidence: spec.ao,
      status: spec.ao >= 0.55 ? "ready" : "developing",
      visitor_read: "scenario",
      inferred_need: "scenario",
      message_angle: "next_step",
      offer_type: "guidance",
      surface: "inline_module",
      timing: "after_scroll",
      friction: "low",
      primary_path_label: "",
      secondary_path_label: "",
      soft_path_label: "",
      opportunity_note: null,
      evidence: ["scenario_fixture"],
      reason: ["scenario_fixture"],
      playbook: null,
    },
    behavior_snapshot,
    concept_affinity: { ...defaultConceptAffinity(vertical), ...spec.conceptAffinity },
    signals,
  };
}
