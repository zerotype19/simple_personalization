import type {
  ExperienceDecision,
  ExperienceDecisionEnvelope,
  ExperienceProgressionMemory,
  SessionProfile,
} from "@si/shared";
import {
  runExperienceDecisionPipeline,
  type ExperienceDecisionFrameDiagnostics,
} from "./experienceDecisionPipeline";

export type { ExperienceDecisionFrameDiagnostics };

export interface ExperienceDecisionContext {
  now: number;
  /** When true, envelope stays decision-free (trust / staging). */
  observeOnly?: boolean;
  /** Reserved for future frequency caps (session-local). */
  emittedKeys?: Set<string>;
  /** Session-scoped progression memory (optional). */
  progression?: ExperienceProgressionMemory;
  /** When true with `progression`, updates memory after a non-null primary is chosen. */
  recordProgression?: boolean;
}

export function buildExperienceDecisionEnvelope(
  profile: SessionProfile,
  ctx: ExperienceDecisionContext,
): { envelope: ExperienceDecisionEnvelope; slotDecisions: Record<string, ExperienceDecision> } {
  const { envelope, slotDecisions } = runExperienceDecisionPipeline(profile, ctx, false);
  return { envelope, slotDecisions };
}

/** Full diagnostics for replay / inspector (same engine path as {@link buildExperienceDecisionEnvelope}). */
export function buildExperienceDecisionEnvelopeWithDiagnostics(
  profile: SessionProfile,
  ctx: ExperienceDecisionContext,
): {
  envelope: ExperienceDecisionEnvelope;
  slotDecisions: Record<string, ExperienceDecision>;
  diagnostics: ExperienceDecisionFrameDiagnostics;
} {
  const { envelope, slotDecisions, diagnostics } = runExperienceDecisionPipeline(profile, ctx, true);
  return { envelope, slotDecisions, diagnostics: diagnostics! };
}
