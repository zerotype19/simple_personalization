import type { BehaviorSnapshot, SessionProfile } from "@si/shared";
import { createBlankSignals, defaultSiteContext } from "../../session";
import { emptySiteEnvironmentSnapshot } from "../../siteEnvironment";
import {
  emptyActivationOpportunity,
  emptyPersonalizationSignal,
} from "../../siteSemantics/defaults";
import { buildPersonalizationSignal } from "../../siteSemantics/activationPayload";
import { minimalProfile } from "../../test/fixtures";
import { deepMerge } from "./deepMerge";
import minBehaviorPreset from "./presets/min-behavior.json";
import type { FixtureSessionInput } from "./types";

const MIN_BEHAVIOR = minBehaviorPreset as unknown as BehaviorSnapshot;

export function buildFixtureProfile(input: FixtureSessionInput): SessionProfile {
  const vertical = input.vertical;
  const baseScan = defaultSiteContext().scan;
  const site_context: SessionProfile["site_context"] = {
    ...defaultSiteContext(),
    ...input.site_context,
    vertical,
    vertical_confidence: input.site_context?.vertical_confidence ?? 92,
    scan: { ...baseScan, ...(input.site_context?.scan ?? {}) },
  };
  const site_environment = deepMerge(
    emptySiteEnvironmentSnapshot() as unknown as Record<string, unknown>,
    (input.site_environment ?? {}) as Record<string, unknown>,
  ) as unknown as SessionProfile["site_environment"];

  const behaviorSnapshot: BehaviorSnapshot | null =
    input.behavior_snapshot === undefined
      ? structuredClone(MIN_BEHAVIOR)
      : input.behavior_snapshot === null
        ? null
        : (deepMerge(
            structuredClone(MIN_BEHAVIOR) as unknown as Record<string, unknown>,
            input.behavior_snapshot as unknown as Record<string, unknown>,
          ) as unknown as BehaviorSnapshot);

  const activation_opportunity = {
    ...emptyActivationOpportunity(),
    ...input.activation_opportunity,
  };

  const profile = minimalProfile({
    site_context,
    site_environment,
    behavior_snapshot: behaviorSnapshot,
    activation_opportunity,
    concept_affinity: input.concept_affinity ?? {},
    concept_evidence: input.concept_evidence ?? {},
    signals: { ...createBlankSignals(), ...(input.signals ?? {}) },
    engagement_score: input.engagement_score ?? 0,
    intent_score: input.intent_score ?? 0,
    urgency_score: input.urgency_score ?? 0,
    journey_stage: input.journey_stage ?? "discovery",
    commercial_journey_phase: input.commercial_journey_phase,
    next_best_action: input.recommendation ?? null,
    page_type: input.page_type ?? "other",
    personalization_signal: emptyPersonalizationSignal(),
  });

  profile.personalization_signal = buildPersonalizationSignal(profile);
  return profile;
}
