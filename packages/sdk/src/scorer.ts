import type { JourneyStage, SessionProfile } from "@si/shared";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * Recompute intent / urgency / engagement / journey stage / category affinity
 * from current signals. All scoring is local, deterministic and explainable.
 */
export function recomputeScores(profile: SessionProfile): SessionProfile {
  const s = profile.signals;

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

  profile.intent_score = clamp(intent);
  profile.urgency_score = clamp(urgency);
  profile.engagement_score = clamp(engagement);

  // Category affinity: EMA toward each tag's share of *session* keyword hits
  // (signals.category_hits), merged across pages in runtime. We intentionally do
  // not decay on every DOM tick or when the current route's copy omits a tag
  // (e.g. test-drive form after a sedan VDP) — that produced false "dropping interest".
  const cumulative = s.category_hits;
  const totalHits = Object.values(cumulative).reduce((a, b) => a + b, 0);
  if (totalHits > 0) {
    for (const [tag, hits] of Object.entries(cumulative)) {
      if (hits <= 0) continue;
      const prev = profile.category_affinity[tag] ?? 0;
      const sessionShare = hits / totalHits;
      profile.category_affinity[tag] = +(prev * 0.6 + sessionShare * 0.4).toFixed(3);
    }
  }
  for (const tag of Object.keys(profile.category_affinity)) {
    if (!(tag in cumulative) || (cumulative[tag] ?? 0) <= 0) {
      delete profile.category_affinity[tag];
    }
  }

  profile.journey_stage = pickJourneyStage(profile);
  return profile;
}

function pickJourneyStage(p: SessionProfile): JourneyStage {
  const s = p.signals;
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
