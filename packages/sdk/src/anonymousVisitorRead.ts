import type { SessionProfile } from "@si/shared";
import { timelineHumanPageLabel } from "./siteEnvironment";
import { verticalDisplayName } from "./siteIntelligence/panelLabelMapper";

function channelClause(profile: SessionProfile): string {
  const bs = profile.behavior_snapshot;
  if (!bs) return "with an unknown acquisition path";
  const ch = bs.traffic.channel_guess.replace(/_/g, " ");
  if (bs.campaign_intent.campaign_angle) {
    return `from a ${ch} touchpoint tagged as ${bs.campaign_intent.campaign_angle.toLowerCase()}`;
  }
  return `via ${ch}`;
}

/**
 * Plain-language synthesis for the inspector hero (“Anonymous visitor read”).
 * Uses only fields already derived in-session — no identity, no hidden enrichment.
 */
export function buildAnonymousVisitorRead(profile: SessionProfile): {
  paragraphs: string[];
  recommended_activation: string;
} {
  const bs = profile.behavior_snapshot;
  const ao = profile.activation_opportunity;
  const env = profile.site_environment;
  const sc = profile.site_context;
  const s = profile.signals;

  const siteLabel = sc.scan.site_name?.trim() || sc.domain || "this site";
  const vertical = verticalDisplayName(sc.vertical);
  const pathRecent = profile.page_journey?.[profile.page_journey.length - 1]?.path ?? "/";
  const surfaceLabel = timelineHumanPageLabel(env.page.generic_kind, pathRecent);
  const promise =
    profile.page_semantics.primary_promise?.trim() ||
    env.object.object_name?.trim() ||
    "the core offer on this page";

  const returnVisit = s.return_visit ? "a returning " : "";
  let posture = "anonymous visitor";
  if (bs) {
    if (bs.engagement_quality.label === "deep_reader" || bs.navigation.journey_velocity === "slow")
      posture = "deliberate evaluator";
    else if (bs.navigation.comparison_behavior) posture = "comparison-oriented researcher";
    else if (bs.engagement_quality.label === "rapid_scanner") posture = "fast-moving explorer";
  }

  const article = (() => {
    if (s.return_visit) return "";
    const first = posture.trim().split(/\s+/)[0] ?? "";
    return /^[aeiou]/i.test(first) ? "an " : "a ";
  })();
  const p1 = `This appears to be ${returnVisit}${article}${posture} on ${siteLabel} (${vertical}), ${channelClause(profile)}.`;

  const engage = bs
    ? `Engagement reads as ${bs.engagement_quality.label.replace(/_/g, " ")} with commercial phase “${bs.commercial_journey_phase.replace(
        /_/g,
        " ",
      )}”.`
    : "Engagement signals are still warming up.";
  const p2 =
    env.page.generic_kind === "homepage" || surfaceLabel === "Homepage"
      ? `They are on the homepage; the strongest page read is “${promise.slice(0, 160)}${promise.length > 160 ? "…" : ""}”. ${engage}`
      : `They are viewing ${surfaceLabel}; the strongest page read is “${promise.slice(0, 160)}${promise.length > 160 ? "…" : ""}”. ${engage}`;

  let ctaLine = "";
  if (s.cta_clicks === 0 && s.cta_hover_events >= 3)
    ctaLine = " They have hovered conversion CTAs multiple times without committing to a click yet.";
  else if (s.cta_clicks >= 1) ctaLine = " They have already clicked at least one conversion-oriented control.";
  else ctaLine = " Hard conversion CTAs have not registered clicks in-session yet.";

  const postureLine = bs
    ? ` Interruption posture: ${bs.activation_readiness.interruption_posture.replace(/_/g, " ")} (readiness ${bs.activation_readiness.score_0_100}/100).`
    : "";

  const p3 = `${ctaLine}${postureLine}`;

  const recommended =
    ao.playbook?.recommended_activation_summary?.trim() ||
    [ao.message_angle, ao.offer_type, ao.surface].filter(Boolean).join(" · ") ||
    ao.visitor_read ||
    "Keep observing until ladder and engagement justify a soft inline prompt.";

  return { paragraphs: [p1, p2, p3], recommended_activation: recommended };
}
