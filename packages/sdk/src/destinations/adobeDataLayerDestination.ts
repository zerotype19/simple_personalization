import type { ExperienceDecisionEnvelope } from "@si/shared";
import { experienceDecisionToDataLayerPayload } from "./destinationTypes";

export function pushExperienceDecisionToAdobeDataLayer(envelope: ExperienceDecisionEnvelope): void {
  const w = window as unknown as { adobeDataLayer?: unknown[] };
  w.adobeDataLayer = w.adobeDataLayer || [];
  w.adobeDataLayer.push(experienceDecisionToDataLayerPayload(envelope));
}
