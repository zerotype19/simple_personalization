import type { ExperienceDecisionEnvelope } from "@si/shared";

export interface ExperienceDecisionDataLayerPayload {
  event: "si_experience_decision";
  si_decision_surface_id: string | null;
  si_decision_action: string | null;
  si_decision_offer_type: string | null;
  si_decision_message_angle: string | null;
  si_decision_timing: string | null;
  si_decision_confidence: number | null;
  si_session_id: string;
  si_suppression_summary: string | null;
}

export function experienceDecisionToDataLayerPayload(
  envelope: ExperienceDecisionEnvelope,
): ExperienceDecisionDataLayerPayload {
  const p = envelope.primary_decision;
  return {
    event: "si_experience_decision",
    si_decision_surface_id: p?.surface_id ?? null,
    si_decision_action: p?.action ?? null,
    si_decision_offer_type: p?.offer_type ?? null,
    si_decision_message_angle: p?.message_angle ?? null,
    si_decision_timing: p?.timing ?? null,
    si_decision_confidence: p?.confidence ?? null,
    si_session_id: envelope.session_id,
    si_suppression_summary: envelope.suppression_summary ?? null,
  };
}
