import type { ExperienceDecision, ExperienceProgressionMemory, SessionProfile } from "@si/shared";
import { diffExperienceDecision } from "../decisionDiff";
import type { DecisionTransitionReason } from "./types";

function readiness(p: SessionProfile): number {
  const sig = p.personalization_signal;
  return (
    sig.activation_readiness_score ??
    sig.conversion_readiness ??
    p.behavior_snapshot?.activation_readiness.score_0_100 ??
    0
  );
}

export function inferDecisionTransitionReasons(args: {
  prevProfile: SessionProfile | null;
  nextProfile: SessionProfile;
  prevPrimary: ExperienceDecision | null;
  nextPrimary: ExperienceDecision | null;
  prevProgression: ExperienceProgressionMemory | null;
  nextProgression: ExperienceProgressionMemory;
  /** Holdback / suppression reasons after the `next` evaluation (matches replay diagnostics). */
  holdbackReasonsNext?: string[];
}): DecisionTransitionReason[] {
  const reasons: DecisionTransitionReason[] = [];
  const vertical = args.nextProfile.site_context.vertical;

  if (!args.prevProfile) {
    reasons.push("first_frame");
    return reasons;
  }

  const pr = readiness(args.prevProfile);
  const nr = readiness(args.nextProfile);
  if (nr >= 55 && pr < 55) reasons.push("readiness_crossed_threshold");

  const pPhase =
    args.prevProfile.commercial_journey_phase ?? args.prevProfile.behavior_snapshot?.commercial_journey_phase;
  const nPhase =
    args.nextProfile.commercial_journey_phase ?? args.nextProfile.behavior_snapshot?.commercial_journey_phase;
  if (pPhase !== nPhase) reasons.push("commercial_phase_advanced");

  if (args.nextProfile.engagement_score > args.prevProfile.engagement_score + 5) reasons.push("engagement_increased");

  if (args.nextProfile.signals.cta_clicks > args.prevProfile.signals.cta_clicks) {
    reasons.push("cta_engagement_increased");
  }
  if (args.nextProfile.signals.pricing_views > args.prevProfile.signals.pricing_views) {
    reasons.push("pricing_signal_added");
  }

  const prevComp = args.prevProfile.behavior_snapshot?.navigation.comparison_behavior === true;
  const nextComp = args.nextProfile.behavior_snapshot?.navigation.comparison_behavior === true;
  if (nextComp && !prevComp) reasons.push("comparison_behavior_detected");

  const diff = diffExperienceDecision(args.prevPrimary, args.nextPrimary, vertical, {
    before: args.prevProgression ?? undefined,
    after: args.nextProgression,
  });

  if (diff.timing_escalated) reasons.push("timing_escalated");
  if (diff.timing_relaxed) reasons.push("timing_relaxed");
  if (diff.family_changed) reasons.push("decision_family_rotated");
  if (diff.surface_changed && !diff.family_changed) reasons.push("surface_changed_same_family");
  if (diff.offer_changed || diff.message_angle_changed) reasons.push("offer_angle_changed");
  if (diff.escalation_stage_delta != null && diff.escalation_stage_delta > 0) {
    reasons.push("escalation_stage_increased");
  }

  const holdbacks = args.holdbackReasonsNext ?? [];
  if (!args.nextPrimary) {
    const blob = holdbacks.join(" ").toLowerCase();
    if (blob.includes("below_global") || blob.includes("below_surface")) {
      reasons.push("suppression_due_to_low_confidence");
    }
    if (blob.includes("progression_gate") || blob.includes("progression_escalation")) {
      reasons.push("progression_gate_blocked");
    }
    if (
      blob.includes("progression_surface_cooldown") ||
      blob.includes("progression_family_same_navigation") ||
      blob.includes("progression_modal_cooldown")
    ) {
      reasons.push("progression_cooldown_active");
    }
    if (blob.includes("cooldown")) reasons.push("cooldown_active");
  }

  if (!args.nextPrimary && !args.prevPrimary) {
    reasons.push("no_decision_maintained");
  }

  if (
    args.prevPrimary &&
    args.nextPrimary &&
    args.prevPrimary.surface_id === args.nextPrimary.surface_id &&
    reasons.length === 0
  ) {
    reasons.push("no_decision_maintained");
  }

  return reasons.length ? reasons : ["no_decision_maintained"];
}
