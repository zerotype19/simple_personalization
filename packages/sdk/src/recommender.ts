import type { Recommendation, SessionProfile } from "@si/shared";
import { buildObjectiveAwareRecommendation } from "./recommendation/objectiveAwareNba";

/**
 * Choose the highest-confidence rule-driven recommendation, falling back to
 * objective-aware NBA (environment + session), then legacy auto heuristics.
 */
export function chooseRecommendation(
  profile: SessionProfile,
  ruleRecs: (Recommendation | null)[],
): Recommendation | null {
  const fromRules = ruleRecs
    .filter((r): r is Recommendation => !!r)
    .map((r) => finalizeReasons(r, profile))
    .sort((a, b) => b.confidence - a.confidence);
  if (fromRules.length) return fromRules[0];

  const objectiveRec = finalizeReasons(buildObjectiveAwareRecommendation(profile), profile);
  const vertical = profile.site_context.vertical;

  if (vertical === "auto_retail") {
    const legacy = defaultRecommendation(profile);
    if (legacy && legacy.confidence >= 0.57 && legacy.treatment_hint) {
      return finalizeReasons(legacy, profile);
    }
  }

  return objectiveRec;
}

function defaultRecommendation(p: SessionProfile): Recommendation | null {
  if (p.intent_score >= 75) {
    return {
      next_best_action: "Promote primary conversion CTA (schedule test drive)",
      treatment_hint: "high_intent",
      confidence: 0.78,
      reason: collectReasons(p, ["high intent score", "active session"]),
    };
  }
  if (p.signals.finance_interactions >= 1 || p.signals.pricing_views >= 2) {
    return {
      next_best_action: "Surface monthly payment + financing offers",
      treatment_hint: "payment_sensitive",
      confidence: 0.66,
      reason: collectReasons(p, ["finance behavior", "pricing interest"]),
    };
  }
  if ((p.category_affinity.suv ?? 0) >= 0.4 || (p.category_affinity.family ?? 0) >= 0.4) {
    return {
      next_best_action: "Promote family SUV inventory and safety messaging",
      treatment_hint: "family_buyer",
      confidence: 0.62,
      reason: collectReasons(p, ["SUV affinity", "family signals"]),
    };
  }
  if ((p.category_affinity.sedan ?? 0) >= 0.36) {
    return {
      next_best_action: "Surface sedans, efficiency, and commuter-friendly trims",
      treatment_hint: "researcher",
      confidence: 0.58,
      reason: collectReasons(p, ["sedan affinity from session"]),
    };
  }
  if ((p.category_affinity.luxury ?? 0) >= 0.35) {
    return {
      next_best_action: "Highlight premium trims and white-glove concierge",
      treatment_hint: "luxury_buyer",
      confidence: 0.6,
      reason: collectReasons(p, ["luxury affinity"]),
    };
  }
  if (p.engagement_score >= 50) {
    return {
      next_best_action: "Encourage deeper exploration (compare or save)",
      treatment_hint: "researcher",
      confidence: 0.5,
      reason: collectReasons(p, ["solid engagement"]),
    };
  }
  return null;
}

function collectReasons(p: SessionProfile, extra: string[]): string[] {
  const reasons: string[] = [];
  if (p.signals.vdp_views >= 2) reasons.push(`${p.signals.vdp_views} VDP views`);
  if (p.signals.pricing_views) reasons.push(`${p.signals.pricing_views} pricing views`);
  if (p.signals.finance_interactions) {
    reasons.push(`${p.signals.finance_interactions} finance interactions`);
  }
  if (p.signals.return_visit) reasons.push("Return visit");
  if (p.signals.compare_interactions) reasons.push("Comparison started");
  for (const e of extra) reasons.push(e);
  return Array.from(new Set(reasons)).slice(0, 5);
}

function finalizeReasons(rec: Recommendation, p: SessionProfile): Recommendation {
  if (rec.reason?.length) return rec;
  return { ...rec, reason: collectReasons(p, []) };
}
