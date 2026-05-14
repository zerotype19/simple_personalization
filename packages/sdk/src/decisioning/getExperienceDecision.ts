import type { ExperienceDecision, ExperienceDecisionTiming } from "@si/shared";

export function noneDecision(surfaceId: string, now: number): ExperienceDecision {
  const ttl = 300;
  return {
    id: `none_${surfaceId}`,
    surface_id: surfaceId,
    action: "none",
    message_angle: "none",
    offer_type: "none",
    headline: "",
    body: "",
    cta_label: "",
    target_url_hint: "",
    timing: "immediate",
    friction: "low",
    priority: 0,
    confidence: 0,
    reason: ["no_matching_decision_for_surface"],
    evidence: [],
    ttl_seconds: ttl,
    expires_at: now + ttl * 1000,
    privacy_scope: "session_only",
    visitor_status: "anonymous",
  };
}

export function suppressSlotDecision(
  surfaceId: string,
  reason: string,
  now: number,
): ExperienceDecision {
  const ttl = 600;
  return {
    id: `sup_${surfaceId}`,
    surface_id: surfaceId,
    action: "suppress",
    message_angle: "none",
    offer_type: "none",
    headline: "",
    body: "",
    cta_label: "",
    target_url_hint: "",
    timing: "immediate" as ExperienceDecisionTiming,
    friction: "low",
    priority: 0,
    confidence: 0,
    reason: [reason],
    evidence: [],
    suppression_reason: reason,
    ttl_seconds: ttl,
    expires_at: now + ttl * 1000,
    privacy_scope: "session_only",
    visitor_status: "anonymous",
  };
}
