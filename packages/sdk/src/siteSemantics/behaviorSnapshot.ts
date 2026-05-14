import type {
  ActivationReadinessRead,
  BehaviorSnapshot,
  CommercialJourneyPhase,
  EngagementQualityRead,
  NavigationPatternRead,
  SessionProfile,
} from "@si/shared";
import { analyzeCampaignIntent } from "./campaignIntentAnalyzer";
import { analyzeLandingAcquisitionPattern } from "./landingPatternAnalyzer";
import { analyzeNavigationPattern } from "./navigationPatternAnalyzer";
import { analyzeReferrer } from "./referrerAnalyzer";
import { buildTrafficReferralModel } from "./trafficReferralModel";
import { inferTrafficAcquisition } from "./trafficSourceAnalyzer";

function inferCommercialPhase(p: SessionProfile, nav: NavigationPatternRead): CommercialJourneyPhase {
  const legacy = p.journey_stage;
  const steps = p.page_journey ?? [];
  if (steps.some((s) => s.generic_kind === "support_page")) return "support_service";
  if (nav.high_intent_transition || legacy === "conversion") return "conversion_ready";
  if (steps.some((s) => s.generic_kind === "pricing_page" || s.generic_kind === "lead_form_page"))
    return "evaluation";
  if (nav.comparison_behavior || legacy === "comparison") return "comparison";
  if (legacy === "browsing") {
    if (nav.journey_pattern === "content_depth_led") return "research";
    return "research";
  }
  if (legacy === "discovery") return "discovery";
  return "research";
}

function engagementQuality(p: SessionProfile, nav: NavigationPatternRead): EngagementQualityRead {
  const s = p.signals;
  const vis = s.tab_visible_ms + s.tab_hidden_ms;
  const tabFocusRatio = vis > 0 ? s.tab_visible_ms / vis : 1;
  const rationale: string[] = [];

  if (s.max_scroll_depth >= 68 && s.session_duration_ms > 25000) {
    rationale.push("Deep scroll with sustained time-on-site while tab visible.");
    return { label: "deep_reader", rationale };
  }
  if (s.cta_hover_events >= 4 && s.cta_clicks === 0) {
    rationale.push("Repeated CTA hover without click — evaluation or hesitation.");
    return { label: "hesitant_converter", rationale };
  }
  if (s.pages_viewed >= 4 && s.session_duration_ms < 45000) {
    rationale.push("Several pages in a short window — rapid exploration.");
    return { label: "rapid_scanner", rationale };
  }
  if (s.compare_interactions >= 1 || nav.comparison_behavior) {
    rationale.push("Comparison signals detected in-session.");
    return { label: "comparison_reviewer", rationale };
  }
  if (tabFocusRatio < 0.35 && s.session_duration_ms > 20000) {
    rationale.push("Long session but heavy tab backgrounding — weak attention proxy.");
    return { label: "skim_reader", rationale };
  }
  rationale.push("Mixed engagement — no single dominant quality pattern yet.");
  return { label: "balanced_visitor", rationale };
}

function activationReadiness(p: SessionProfile): ActivationReadinessRead {
  const s = p.signals;
  const ladder = p.site_environment.ladder.level;
  let score = Math.round(
    p.engagement_score * 0.35 +
      Math.min(28, s.cta_hover_events * 3) +
      (s.max_scroll_depth >= 55 ? 14 : 0) +
      (s.return_visit ? 10 : 0) -
      (s.cta_clicks >= 3 ? 12 : 0),
  );
  score = Math.max(0, Math.min(100, score));

  let interruption_posture: ActivationReadinessRead["interruption_posture"] = "observe_only";
  if (ladder >= 3 && score >= 62) interruption_posture = "hard_cta_ready";
  else if (ladder >= 2 && score >= 48) interruption_posture = "soft_cta_ready";
  if (s.tab_hidden_ms > s.tab_visible_ms * 1.8 && s.session_duration_ms > 30_000) {
    interruption_posture = "avoid_interrupt";
  }

  const rationale: string[] = [];
  rationale.push(`Personalization ladder level ${ladder} (higher unlocks stronger surfaces).`);
  if (s.cta_hover_events >= 3 && s.cta_clicks === 0)
    rationale.push("Hover-rich, click-poor — prefer inline or low-friction prompts.");
  if (interruption_posture === "avoid_interrupt") rationale.push("Background-tab heavy — avoid modal pressure.");

  return { score_0_100: score, interruption_posture, rationale };
}

function cohortHint(p: SessionProfile, nav: NavigationPatternRead): string | null {
  const top = Object.entries(p.concept_affinity).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!top && !nav.comparison_behavior) return null;
  const traits: string[] = [];
  if (nav.comparison_behavior) traits.push("cross-page comparison behavior");
  if (p.signals.pricing_views >= 1 || p.signals.offer_surface_clicks >= 1)
    traits.push("pricing or offer-surface engagement");
  if (top) traits.push(`a strong “${top}” concept signal`);
  if (!traits.length) return null;
  return `This session resembles anonymous visitors with ${traits.join(", ")} — use for tone, not identity.`;
}

function deviceContext(): BehaviorSnapshot["device_context"] {
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let coarse_device: "mobile" | "tablet" | "desktop" | "unknown" = "unknown";
  if (/Mobile|Android.*Mobile|iPhone|iPod/i.test(ua) && !/Tablet|iPad/i.test(ua)) coarse_device = "mobile";
  else if (/Tablet|iPad|Android(?!.*Mobile)/i.test(ua)) coarse_device = "tablet";
  else if (w > 0 || ua.length > 0) coarse_device = "desktop";

  const d = new Date();
  const wd = d.getDay();
  const weekday = wd >= 1 && wd <= 5;

  let viewport_bucket: "narrow" | "medium" | "wide" | "unknown" = "unknown";
  if (w > 0) {
    if (w < 640) viewport_bucket = "narrow";
    else if (w < 1100) viewport_bucket = "medium";
    else viewport_bucket = "wide";
  }

  return { coarse_device, weekday, hour_local: d.getHours(), viewport_bucket };
}

/**
 * Assembles anonymous behavioral intelligence for inspector + activation envelope.
 */
export function buildBehaviorSnapshot(p: SessionProfile): BehaviorSnapshot {
  const landing = p.signals.landing_href || (typeof window !== "undefined" ? window.location.href : "");
  const navigation = analyzeNavigationPattern(p.page_journey, p.signals);
  const first = p.page_journey?.[0] ?? null;
  const siteHostname =
    typeof window !== "undefined" ? window.location.hostname : (p.site_context.domain || null);
  const referrer = analyzeReferrer(p.signals.initial_referrer, siteHostname);
  const entryKind = first?.generic_kind ?? p.site_environment.page.generic_kind;
  const landingPattern = analyzeLandingAcquisitionPattern({
    entryKind: first?.generic_kind ?? entryKind,
    signals: p.signals,
    navigation,
  });
  const traffic = inferTrafficAcquisition({
    href: landing,
    documentReferrer: p.signals.initial_referrer,
    siteHostname,
    referrerRead: referrer,
    navigation,
    signals: p.signals,
    firstJourneyEntry: first ? { generic_kind: first.generic_kind, path: first.path } : null,
    currentGenericKind: p.site_environment.page.generic_kind,
    landingPattern,
  });
  const campaign_intent = analyzeCampaignIntent(
    traffic.utm_term,
    traffic.utm_campaign,
    traffic.utm_content,
    traffic.query_themes,
  );
  const referral_model = buildTrafficReferralModel({
    urlString: landing,
    traffic,
    referrer,
    navigation,
    campaign_intent,
    signals: p.signals,
    landingPattern,
  });

  const engagement_quality = engagementQuality(p, navigation);
  const activation_readiness = activationReadiness(p);
  const commercial_journey_phase = inferCommercialPhase(p, navigation);
  const anonymous_similarity_hint = cohortHint(p, navigation);

  const out: BehaviorSnapshot = {
    traffic,
    referral_model,
    campaign_intent,
    referrer,
    navigation,
    engagement_quality,
    activation_readiness,
    commercial_journey_phase,
    anonymous_similarity_hint,
    device_context: deviceContext(),
  };
  p.behavior_snapshot = out;
  p.commercial_journey_phase = commercial_journey_phase;
  return out;
}
