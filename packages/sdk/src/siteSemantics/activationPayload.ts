import type { ActivationPayloadEnvelope, GenericPageKind, PersonalizationSignal, SessionProfile } from "@si/shared";
import { formatTimelineClock } from "../sessionIntel";
import { timelineHumanPageLabel } from "../siteEnvironment/genericPageClassifier";
import { publicSiteTypeLabel } from "../siteIntelligence/publicLabels";

const TIMELINE_PREVIEW_CAP = 5;

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function currentPathForPayload(profile: SessionProfile): string {
  if (profile.page_journey?.length)
    return profile.page_journey[profile.page_journey.length - 1]!.path || "/";
  const seq = profile.signals.path_sequence;
  if (seq?.length) return seq[seq.length - 1]! || "/";
  return "/";
}

/** Payload `page.kind` should not stay `unknown` when path hints give a human content/homepage read. */
function buildPayloadPage(
  profile: SessionProfile,
  env: SessionProfile["site_environment"],
  sem: SessionProfile["page_semantics"],
): Record<string, unknown> {
  const pathRecent = currentPathForPayload(profile);
  const raw = env.page.generic_kind;
  const display = timelineHumanPageLabel(raw, pathRecent);
  const base: Record<string, unknown> = {
    primary_promise: sem.primary_promise ?? env.object.object_name,
    schema_types: sem.schema_types_detected,
  };
  if (raw !== "unknown") {
    return { kind: raw, confidence: r2(env.page.confidence), ...base };
  }
  const p = (pathRecent.split("?")[0] || "/").trim() || "/";
  const coercedKind: GenericPageKind = p === "/" || p === "" ? "homepage" : "article_page";
  return {
    kind: coercedKind,
    confidence: r2(env.page.confidence),
    classifier_kind: "unknown",
    low_confidence: env.page.confidence < 0.55,
    display_kind: display,
    ...base,
  };
}

/** Strip accidental full URLs from timeline lines bound for vendor payloads (keep path + search when parseable). */
function sanitizeTimelineMessageForPayload(message: string): string {
  return message.replace(/https?:\/\/[^\s)]+/gi, (raw) => {
    try {
      const u = new URL(raw);
      return `${u.pathname}${u.search}`.slice(0, 200) || "/";
    } catch {
      return "[url]";
    }
  });
}

function buildTimelinePreviewForPayload(p: SessionProfile): string[] {
  const rows = p.intel_timeline ?? [];
  if (!rows.length) return [];
  return rows.slice(-TIMELINE_PREVIEW_CAP).map((ev) => {
    const clock = formatTimelineClock(p.started_at, ev.t);
    const msg = sanitizeTimelineMessageForPayload(ev.message);
    return `${clock} ${msg}`;
  });
}

function summarizeBehavior(p: SessionProfile): Record<string, unknown> | null {
  const b = p.behavior_snapshot;
  if (!b) return null;
  // `behavior` is activation / debug context for vendors — not the primary personalization_signal.
  return {
    context: "activation_debug_preview",
    arrival_channel: b.traffic.channel_guess,
    arrival_confidence_0_100: b.traffic.arrival_confidence_0_100,
    acquisition_narrative: b.traffic.acquisition_narrative,
    acquisition_evidence: b.traffic.acquisition_evidence.slice(0, 8),
    query_themes: b.traffic.query_themes,
    referral_interpretation: {
      arrival_channel: b.referral_model.arrival_channel,
      arrival_subchannel: b.referral_model.arrival_subchannel,
      arrival_type: b.referral_model.arrival_type,
      acquisition_strategy: b.referral_model.acquisition_strategy,
      acquisition_stage: b.referral_model.acquisition_stage,
      acquisition_themes: b.referral_model.acquisition_themes.slice(0, 12),
      acquisition_posture: b.referral_model.acquisition_posture,
      creative_interpretation: b.referral_model.creative_interpretation,
      commerce_mindset: b.referral_model.commerce_mindset.slice(0, 10),
      personalization_hint: b.referral_model.personalization_hint,
      campaign_detected: b.referral_model.campaign_detected,
      campaign_confidence_0_1: b.referral_model.campaign_confidence_0_1,
      confidence_0_1: b.referral_model.confidence_0_1,
      evidence: b.referral_model.evidence.slice(0, 10),
    },
    campaign_clues: b.campaign_intent.commercial_clues,
    keyword_themes: b.campaign_intent.keyword_themes.slice(0, 10),
    campaign_angle: b.campaign_intent.campaign_angle,
    referrer_category: b.referrer.category,
    journey_pattern: b.navigation.journey_pattern,
    journey_velocity: b.navigation.journey_velocity,
    comparison_behavior: b.navigation.comparison_behavior,
    path_summary: b.navigation.path_summary,
    engagement_quality: b.engagement_quality.label,
    activation_readiness: b.activation_readiness.score_0_100,
    interruption_posture: b.activation_readiness.interruption_posture,
    commercial_phase: b.commercial_journey_phase,
    anonymous_similarity_hint: b.anonymous_similarity_hint,
    device: b.device_context,
    timeline_preview: buildTimelinePreviewForPayload(p),
  };
}

function conceptSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function buildPersonalizationSignal(profile: SessionProfile): PersonalizationSignal {
  const opp = profile.activation_opportunity;
  const top = Object.entries(profile.concept_affinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, score]) => ({ id: conceptSlug(label), label, score: +score.toFixed(3) }));

  const readiness = Math.min(
    100,
    Math.round(
      profile.signals.cta_clicks * 16 +
        profile.intent_score * 0.28 +
        (profile.signals.return_visit ? 8 : 0),
    ),
  );

  return {
    visitor_status: "anonymous",
    journey_stage: profile.journey_stage,
    inferred_archetype: profile.persona,
    inferred_need: opp.inferred_need,
    top_concepts: top,
    intent_score: profile.intent_score,
    urgency_score: profile.urgency_score,
    engagement_score: profile.engagement_score,
    conversion_readiness: readiness,
    recommended_message_angle: opp.message_angle,
    recommended_offer_type: opp.offer_type,
    recommended_surface: opp.surface,
    recommended_timing: opp.timing,
    recommended_friction_level: opp.friction,
    confidence: Math.round(opp.confidence * 100) / 100,
    reason: opp.reason.slice(0, 8),
    commercial_journey_phase: profile.behavior_snapshot?.commercial_journey_phase,
    activation_readiness_score: profile.behavior_snapshot?.activation_readiness?.score_0_100,
  };
}

export function buildActivationPayload(profile: SessionProfile): ActivationPayloadEnvelope {
  const sig = profile.personalization_signal;
  const sc = profile.site_context;
  const env = profile.site_environment;
  const sem = profile.page_semantics;

  return {
    event: "si_personalization_signal",
    si: {
      site: {
        domain: sc.domain,
        type: sc.vertical,
        type_label: publicSiteTypeLabel(env.site.site_type),
        confidence: r2(env.site.confidence),
        business_context: publicSiteTypeLabel(env.site.site_type),
      },
      page: buildPayloadPage(profile, env, sem),
      session: {
        id: profile.session_id,
        journey_stage: sig.journey_stage,
        intent_score: sig.intent_score,
        urgency_score: sig.urgency_score,
        engagement_score: sig.engagement_score,
        conversion_readiness: sig.conversion_readiness,
        return_visit: profile.signals.return_visit,
      },
      concepts: sig.top_concepts,
      objective: {
        primary: env.conversion.primary_objective,
        secondary: env.conversion.secondary_objective,
        confidence: r2(env.conversion.confidence),
      },
      nba: profile.next_best_action
        ? {
            action: profile.next_best_action.next_best_action,
            surface: profile.next_best_action.recommended_surface,
            treatment_level: profile.next_best_action.recommended_treatment_level,
            confidence: r2(profile.next_best_action.confidence),
          }
        : null,
      activation: { ...profile.activation_opportunity, confidence: r2(profile.activation_opportunity.confidence) },
      playbook_match: profile.activation_opportunity.playbook,
      personalization_signal: sig,
      behavior: summarizeBehavior(profile),
    },
  };
}
