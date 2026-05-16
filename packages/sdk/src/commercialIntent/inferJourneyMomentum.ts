import type {
  CommercialActionInterpretation,
  CommercialIntentMemory,
  CommercialMomentum,
  CommercialStage,
  SessionProfile,
} from "@si/shared";

const STAGE_RANK: Record<CommercialStage, number> = {
  awareness: 0,
  exploration: 1,
  evaluation: 2,
  comparison: 3,
  qualification: 4,
  objection_resolution: 4,
  commitment: 5,
  human_escalation: 6,
};

const TRUST_STAGES: CommercialStage[] = ["objection_resolution"];
const EDUCATION_PATH =
  /\b(blog|article|glossary|news|insights|resources|learn|guide|whitepaper)\b/i;

export function inferJourneyMomentum(
  profile: SessionProfile,
  memory: CommercialIntentMemory | null | undefined,
  latestAction?: CommercialActionInterpretation | null,
): CommercialMomentum {
  const stages = memory?.stage_sequence ?? [];
  const evidence: string[] = [];
  let direction: CommercialMomentum["direction"] = "stable";

  if (stages.length >= 2) {
    const a = STAGE_RANK[stages[stages.length - 2]!] ?? 0;
    const b = STAGE_RANK[stages[stages.length - 1]!] ?? 0;
    if (b > a) {
      direction = "increasing";
      evidence.push("commercial_stage_advanced");
    } else if (b < a) {
      direction = "regressing";
      evidence.push("commercial_stage_regressed");
    }
  }

  const paths = profile.signals.path_sequence.slice(-5);
  const trustHits = paths.filter((p) =>
    /security|privacy|review|return|shipping|warranty|faq|compliance/i.test(p),
  ).length;
  const eduHits = paths.filter((p) => EDUCATION_PATH.test(p)).length;
  const commercialHits = paths.filter((p) =>
    /pricing|compare|checkout|apply|finance|calculator|schedule|demo|cart/i.test(p),
  ).length;

  if (trustHits >= 2 && commercialHits >= 1) {
    direction = "validating";
    evidence.push("trust_validation_loop");
  } else if (eduHits >= 3 && (memory?.high_intent_interactions ?? 0) === 0) {
    direction = "stable";
    evidence.push("research_curiosity_path");
  }

  if (latestAction) {
    if (latestAction.intent_strength === "very_high" || latestAction.intent_strength === "high") {
      direction = "increasing";
      evidence.push("high_intent_action");
    }
    if (TRUST_STAGES.includes(latestAction.commercial_stage)) {
      direction = direction === "increasing" ? "validating" : "validating";
      evidence.push("trust_or_objection_action");
    }
  }

  if ((memory?.blockers.length ?? 0) >= 2 && direction === "increasing") {
    direction = "hesitating";
    evidence.push("active_blockers");
  }

  const confidence = Math.min(0.9, 0.45 + evidence.length * 0.12);

  return {
    direction,
    confidence,
    evidence,
    latest_stage: stages[stages.length - 1],
    prior_stage: stages.length >= 2 ? stages[stages.length - 2] : undefined,
    stage_sequence: [...stages],
  };
}
