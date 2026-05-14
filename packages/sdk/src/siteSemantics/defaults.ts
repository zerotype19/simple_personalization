import type {
  ActivationOpportunity,
  ActivationPayloadEnvelope,
  PageSemantics,
  PersonalizationSignal,
} from "@si/shared";

export function emptyPageSemantics(): PageSemantics {
  return {
    canonical_href: null,
    meta_description_snippet: null,
    og_title: null,
    og_type: null,
    twitter_title: null,
    schema_types_detected: [],
    h1_primary: null,
    heading_counts: { h2: 0, h3: 0 },
    primary_promise: null,
    nav_link_sample: [],
    form_guesses: [],
    link_intent_summary: "",
    commerce_signal_hits: [],
    b2b_signal_hits: [],
    cms_platform: "unknown",
    cta_layout_summary: "",
  };
}

export function emptyActivationOpportunity(): ActivationOpportunity {
  return {
    status: "developing",
    confidence: 0,
    visitor_read: "",
    inferred_need: "",
    message_angle: "",
    offer_type: "",
    surface: "",
    timing: "",
    friction: "low",
    primary_path_label: "",
    secondary_path_label: "",
    soft_path_label: "",
    opportunity_note: null,
    evidence: [],
    reason: [],
    playbook: null,
  };
}

export function emptyPersonalizationSignal(): PersonalizationSignal {
  return {
    visitor_status: "anonymous",
    journey_stage: "discovery",
    inferred_archetype: null,
    inferred_need: "",
    top_concepts: [],
    intent_score: 0,
    urgency_score: 0,
    engagement_score: 0,
    conversion_readiness: 0,
    recommended_message_angle: "",
    recommended_offer_type: "",
    recommended_surface: "",
    recommended_timing: "",
    recommended_friction_level: "low",
    confidence: 0,
    reason: [],
  };
}

export function emptyActivationPayload(): ActivationPayloadEnvelope {
  return {
    event: "si_personalization_signal",
    si: {},
  };
}
