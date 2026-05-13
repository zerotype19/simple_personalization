import type { ExperimentAssignment, SessionProfile } from "@si/shared";
import { createBlankSignals, defaultSiteContext } from "../session";
import { emptySiteEnvironmentSnapshot } from "../siteEnvironment";

/** Dealer-shaped defaults so unit tests stay aligned with auto-retail rules unless overrides set another vertical. */
function testAutoSiteContext() {
  return {
    ...defaultSiteContext(),
    vertical: "auto_retail" as const,
    vertical_confidence: 95,
    page_kind: "Inventory / VDP",
  };
}

export function minimalProfile(overrides: Partial<SessionProfile> = {}): SessionProfile {
  const now = Date.now();
  const base: SessionProfile = {
    session_id: "test-session-aaaaaaaa",
    started_at: now,
    updated_at: now,
    intent_score: 0,
    urgency_score: 0,
    engagement_score: 0,
    journey_stage: "discovery",
    category_affinity: {},
    concept_affinity: {},
    page_type: "home",
    signals: createBlankSignals(),
    experiment_assignment: null,
    active_treatments: [],
    next_best_action: null,
    persona: null,
    site_context: testAutoSiteContext(),
    dynamic_signals: {},
    site_environment: emptySiteEnvironmentSnapshot(),
  };
  return {
    ...base,
    ...overrides,
    signals: { ...base.signals, ...(overrides.signals ?? {}) },
    site_context: { ...base.site_context, ...(overrides.site_context ?? {}) },
    dynamic_signals: { ...base.dynamic_signals, ...(overrides.dynamic_signals ?? {}) },
    site_environment: { ...base.site_environment, ...(overrides.site_environment ?? {}) },
  };
}

export function controlAssignment(): ExperimentAssignment {
  return {
    experiment_id: "exp_personalization_v1",
    variant_id: "control",
    treatment_id: null,
    is_control: true,
  };
}

export function treatmentAssignment(): ExperimentAssignment {
  return {
    experiment_id: "exp_personalization_v1",
    variant_id: "treatment",
    treatment_id: "t_high_intent",
    is_control: false,
  };
}
