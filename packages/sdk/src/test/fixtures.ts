import type { ExperimentAssignment, SessionProfile } from "@si/shared";
import { createBlankSignals } from "../session";

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
    page_type: "home",
    signals: createBlankSignals(),
    experiment_assignment: null,
    active_treatments: [],
    next_best_action: null,
    persona: null,
  };
  return {
    ...base,
    ...overrides,
    signals: { ...base.signals, ...(overrides.signals ?? {}) },
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
