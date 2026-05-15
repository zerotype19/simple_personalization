import type { ExperienceDecisionEnvelope } from "@si/shared";
import type { DecisionTransitionReason } from "../decisioning/replay/types";

export interface DecisionTransitionEventDetail {
  event: "si:decision-transition";
  previous_envelope: ExperienceDecisionEnvelope | null;
  next_envelope: ExperienceDecisionEnvelope;
  transition_reasons: DecisionTransitionReason[];
  progression_stage: number | null;
  primary_timing_from: string | null;
  primary_timing_to: string | null;
  primary_confidence_from: number | null;
  primary_confidence_to: number | null;
}

export interface DecisionSuppressedEventDetail {
  event: "si:decision-suppressed";
  envelope: ExperienceDecisionEnvelope;
  had_primary_before: boolean;
  suppression_summary?: string;
}

export interface DecisionReplayedEventDetail {
  event: "si:decision-replayed";
  frame_count: number;
  transition_count: number;
}

export function dispatchSiDecisionTransition(detail: Omit<DecisionTransitionEventDetail, "event">): void {
  try {
    const full: DecisionTransitionEventDetail = { event: "si:decision-transition", ...detail };
    window.dispatchEvent(new CustomEvent("si:decision-transition", { detail: structuredClone(full) }));
  } catch {
    /* ignore */
  }
}

export function dispatchSiDecisionSuppressed(detail: Omit<DecisionSuppressedEventDetail, "event">): void {
  try {
    const full: DecisionSuppressedEventDetail = { event: "si:decision-suppressed", ...detail };
    window.dispatchEvent(new CustomEvent("si:decision-suppressed", { detail: structuredClone(full) }));
  } catch {
    /* ignore */
  }
}

export function dispatchSiDecisionReplayed(detail: Omit<DecisionReplayedEventDetail, "event">): void {
  try {
    const full: DecisionReplayedEventDetail = { event: "si:decision-replayed", ...detail };
    window.dispatchEvent(new CustomEvent("si:decision-replayed", { detail: structuredClone(full) }));
  } catch {
    /* ignore */
  }
}
