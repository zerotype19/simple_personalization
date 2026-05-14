import type { ActivationPayloadEnvelope, PersonalizationSignal, SessionProfile } from "@si/shared";
import { publicSiteTypeLabel } from "../siteIntelligence/publicLabels";

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
        confidence: env.site.confidence,
        business_context: publicSiteTypeLabel(env.site.site_type),
      },
      page: {
        kind: env.page.generic_kind,
        confidence: env.page.confidence,
        primary_promise: sem.primary_promise ?? env.object.object_name,
        schema_types: sem.schema_types_detected,
      },
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
        confidence: env.conversion.confidence,
      },
      nba: profile.next_best_action
        ? {
            action: profile.next_best_action.next_best_action,
            surface: profile.next_best_action.recommended_surface,
            treatment_level: profile.next_best_action.recommended_treatment_level,
            confidence: profile.next_best_action.confidence,
          }
        : null,
      activation: profile.activation_opportunity,
      personalization_signal: sig,
    },
  };
}
