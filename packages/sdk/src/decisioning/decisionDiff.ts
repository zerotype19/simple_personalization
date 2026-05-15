import type {
  ExperienceDecision,
  ExperienceDecisionEnvelope,
  ExperienceDecisionFamily,
  ExperienceProgressionMemory,
  SiteVertical,
} from "@si/shared";
import { getExperienceRecipesForVertical } from "@si/shared/experiencePacks";
import { inferDecisionFamily } from "./progressionMemory";

function approxEq(a: number, b: number, eps: number): boolean {
  return Math.abs(a - b) < eps;
}

/** Meaningful change for subscribers / CustomEvent (not every tick). */
export function experienceDecisionMeaningfullyChanged(
  prev: ExperienceDecisionEnvelope | null,
  next: ExperienceDecisionEnvelope,
): boolean {
  if (!prev) return true;
  if ((prev.primary_decision == null) !== (next.primary_decision == null)) return true;
  const a = prev.primary_decision;
  const b = next.primary_decision;
  if (a && b) {
    if (a.surface_id !== b.surface_id) return true;
    if (a.action !== b.action) return true;
    if (a.offer_type !== b.offer_type) return true;
    if (a.message_angle !== b.message_angle) return true;
    if (!approxEq(a.confidence, b.confidence, 0.1)) return true;
    if ((a.suppression_reason ?? "") !== (b.suppression_reason ?? "")) return true;
  }
  const ps = prev.suppression_summary ?? "";
  const ns = next.suppression_summary ?? "";
  if (ps !== ns) return true;
  if (prev.secondary_decisions.length !== next.secondary_decisions.length) return true;
  for (let i = 0; i < prev.secondary_decisions.length; i++) {
    const x = prev.secondary_decisions[i]!;
    const y = next.secondary_decisions[i]!;
    if (x.surface_id !== y.surface_id || x.action !== y.action) return true;
  }
  return false;
}

const TIMING_RANK: Record<string, number> = {
  idle: 0,
  next_navigation: 1,
  after_scroll: 2,
  exit_intent: 3,
  immediate: 4,
};

const FRICTION_RANK: Record<string, number> = { low: 0, medium: 1, high: 2 };

function timingRank(t: string): number {
  return TIMING_RANK[t] ?? 0;
}

function frictionRank(f: string): number {
  return FRICTION_RANK[f] ?? 0;
}

function confidenceBand(conf: number): "low" | "medium" | "high" {
  if (conf < 0.55) return "low";
  if (conf < 0.72) return "medium";
  return "high";
}

function decisionFamily(d: ExperienceDecision | null, vertical: SiteVertical): ExperienceDecisionFamily {
  if (!d?.source_recipe_id) return "unknown";
  const recipes = getExperienceRecipesForVertical(vertical);
  const recipe = recipes.find((r) => r.id === d.source_recipe_id);
  return inferDecisionFamily(recipe);
}

export interface ExperienceDecisionDiff {
  surface_changed: boolean;
  offer_changed: boolean;
  message_angle_changed: boolean;
  timing_changed: boolean;
  timing_escalated: boolean;
  timing_relaxed: boolean;
  confidence_band_changed: boolean;
  interruption_level_changed: boolean;
  escalation_stage_delta: number | null;
  family_changed: boolean;
  primary_became_null: boolean;
  primary_emerged: boolean;
}

export function diffExperienceDecision(
  prev: ExperienceDecision | null,
  next: ExperienceDecision | null,
  vertical: SiteVertical,
  progression?: { before?: ExperienceProgressionMemory; after?: ExperienceProgressionMemory },
): ExperienceDecisionDiff {
  const primary_became_null = !!(prev && !next);
  const primary_emerged = !!(!prev && next);
  const surface_changed = (prev?.surface_id ?? null) !== (next?.surface_id ?? null);
  const offer_changed = (prev?.offer_type ?? "") !== (next?.offer_type ?? "");
  const message_angle_changed = (prev?.message_angle ?? "") !== (next?.message_angle ?? "");
  const timing_changed = (prev?.timing ?? "") !== (next?.timing ?? "");
  let timing_escalated = false;
  let timing_relaxed = false;
  if (prev && next && timing_changed) {
    timing_escalated = timingRank(next.timing) > timingRank(prev.timing);
    timing_relaxed = timingRank(next.timing) < timingRank(prev.timing);
  }
  let confidence_band_changed = false;
  if (prev && next) {
    confidence_band_changed = confidenceBand(prev.confidence) !== confidenceBand(next.confidence);
  } else if (primary_emerged || primary_became_null) {
    confidence_band_changed = true;
  }
  let interruption_level_changed = false;
  if (prev && next) {
    interruption_level_changed = frictionRank(next.friction) !== frictionRank(prev.friction);
  } else if (primary_emerged || primary_became_null) {
    interruption_level_changed = true;
  }
  let escalation_stage_delta: number | null = null;
  if (progression?.before && progression?.after) {
    escalation_stage_delta = progression.after.escalation_stage - progression.before.escalation_stage;
  }
  const family_changed = decisionFamily(prev, vertical) !== decisionFamily(next, vertical);
  return {
    surface_changed,
    offer_changed,
    message_angle_changed,
    timing_changed,
    timing_escalated,
    timing_relaxed,
    confidence_band_changed,
    interruption_level_changed,
    escalation_stage_delta,
    family_changed,
    primary_became_null,
    primary_emerged,
  };
}
