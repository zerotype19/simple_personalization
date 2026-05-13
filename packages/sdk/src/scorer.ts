import type { JourneyStage, SessionProfile, SessionSignals, SiteVertical } from "@si/shared";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * Clamped intent / urgency / engagement from signals (single source for `recomputeScores` + tests).
 */
export function computeClampedScores(
  s: SessionSignals,
  vertical: SiteVertical = "auto_retail",
): {
  intent_score: number;
  urgency_score: number;
  engagement_score: number;
} {
  if (vertical === "auto_retail") {
    const intent =
      s.vdp_views * 14 +
      s.pricing_views * 12 +
      s.finance_interactions * 11 +
      s.compare_interactions * 9 +
      s.cta_clicks * 6 +
      (s.return_visit ? 12 : 0) +
      Math.min(s.pages_viewed, 8) * 2;

    const urgency =
      (s.return_visit ? 18 : 0) +
      Math.min(s.cta_clicks, 5) * 6 +
      Math.min(s.finance_interactions, 4) * 8 +
      Math.min(s.compare_interactions, 4) * 6 +
      Math.min(s.session_duration_ms / 1000 / 30, 6) * 4 +
      Math.min(s.pricing_views, 4) * 5;

    const engagement =
      Math.min(s.max_scroll_depth, 100) * 0.4 +
      Math.min(s.pages_viewed, 12) * 4 +
      Math.min(s.session_duration_ms / 1000 / 15, 8) * 4 +
      (s.vdp_views > 0 ? 6 : 0);

    return {
      intent_score: clamp(intent),
      urgency_score: clamp(urgency),
      engagement_score: clamp(engagement),
    };
  }

  const intent =
    Math.min(s.pages_viewed, 25) * 2.2 +
    Math.min(s.max_scroll_depth, 100) * 0.35 +
    Math.min(s.cta_clicks, 8) * 7 +
    (s.return_visit ? 14 : 0) +
    Math.min(s.session_duration_ms / 1000 / 45, 10) * 3;

  const urgency =
    Math.min(s.cta_clicks, 6) * 10 +
    (s.return_visit ? 16 : 0) +
    Math.min(s.session_duration_ms / 1000 / 40, 12) * 3.5 +
    Math.min(s.pages_viewed, 15) * 1.5;

  const engagement =
    Math.min(s.max_scroll_depth, 100) * 0.45 +
    Math.min(s.pages_viewed, 18) * 3.8 +
    Math.min(s.session_duration_ms / 1000 / 20, 14) * 3.2 +
    Math.min(s.cta_clicks, 5) * 4;

  return {
    intent_score: clamp(intent),
    urgency_score: clamp(urgency),
    engagement_score: clamp(engagement),
  };
}

/**
 * EMA category affinity from cumulative session keyword hits (same math as `recomputeScores`).
 */
export function mergeAffinityFromHits(
  prevAffinity: Record<string, number>,
  cumulativeHits: Record<string, number>,
): Record<string, number> {
  const next: Record<string, number> = { ...prevAffinity };
  const totalHits = Object.values(cumulativeHits).reduce((a, b) => a + b, 0);
  if (totalHits > 0) {
    for (const [tag, hits] of Object.entries(cumulativeHits)) {
      if (hits <= 0) continue;
      const prev = next[tag] ?? 0;
      const sessionShare = hits / totalHits;
      next[tag] = +(prev * 0.6 + sessionShare * 0.4).toFixed(3);
    }
  }
  for (const tag of Object.keys(next)) {
    if (!(tag in cumulativeHits) || (cumulativeHits[tag] ?? 0) <= 0) {
      delete next[tag];
    }
  }
  return next;
}

/**
 * Recompute intent / urgency / engagement / journey stage / category affinity
 * from current signals. All scoring is local, deterministic and explainable.
 */
export function recomputeScores(profile: SessionProfile): SessionProfile {
  const v = profile.site_context.vertical;
  const scores = computeClampedScores(profile.signals, v);
  profile.intent_score = scores.intent_score;
  profile.urgency_score = scores.urgency_score;
  profile.engagement_score = scores.engagement_score;

  profile.category_affinity = mergeAffinityFromHits(profile.category_affinity, profile.signals.category_hits);

  profile.journey_stage = pickJourneyStage(profile, v);
  return profile;
}

function pickJourneyStage(p: SessionProfile, vertical: SiteVertical): JourneyStage {
  const s = p.signals;
  if (vertical === "auto_retail") {
    if (p.intent_score >= 75 || s.cta_clicks >= 3 || s.finance_interactions >= 2) {
      return "conversion";
    }
    if (
      s.compare_interactions >= 1 ||
      s.vdp_views >= 2 ||
      p.intent_score >= 50
    ) {
      return "comparison";
    }
    if (s.pages_viewed >= 2 || s.vdp_views >= 1 || s.pricing_views >= 1) {
      return "browsing";
    }
    return "discovery";
  }

  if (p.intent_score >= 72 || s.cta_clicks >= 3) return "conversion";
  if (p.intent_score >= 48 || s.pages_viewed >= 4 || s.cta_clicks >= 1) return "comparison";
  if (s.pages_viewed >= 2 || p.engagement_score >= 42) return "browsing";
  return "discovery";
}
