import type { Recommendation, SessionProfile, SiteVertical } from "@si/shared";
import { isAutoSiteVertical } from "@si/shared";
import { distinctPagesExploredCount } from "../sessionMetrics";

function reasonsGeneric(p: SessionProfile, extra: string[]): string[] {
  const r: string[] = [];
  const distinct = distinctPagesExploredCount(p);
  if (distinct >= 3) r.push(`${distinct} distinct pages explored this session`);
  if (p.signals.max_scroll_depth >= 50) r.push("Strong scroll depth on key pages");
  if (p.signals.cta_clicks >= 1) r.push("CTA engagement");
  if (p.signals.return_visit) r.push("Return visitor");
  for (const e of extra) r.push(e);
  return [...new Set(r)].slice(0, 5);
}

/**
 * Vertical-aware fallback when config rules do not produce a recommendation.
 */
export function defaultRecommendationForSite(
  p: SessionProfile,
  vertical: SiteVertical,
): Recommendation | null {
  if (isAutoSiteVertical(vertical)) return null;

  const scan = p.site_context.scan;
  const engagement = p.engagement_score;
  const cta = p.signals.cta_clicks;

  if (engagement >= 68 && cta === 0) {
    return {
      next_best_action: "Surface a clear next step (demo, guide, or primary CTA)",
      treatment_hint: null,
      confidence: 0.72,
      reason: reasonsGeneric(p, [
        "High engagement without CTA clicks",
        "Good moment for a softer conversion ask",
      ]),
    };
  }

  if (scan.content_themes.length >= 2 && (vertical === "b2b_saas" || vertical === "lead_generation")) {
    return {
      next_best_action: "Recommend related framework or implementation content",
      treatment_hint: null,
      confidence: 0.66,
      reason: reasonsGeneric(p, [
        `Themes detected: ${scan.content_themes.slice(0, 3).join(", ")}`,
        "Consider related educational or offer content",
      ]),
    };
  }

  if (p.intent_score >= 55) {
    return {
      next_best_action: "Promote deeper product or platform exploration",
      treatment_hint: null,
      confidence: 0.58,
      reason: reasonsGeneric(p, ["Elevated intent from browsing patterns"]),
    };
  }

  if (engagement >= 45) {
    return {
      next_best_action: "Encourage deeper content engagement",
      treatment_hint: null,
      confidence: 0.52,
      reason: reasonsGeneric(p, ["Solid session engagement"]),
    };
  }

  return {
    next_best_action: "Continue observing — keep key content discoverable",
    treatment_hint: null,
    confidence: 0.42,
    reason: reasonsGeneric(p, ["Early-session or exploratory traffic"]),
  };
}
