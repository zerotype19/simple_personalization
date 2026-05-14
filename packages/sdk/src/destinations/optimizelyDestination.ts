import type { ExperienceDecisionEnvelope } from "@si/shared";
import { experienceDecisionToDataLayerPayload } from "./destinationTypes";

export function pushExperienceDecisionToOptimizely(envelope: ExperienceDecisionEnvelope): void {
  const payload = experienceDecisionToDataLayerPayload(envelope);
  const w = window as unknown as { optimizely?: unknown[] };
  w.optimizely = w.optimizely || [];
  (w.optimizely as unknown[]).push({
    type: "event",
    eventName: payload.event,
    tags: payload,
  });
}
