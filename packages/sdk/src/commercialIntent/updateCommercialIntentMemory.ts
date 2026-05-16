import type {
  CommercialActionInterpretation,
  CommercialIntentMemory,
  CommercialStage,
  CtaElementInterpretation,
  SessionProfile,
} from "@si/shared";
import { inferCommercialBlockers } from "./inferCommercialBlockers";
import { inferJourneyMomentum } from "./inferJourneyMomentum";

const HUMAN_ESCALATION_FAMILIES = new Set([
  "schedule_demo",
  "schedule_test_drive",
  "talk_to_sales",
  "book_appointment",
  "contact_dealer",
]);

const QUALIFICATION_FAMILIES = new Set([
  "calculate",
  "check_eligibility",
  "view_financing",
  "configure",
]);

const TRUST_FAMILIES = new Set(["view_security", "view_returns", "view_faq", "read_reviews"]);

export function emptyCommercialIntentMemory(): CommercialIntentMemory {
  return {
    action_counts: {},
    strongest_action_family: null,
    stage_sequence: [],
    blockers: [],
    momentum: {
      direction: "stable",
      confidence: 0.4,
      evidence: [],
      stage_sequence: [],
    },
    last_interaction_label: null,
    high_intent_interactions: 0,
    human_escalation_interactions: 0,
    qualification_interactions: 0,
    trust_validation_interactions: 0,
    validated_topics: [],
  };
}

function pushStage(seq: CommercialStage[], stage: CommercialStage): CommercialStage[] {
  const out = [...seq];
  if (out[out.length - 1] !== stage) out.push(stage);
  return out.slice(-12);
}

function rankAction(a: CommercialActionInterpretation): number {
  const strength = { passive: 0, low: 1, medium: 2, high: 3, very_high: 4 }[a.intent_strength] ?? 0;
  return strength * 10 + a.confidence * 5;
}

export function updateCommercialIntentMemory(
  profile: SessionProfile,
  interaction: CtaElementInterpretation | { action: CommercialActionInterpretation; timeline_label: string },
): CommercialIntentMemory {
  const prev = profile.commercial_intent ?? emptyCommercialIntentMemory();
  const action = interaction.action;
  const counts = { ...prev.action_counts };
  counts[action.action_family] = (counts[action.action_family] ?? 0) + 1;

  const prevStrongest = prev.strongest_action_family
    ? ({ action_family: prev.strongest_action_family } as CommercialActionInterpretation)
    : null;
  const strongest =
    !prevStrongest || rankAction(action) >= rankAction({ ...action, ...prevStrongest })
      ? action.action_family
      : prev.strongest_action_family;

  const stage_sequence = pushStage(prev.stage_sequence, action.commercial_stage);

  let high_intent_interactions = prev.high_intent_interactions;
  let human_escalation_interactions = prev.human_escalation_interactions;
  let qualification_interactions = prev.qualification_interactions;
  let trust_validation_interactions = prev.trust_validation_interactions;

  if ("should_count_as_high_intent" in interaction && interaction.should_count_as_high_intent) {
    high_intent_interactions++;
  } else if (action.intent_strength === "high" || action.intent_strength === "very_high") {
    high_intent_interactions++;
  }

  if (HUMAN_ESCALATION_FAMILIES.has(action.action_family)) human_escalation_interactions++;
  if (QUALIFICATION_FAMILIES.has(action.action_family)) qualification_interactions++;
  if (TRUST_FAMILIES.has(action.action_family)) trust_validation_interactions++;

  const validated_topics = [...prev.validated_topics];
  if (action.blocker_category && !validated_topics.includes(action.blocker_category)) {
    validated_topics.push(action.blocker_category);
  }

  const draft: CommercialIntentMemory = {
    ...prev,
    action_counts: counts,
    strongest_action_family: strongest,
    stage_sequence,
    high_intent_interactions,
    human_escalation_interactions,
    qualification_interactions,
    trust_validation_interactions,
    validated_topics: validated_topics.slice(-16),
    last_interaction_label: interaction.timeline_label,
  };

  const blockers = inferCommercialBlockers(profile, draft).blockers;
  const momentum = inferJourneyMomentum(profile, { ...draft, blockers }, action);

  return {
    ...draft,
    blockers,
    momentum,
  };
}
