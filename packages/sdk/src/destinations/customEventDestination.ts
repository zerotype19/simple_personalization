import type { ExperienceDecisionEnvelope } from "@si/shared";

export function dispatchExperienceDecisionCustomEvent(envelope: ExperienceDecisionEnvelope): void {
  try {
    window.dispatchEvent(new CustomEvent("si:experience-decision", { detail: structuredClone(envelope) }));
  } catch {
    /* ignore */
  }
}
