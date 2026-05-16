import type { CommercialBlocker, CommercialIntentMemory, ExperienceDecision, SessionProfile } from "@si/shared";
import type { RecipeMatchCandidate } from "./recipeMatcher";

export const COMMERCIAL_INTENT_MAX_POSITIVE_DELTA = 0.12;
export const COMMERCIAL_INTENT_MAX_NEGATIVE_DELTA = -0.18;
const WEAK_BASE_CONFIDENCE_CAP = 0.45;
const BOOST_BASE_CONFIDENCE_FLOOR = 0.52;

export interface CommercialIntentRecipeScore {
  delta: number;
  reasons: string[];
  blockers_used: string[];
  action_family_used?: string;
  momentum_used?: string;
}

export interface RankedCandidate extends RecipeMatchCandidate {
  commercial_intent_delta: number;
  commercial_intent_reasons: string[];
}

export interface CommercialIntentSuppression {
  reason: string;
  code: string;
}

function readiness(profile: SessionProfile): number {
  const sig = profile.personalization_signal;
  return (
    sig.activation_readiness_score ??
    sig.conversion_readiness ??
    profile.behavior_snapshot?.activation_readiness.score_0_100 ??
    0
  );
}

function recipeBlob(c: RecipeMatchCandidate): string {
  const d = c.recipe.decision;
  return [
    c.recipe.id,
    c.recipe.decision_family ?? "",
    c.surface_id,
    d.message_angle,
    d.offer_type,
    d.surface_type ?? "",
    d.cta_label,
  ]
    .join(" ")
    .toLowerCase();
}

function matchesAny(blob: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((p) => p.test(blob));
}

const BLOCKER_RESPONSE_PATTERNS: Record<string, readonly RegExp[]> = {
  pricing_uncertainty: [/pricing|roi|rate|fee|cost|subscription|plans/],
  implementation_risk: [/implementation|checklist|rollout|readiness|workspace/],
  integration_concern: [/integration|api|migration|connect/],
  trust_security_concern: [/trust|security|compliance|privacy/],
  coverage_or_eligibility_uncertainty: [/eligibility|coverage|benefits/],
  financing_or_payment_uncertainty: [/finance|payment|apr|lease|calculator|estimate/],
  shipping_returns_uncertainty: [/shipping|returns|delivery|refund/],
  fit_or_variant_uncertainty: [/compare|fit|variant|shortlist|help_me_choose/],
  inventory_availability_uncertainty: [/inventory|availability|in_stock|locator/],
  human_contact_hesitation: [/soft|optional|prep|discussion/],
  application_friction: [/document|prep|checklist|resume/],
  warranty_or_support_concern: [/warranty|support|service/],
};

const HARD_ESCALATION = [
  /dealer_contact/,
  /test_drive/,
  /guided_walkthrough/,
  /implementation_workshop/,
  /application_soft_resume/,
  /appointment_soft/,
  /soft_modal/,
  /soft_popup/,
];

const REASSURANCE = [
  /reassurance/,
  /explainer/,
  /guidance/,
  /checklist/,
  /education/,
  /inline_module/,
  /help_me_choose/,
  /payment/,
  /finance/,
  /eligibility/,
  /coverage/,
  /shipping/,
  /document_prep/,
  /rate_fee/,
];

const ACTION_ALIGNMENT: Record<
  string,
  { favor: readonly RegExp[]; penalize?: readonly RegExp[]; minReadinessForHard?: number }
> = {
  schedule_test_drive: {
    favor: [/test_drive|dealer_contact/],
    penalize: [/inventory_assist/],
    minReadinessForHard: 54,
  },
  view_financing: {
    favor: [/finance|payment/],
    penalize: [/dealer_contact|test_drive/],
  },
  calculate: {
    favor: [/finance|payment|calculator|rate_fee/],
    penalize: [/dealer_contact|inventory/],
  },
  estimate: {
    favor: [/finance|payment|estimate/],
    penalize: [/dealer_contact/],
  },
  compare: {
    favor: [/compare|shortlist|help_me_choose|comparison/],
    penalize: [/coupon/],
  },
  add_to_cart: {
    favor: [/cart|shipping|returns/],
    penalize: [/coupon/],
  },
  begin_checkout: {
    favor: [/cart|shipping|reassurance/],
    penalize: [/coupon/],
  },
  schedule_demo: {
    favor: [/walkthrough|demo|workshop/],
    penalize: [/coupon/],
    minReadinessForHard: 56,
  },
  talk_to_sales: {
    favor: [/walkthrough|demo|provider_discussion/],
    minReadinessForHard: 58,
  },
  check_eligibility: {
    favor: [/eligibility|coverage/],
    penalize: [/appointment|urgent/],
  },
  check_coverage: {
    favor: [/eligibility|coverage/],
    penalize: [/appointment|urgent/],
  },
  view_security: {
    favor: [/security|trust/],
    penalize: [/walkthrough|demo/],
  },
  view_integrations: {
    favor: [/integration|implementation/],
    penalize: [/walkthrough/],
  },
  apply_coupon: {
    favor: [/coupon/],
    penalize: [/shipping/],
  },
  read_reviews: {
    favor: [/shipping|returns|reassurance|fit/],
    penalize: [/coupon/],
  },
};

function scoreGenericSurfacePenalty(blob: string, blockers: CommercialBlocker[]): number {
  if (!/article_inline|homepage_hero_secondary/.test(blob)) return 0;
  const trustOrRollout = blockers.some((b) =>
    ["integration_concern", "trust_security_concern", "implementation_risk", "pricing_uncertainty"].includes(
      b.id,
    ),
  );
  return trustOrRollout ? -0.06 : 0;
}

function scoreBlockers(blob: string, blockers: CommercialBlocker[]): { delta: number; used: string[] } {
  let delta = scoreGenericSurfacePenalty(blob, blockers);
  const used: string[] = [];
  for (const b of blockers.slice(0, 3)) {
    const patterns = BLOCKER_RESPONSE_PATTERNS[b.id];
    if (!patterns) continue;
    if (matchesAny(blob, patterns)) {
      delta += 0.05 * Math.min(1, b.confidence);
      used.push(b.id);
    } else if (b.id === "human_contact_hesitation" && matchesAny(blob, HARD_ESCALATION)) {
      delta -= 0.06 * Math.min(1, b.confidence);
      used.push(b.id);
    } else if (b.id === "financing_or_payment_uncertainty" && matchesAny(blob, HARD_ESCALATION)) {
      delta -= 0.07 * Math.min(1, b.confidence);
      used.push(b.id);
    }
  }
  return { delta, used };
}

function scoreAction(
  blob: string,
  action: string | null,
  readinessScore: number,
): { delta: number; action?: string } {
  if (!action) return { delta: 0 };
  const spec = ACTION_ALIGNMENT[action];
  if (!spec) return { delta: 0 };
  let delta = 0;
  if (matchesAny(blob, spec.favor)) {
    const hard = matchesAny(blob, HARD_ESCALATION);
    if (hard && spec.minReadinessForHard != null && readinessScore < spec.minReadinessForHard) {
      delta -= 0.05;
    } else {
      delta += hard && spec.minReadinessForHard != null ? 0.08 : 0.06;
    }
  }
  if (spec.penalize && matchesAny(blob, spec.penalize)) delta -= 0.05;
  return { delta, action };
}

function scoreMomentum(
  blob: string,
  mem: CommercialIntentMemory,
  friction: string | undefined,
): { delta: number; momentum?: string } {
  const dir = mem.momentum.direction;
  const hard = matchesAny(blob, HARD_ESCALATION);
  const soft = matchesAny(blob, REASSURANCE);
  switch (dir) {
    case "increasing":
      if (hard) return { delta: 0.03, momentum: dir };
      return { delta: 0, momentum: dir };
    case "validating":
      if (soft) return { delta: 0.04, momentum: dir };
      if (hard) return { delta: -0.06, momentum: dir };
      return { delta: 0, momentum: dir };
    case "hesitating":
      if (hard || friction === "high") return { delta: -0.08, momentum: dir };
      if (soft) return { delta: 0.03, momentum: dir };
      return { delta: -0.04, momentum: dir };
    case "regressing":
      if (hard) return { delta: -0.1, momentum: dir };
      if (soft) return { delta: 0.05, momentum: dir };
      return { delta: -0.05, momentum: dir };
    case "stable":
      if (hard && !mem.strongest_action_family) return { delta: -0.04, momentum: dir };
      return { delta: 0, momentum: dir };
    default:
      return { delta: 0 };
  }
}

function regulatedScoreAdjust(
  vertical: string,
  blob: string,
  mem: CommercialIntentMemory,
  readinessScore: number,
): number {
  let delta = 0;
  if (vertical === "healthcare") {
    if (/urgent|flash_urgency|diagnosis|prognosis/.test(blob)) delta -= 0.12;
    if (/appointment/.test(blob)) {
      const earned =
        mem.human_escalation_interactions > 0 &&
        readinessScore >= 66 &&
        (mem.strongest_action_family === "schedule_appointment" ||
          mem.strongest_action_family === "talk_to_sales" ||
          mem.strongest_action_family === "request_info");
      if (!earned) delta -= 0.08;
    }
  }
  if (vertical === "financial_services") {
    if (/apply now|guaranteed|preapproved|urgent|limited time/.test(blob)) delta -= 0.12;
    if (/application_soft_resume|application_resume/.test(blob)) {
      if (readinessScore < 72 || mem.strongest_action_family !== "apply") delta -= 0.09;
    }
    if (/rate_fee|explainer|calculator/.test(blob) && mem.strongest_action_family !== "apply") {
      delta += 0.04;
    }
  }
  return delta;
}

function clampDelta(delta: number, baseConfidence: number): number {
  let d = Math.max(COMMERCIAL_INTENT_MAX_NEGATIVE_DELTA, Math.min(COMMERCIAL_INTENT_MAX_POSITIVE_DELTA, delta));
  if (baseConfidence < BOOST_BASE_CONFIDENCE_FLOOR && d > 0) {
    d = Math.min(d, 0.04);
  }
  if (baseConfidence < WEAK_BASE_CONFIDENCE_CAP && d > 0) {
    d = 0;
  }
  return Math.round(d * 1000) / 1000;
}

/**
 * Bounded recipe score adjustment from session commercial_intent memory.
 */
export function scoreRecipeWithCommercialIntent(
  candidate: RecipeMatchCandidate,
  profile: SessionProfile,
): CommercialIntentRecipeScore {
  const mem = profile.commercial_intent;
  if (!mem) {
    return { delta: 0, reasons: [], blockers_used: [] };
  }

  const blob = recipeBlob(candidate);
  const readinessScore = readiness(profile);
  const blockers = mem.blockers.length ? mem.blockers : profile.commercial_intent?.blockers ?? [];

  const bScore = scoreBlockers(blob, blockers);
  const aScore = scoreAction(blob, mem.strongest_action_family, readinessScore);
  const mScore = scoreMomentum(blob, mem, candidate.recipe.decision.friction);
  const reg = regulatedScoreAdjust(profile.site_context.vertical, blob, mem, readinessScore);

  const raw = bScore.delta + aScore.delta + mScore.delta + reg;
  const delta = clampDelta(raw, candidate.match_confidence);

  const reasons: string[] = [];
  if (delta > 0.02) reasons.push("commercial_intent_alignment_boost");
  if (delta < -0.02) reasons.push("commercial_intent_restraint_adjustment");

  return {
    delta,
    reasons,
    blockers_used: bScore.used,
    action_family_used: aScore.action,
    momentum_used: mScore.momentum,
  };
}

/**
 * Re-rank recipe candidates with bounded commercial-intent deltas applied to match_confidence.
 */
export function rankCandidatesWithCommercialIntent(
  candidates: RecipeMatchCandidate[],
  profile: SessionProfile,
): RankedCandidate[] {
  const ranked: RankedCandidate[] = candidates.map((c) => {
    const scored = scoreRecipeWithCommercialIntent(c, profile);
    const nextConf = Math.max(0.05, Math.min(0.98, c.match_confidence + scored.delta));
    return {
      ...c,
      match_confidence: Math.round(nextConf * 1000) / 1000,
      commercial_intent_delta: scored.delta,
      commercial_intent_reasons: scored.reasons,
    };
  });
  ranked.sort((a, b) => b.match_confidence - a.match_confidence);
  return ranked;
}

function isHardEscalationSurface(decision: ExperienceDecision): boolean {
  const blob = `${decision.surface_id} ${decision.surface_type ?? ""} ${decision.friction} ${decision.cta_label}`.toLowerCase();
  return (
    matchesAny(blob, HARD_ESCALATION) ||
    decision.friction === "high" ||
    /modal|popup|overlay/.test(blob)
  );
}

/**
 * Additional commercial-intent suppression (does not override hard floors in {@link shouldSuppressDecision}).
 */
export function shouldSuppressForCommercialIntent(
  decision: ExperienceDecision,
  profile: SessionProfile,
): CommercialIntentSuppression | null {
  const mem = profile.commercial_intent;
  if (!mem) return null;

  const vertical = profile.site_context.vertical;
  const readinessScore = readiness(profile);
  const blob = `${decision.surface_id} ${decision.message_angle} ${decision.offer_type} ${decision.cta_label}`.toLowerCase();
  const blockers = mem.blockers.map((b) => b.id);
  const hard = isHardEscalationSurface(decision);

  if (mem.momentum.direction === "hesitating" && hard) {
    return { code: "hesitating_withholds_hard_escalation", reason: "commercial_intent_hesitation_holdback" };
  }
  if (mem.momentum.direction === "regressing" && hard) {
    return { code: "regressing_withholds_interruption", reason: "commercial_intent_regression_holdback" };
  }

  if (
    blockers.includes("financing_or_payment_uncertainty") &&
    /dealer_contact|test_drive/.test(blob) &&
    readinessScore < 58
  ) {
    return { code: "finance_blocker_before_dealer", reason: "commercial_intent_finance_first" };
  }

  if (blockers.includes("human_contact_hesitation") && /dealer_contact|talk_to_sales|walkthrough/.test(blob)) {
    return { code: "human_contact_hesitation", reason: "commercial_intent_soft_human_only" };
  }

  if (
    mem.momentum.direction === "validating" &&
    mem.strongest_action_family === "schedule_demo" &&
    /guided_walkthrough|implementation_workshop/.test(blob) &&
    readinessScore < 56
  ) {
    return { code: "demo_validating_holdback", reason: "commercial_intent_demo_not_earned" };
  }

  if (vertical === "healthcare") {
    if (/appointment/.test(blob) && readinessScore < 66) {
      return { code: "healthcare_appointment_not_earned", reason: "commercial_intent_healthcare_restraint" };
    }
    if (mem.strongest_action_family !== "schedule_appointment" && /appointment/.test(blob) && readinessScore < 72) {
      return { code: "healthcare_appointment_without_action", reason: "commercial_intent_healthcare_restraint" };
    }
  }

  if (vertical === "financial_services") {
    if (/application_resume|application_soft/.test(blob)) {
      if (readinessScore < 72) {
        return { code: "finance_application_readiness", reason: "commercial_intent_finance_restraint" };
      }
      if (mem.strongest_action_family !== "apply" && !blockers.includes("application_friction")) {
        return { code: "finance_application_without_action", reason: "commercial_intent_finance_restraint" };
      }
    }
  }

  const actionSpec = mem.strongest_action_family ? ACTION_ALIGNMENT[mem.strongest_action_family] : undefined;
  if (actionSpec?.minReadinessForHard != null && hard && readinessScore < actionSpec.minReadinessForHard) {
    return { code: "action_readiness_not_earned", reason: "commercial_intent_escalation_not_earned" };
  }

  return null;
}

/**
 * Buyer-safe decision explanation lines (no taxonomy ids, scores, or raw families).
 */
export function buildCommercialIntentDecisionReasons(
  profile: SessionProfile,
  decision: ExperienceDecision | null,
): string[] {
  const mem = profile.commercial_intent;
  if (!mem) return [];

  const lines: string[] = [];
  const blockers = mem.blockers.map((b) => b.id);
  const blob = decision
    ? `${decision.surface_id} ${decision.message_angle} ${decision.offer_type}`.toLowerCase()
    : "";

  if (blockers.includes("financing_or_payment_uncertainty")) {
    lines.push("Recent actions suggest financing uncertainty.");
  }
  if (
    blockers.includes("financing_or_payment_uncertainty") &&
    decision &&
    /dealer|test_drive/.test(blob)
  ) {
    lines.push("The runtime is favoring payment guidance before dealer escalation.");
  } else if (
    blockers.includes("financing_or_payment_uncertainty") &&
    decision &&
    /finance|payment/.test(blob)
  ) {
    lines.push("Payment guidance is prioritized while financing questions are still open.");
  }

  if (blockers.includes("trust_security_concern") || mem.trust_validation_interactions > 0) {
    lines.push("Trust validation is active, so stronger conversion pressure is withheld.");
  }

  if (
    (mem.human_escalation_interactions > 0 || mem.strongest_action_family === "schedule_test_drive") &&
    decision &&
    /dealer|test_drive|walkthrough|demo|appointment|provider/.test(blob)
  ) {
    const readinessScore = readiness(profile);
    if (readinessScore < 58) {
      lines.push(
        "Human-contact intent emerged, but the system is checking whether escalation is earned.",
      );
    }
  }

  if (
    mem.strongest_action_family === "compare" ||
    mem.action_counts.compare >= 1 ||
    blockers.includes("fit_or_variant_uncertainty")
  ) {
    lines.push("Comparison behavior is active, so the next step should clarify options.");
  }

  if (mem.momentum.direction === "hesitating") {
    lines.push("Hesitation in the journey favors reassurance over a harder ask right now.");
  }
  if (mem.momentum.direction === "validating" && decision && /explainer|guidance|checklist|reassurance/.test(blob)) {
    lines.push("The visit looks validation-heavy, so explainers are favored before escalation.");
  }

  if (blockers.includes("shipping_returns_uncertainty") && decision && /shipping|returns/.test(blob)) {
    lines.push("Shipping or returns questions are active, so policy reassurance comes first.");
  }

  if (blockers.includes("implementation_risk") || blockers.includes("integration_concern")) {
    if (decision && /implementation|integration|checklist|security/.test(blob)) {
      lines.push("Implementation and integration signals favor practical rollout guidance before a sales step.");
    }
  }

  const uniq: string[] = [];
  for (const l of lines) {
    const t = l.trim();
    if (t && !uniq.includes(t)) uniq.push(t);
  }
  return uniq.slice(0, 4);
}
