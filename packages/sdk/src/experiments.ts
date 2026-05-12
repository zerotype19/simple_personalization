import type {
  ExperimentAssignment,
  ExperimentDefinition,
  SessionProfile,
} from "@si/shared";
import { buildRuleContext, evaluateExpression } from "./rules";

function hash32(str: string): number {
  // FNV-1a 32-bit — sufficient for deterministic variant bucketing.
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h;
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
  if (!exp.variants.length) return null;
  const total = exp.variants.reduce((a, v) => a + v.weight, 0) || 1;
  const slot = hash32(`${exp.id}:${seed}`) % 10000;
  const target = (slot / 10000) * total;
  let acc = 0;
  for (const v of exp.variants) {
    acc += v.weight;
    if (target < acc) return v;
  }
  return exp.variants[exp.variants.length - 1];
}
