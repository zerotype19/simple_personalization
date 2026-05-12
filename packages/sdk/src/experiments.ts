import type {
  ExperimentAssignment,
  ExperimentDefinition,
  SessionProfile,
} from "@si/shared";
import { buildRuleContext, evaluateExpression } from "./rules";

function hash32(str: string): number {
  // Deterministic 32-bit string hash for variant bucketing (unsigned).
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function assignExperiments(
  experiments: ExperimentDefinition[],
  profile: SessionProfile,
): ExperimentAssignment | null {
  const running = experiments.filter((e) => e.status === "running");
  if (!running.length) return null;
  if (profile.experiment_assignment) {
    // Re-validate the existing assignment still references a known experiment.
    const exp = running.find((e) => e.id === profile.experiment_assignment!.experiment_id);
    if (exp) return profile.experiment_assignment;
  }

  const ctx = buildRuleContext(profile);
  for (const exp of running) {
    if (exp.audience_when && !evaluateExpression(exp.audience_when, ctx)) continue;
    const variant = pickVariant(exp, profile.session_id);
    if (!variant) continue;
    return {
      experiment_id: exp.id,
      variant_id: variant.id,
      treatment_id: variant.treatment_id,
      is_control: variant.treatment_id === null || /control/i.test(variant.name),
    };
  }
  return null;
}

function pickVariant(exp: ExperimentDefinition, seed: string) {
  const pos = exp.variants.filter((v) => v.weight > 0);
  if (!pos.length) return null;
  const total = pos.reduce((a, v) => a + v.weight, 0);
  /** Integer bucket in [0, total) — avoids floating edge cases at variant boundaries. */
  let bucket = Math.abs(hash32(`${exp.id}:${seed}`)) % total;
  for (const v of pos) {
    if (bucket < v.weight) return v;
    bucket -= v.weight;
  }
  return pos[pos.length - 1];
}
