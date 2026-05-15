import type {
  ExperienceDecision,
  ExperienceDecisionEnvelope,
  ExperienceProgressionMemory,
  SessionProfile,
} from "@si/shared";
import type { ExperienceDecisionFrameDiagnostics } from "../experienceDecisionPipeline";

/** Structured reason codes for transition rows (replay + CustomEvent payloads). */
export type DecisionTransitionReason =
  | "first_frame"
  | "readiness_crossed_threshold"
  | "commercial_phase_advanced"
  | "engagement_increased"
  | "cta_engagement_increased"
  | "pricing_signal_added"
  | "comparison_behavior_detected"
  | "decision_family_rotated"
  | "surface_changed_same_family"
  | "timing_escalated"
  | "timing_relaxed"
  | "offer_angle_changed"
  | "escalation_stage_increased"
  | "suppression_due_to_low_confidence"
  | "progression_gate_blocked"
  | "progression_cooldown_active"
  | "cooldown_active"
  | "no_decision_maintained";

export interface ReplayFrameResult {
  index: number;
  generated_at: number;
  envelope: ExperienceDecisionEnvelope;
  diagnostics: ExperienceDecisionFrameDiagnostics;
  progression_memory: ExperienceProgressionMemory;
  path_replay_tick: string;
}

export interface DecisionTransition {
  from_index: number;
  to_index: number;
  reasons: DecisionTransitionReason[];
  primary_surface_from: string | null;
  primary_surface_to: string | null;
  suppression_delta: "gained" | "lost" | "unchanged";
  timing_from: string | null;
  timing_to: string | null;
}

export interface ReplayResult {
  frames: ReplayFrameResult[];
  transitions: DecisionTransition[];
  progression_summary: string;
  suppression_summary: string;
  timing_summary: string;
}

export interface ReplayOptions {
  baseNow?: number;
  observeOnly?: boolean;
  carryProgression?: boolean;
}
