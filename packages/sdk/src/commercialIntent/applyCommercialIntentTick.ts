import type { SessionProfile } from "@si/shared";
import { classifyPageRole } from "./classifyPageRole";
import { inferCommercialBlockers } from "./inferCommercialBlockers";
import { inferJourneyMomentum } from "./inferJourneyMomentum";
import { emptyCommercialIntentMemory } from "./updateCommercialIntentMemory";

/** Refresh page-role / blocker / momentum reads each runtime tick (no new click required). */
export function applyCommercialIntentTick(profile: SessionProfile): void {
  const base = profile.commercial_intent ?? emptyCommercialIntentMemory();
  const pageRole = classifyPageRole(profile);
  if (pageRole.blocker_categories.length) {
    const validated = new Set(base.validated_topics);
    for (const b of pageRole.blocker_categories) validated.add(b);
    base.validated_topics = [...validated].slice(-16);
  }
  const blockers = inferCommercialBlockers(profile, base).blockers;
  const momentum = inferJourneyMomentum(profile, { ...base, blockers });
  profile.commercial_intent = { ...base, blockers, momentum };
}
