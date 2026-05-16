import type { CommercialBlockerInference, CommercialIntentMemory, SessionProfile } from "@si/shared";
import { COMMERCIAL_BLOCKER_TAXONOMY } from "@si/shared";
import { classifyPageRole } from "./classifyPageRole";
import { normalizeActionText } from "./normalizeActionText";

const STAGE_RANK: Record<string, number> = {
  awareness: 0,
  exploration: 1,
  evaluation: 2,
  comparison: 3,
  qualification: 4,
  objection_resolution: 4,
  commitment: 5,
  human_escalation: 6,
};

export function inferCommercialBlockers(
  profile: SessionProfile,
  memory?: CommercialIntentMemory | null,
): CommercialBlockerInference {
  const pathBlob = normalizeActionText(profile.signals.path_sequence.slice(-6).join(" "));
  const pageRole = classifyPageRole(profile);
  const blockers: CommercialBlockerInference["blockers"] = [];

  for (const b of COMMERCIAL_BLOCKER_TAXONOMY) {
    let score = 0;
    const evidence: string[] = [];
    for (const hint of b.path_hints) {
      if (pathBlob.includes(normalizeActionText(hint))) {
        score += 2;
        evidence.push(`path:${hint}`);
      }
    }
    if (pageRole.blocker_categories.includes(b.id)) {
      score += 2;
      evidence.push("page_role");
    }
    const actionHits = memory?.validated_topics.filter((t) => t === b.id).length ?? 0;
    if (actionHits > 0) {
      score += actionHits;
      evidence.push("prior_validation");
    }
    if (score >= 2) {
      blockers.push({
        id: b.id,
        confidence: Math.min(0.92, 0.4 + score * 0.1),
        evidence: evidence.slice(0, 4),
        suggested_response_family: b.suggested_response_family,
      });
    }
  }

  const stages = memory?.stage_sequence ?? [];
  if (stages.length >= 2) {
    const last = stages[stages.length - 1]!;
    const prev = stages[stages.length - 2]!;
    if ((STAGE_RANK[last] ?? 0) < (STAGE_RANK[prev] ?? 0)) {
      blockers.push({
        id: "human_contact_hesitation",
        confidence: 0.55,
        evidence: ["commercial_stage_regression"],
        suggested_response_family: "soft_human_escalation",
      });
    }
  }

  blockers.sort((a, b) => b.confidence - a.confidence);
  return { blockers: blockers.slice(0, 5) };
}
