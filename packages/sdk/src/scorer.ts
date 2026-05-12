import type { JourneyStage, SessionProfile } from "@si/shared";
import type { PageContext } from "./site";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

/**
 * Recompute intent / urgency / engagement / journey stage / category affinity
 * from current signals. All scoring is local, deterministic and explainable.
 */
export function recomputeScores(profile: SessionProfile, ctx: PageContext | null): SessionProfile {
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

  // Category affinity uses an exponential moving average of signal hits.
  if (ctx) {
    const total =
      Object.values(ctx.category_hits).reduce((a, b) => a + b, 0) || 1;
    for (const [tag, hits] of Object.entries(ctx.category_hits)) {
      const prev = profile.category_affinity[tag] ?? 0;
      const localScore = hits / total;
      profile.category_affinity[tag] = +(prev * 0.6 + localScore * 0.4).toFixed(3);
    }
  }
  // Decay categories that did not appear this page so stale affinity fades.
  for (const tag of Object.keys(profile.category_affinity)) {
    if (!ctx || !(tag in ctx.category_hits)) {
      profile.category_affinity[tag] = +(
        profile.category_affinity[tag] * 0.85
      ).toFixed(3);
      if (profile.category_affinity[tag] < 0.05) {
        delete profile.category_affinity[tag];
      }
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
