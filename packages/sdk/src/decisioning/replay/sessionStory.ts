import type { ReplayResult } from "./types";

const REASON_VERBAGE: Partial<Record<string, string>> = {
  first_frame: "Session snapshot baseline.",
  readiness_crossed_threshold: "Activation readiness crossed a planning threshold; interruption became more appropriate.",
  commercial_phase_advanced: "Commercial journey phase advanced.",
  engagement_increased: "Engagement depth increased.",
  cta_engagement_increased: "CTA engagement increased.",
  pricing_signal_added: "Pricing-adjacent navigation appeared.",
  comparison_behavior_detected: "Comparison-oriented behavior showed up.",
  decision_family_rotated: "Decision family rotated (e.g., from education toward evaluation support).",
  surface_changed_same_family: "Surface changed within the same decision family.",
  timing_escalated: "Timing became more assertive (e.g., earlier interrupt eligibility).",
  timing_relaxed: "Timing relaxed versus the prior frame.",
  offer_angle_changed: "Offer angle or copy posture changed.",
  escalation_stage_increased: "Progression escalation stage increased after an emitted primary.",
  suppression_due_to_low_confidence: "Suppression: confidence or surface floor blocked show.",
  progression_gate_blocked: "Progression gate blocked a harder escalation.",
  progression_cooldown_active: "Cooldown / repeat-surface pacing held back repetition.",
  cooldown_active: "A cooldown rule was active.",
  no_decision_maintained: "Runtime kept restraint—no new primary or same primary sustained intentionally.",
};

function phraseReason(code: string): string {
  return REASON_VERBAGE[code] ?? code.replace(/_/g, " ");
}

/**
 * Short operator-facing narrative from a replay (deterministic templates, not LLM copy).
 */
export function buildOperatorSessionStory(replay: ReplayResult): string {
  if (!replay.frames.length) return "No frames in replay.";
  const lines: string[] = [];
  lines.push(
    `Replay covers ${replay.frames.length} engine ticks. ${replay.progression_summary} Timing trace: ${replay.timing_summary}.`,
  );
  if (replay.suppression_summary && !replay.suppression_summary.startsWith("No full suppression")) {
    lines.push(`Suppression notes: ${replay.suppression_summary}`);
  }
  for (const t of replay.transitions) {
    const r = t.reasons.map(phraseReason).join(" ");
    const surf = `${t.primary_surface_from ?? "—"} → ${t.primary_surface_to ?? "—"}`;
    lines.push(`Step ${t.from_index}→${t.to_index}: ${surf}. Transitions: ${r} (suppression ${t.suppression_delta}).`);
  }
  lines.push(
    "Restraint is intentional when primaries are null or families repeat—verify against fixtures before treating as noise.",
  );
  return lines.join(" ");
}
