import type { ExperienceDecision, ExperienceDecisionEnvelope } from "@si/shared";

function approxEq(a: number, b: number, eps: number): boolean {
  return Math.abs(a - b) < eps;
}

/** Meaningful change for subscribers / CustomEvent (not every tick). */
export function experienceDecisionMeaningfullyChanged(
  prev: ExperienceDecisionEnvelope | null,
  next: ExperienceDecisionEnvelope,
): boolean {
  if (!prev) return true;
  if ((prev.primary_decision == null) !== (next.primary_decision == null)) return true;
  const a = prev.primary_decision;
  const b = next.primary_decision;
  if (a && b) {
    if (a.surface_id !== b.surface_id) return true;
    if (a.action !== b.action) return true;
    if (a.offer_type !== b.offer_type) return true;
    if (a.message_angle !== b.message_angle) return true;
    if (!approxEq(a.confidence, b.confidence, 0.1)) return true;
    if ((a.suppression_reason ?? "") !== (b.suppression_reason ?? "")) return true;
  }
  const ps = prev.suppression_summary ?? "";
  const ns = next.suppression_summary ?? "";
  if (ps !== ns) return true;
  if (prev.secondary_decisions.length !== next.secondary_decisions.length) return true;
  for (let i = 0; i < prev.secondary_decisions.length; i++) {
    const x = prev.secondary_decisions[i]!;
    const y = next.secondary_decisions[i]!;
    if (x.surface_id !== y.surface_id || x.action !== y.action) return true;
  }
  return false;
}
