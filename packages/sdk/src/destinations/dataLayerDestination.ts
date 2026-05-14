import type { ExperienceDecisionEnvelope } from "@si/shared";
import { experienceDecisionToDataLayerPayload } from "./destinationTypes";

export function pushExperienceDecisionToDataLayer(envelope: ExperienceDecisionEnvelope): void {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push(experienceDecisionToDataLayerPayload(envelope));
}
