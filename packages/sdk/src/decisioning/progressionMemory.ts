import type {
  ExperienceDecision,
  ExperienceDecisionFamily,
  ExperienceProgressionMemory,
  ExperienceRecipe,
} from "@si/shared";

const MODAL_COOLDOWN_MS = 5 * 60 * 1000;
const MODAL_COOLDOWN_NAV = 3;
const SURFACE_REPEAT_WINDOW = 3;
const HIGH_INTENT_MIN_STAGE = 2;

export function emptyExperienceProgressionMemory(): ExperienceProgressionMemory {
  return {
    recent_surfaces_shown: [],
    recent_recipe_ids: [],
    recent_decision_families: [],
    suppression_history: [],
    escalation_stage: 0,
    last_decision_emit_at: null,
    navigation_tick: 0,
    last_path_seen: "",
    last_emit_navigation_tick: null,
    last_modal_emit_at: null,
    last_modal_emit_navigation_tick: null,
    last_recorded_primary_surface: null,
  };
}

export function mergeExperienceProgressionMemory(
  base: ExperienceProgressionMemory,
  partial?: Partial<ExperienceProgressionMemory>,
): ExperienceProgressionMemory {
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    recent_surfaces_shown:
      partial.recent_surfaces_shown !== undefined
        ? [...partial.recent_surfaces_shown]
        : [...base.recent_surfaces_shown],
    recent_recipe_ids:
      partial.recent_recipe_ids !== undefined ? [...partial.recent_recipe_ids] : [...base.recent_recipe_ids],
    recent_decision_families:
      partial.recent_decision_families !== undefined
        ? [...partial.recent_decision_families]
        : [...base.recent_decision_families],
    suppression_history:
      partial.suppression_history !== undefined
        ? [...partial.suppression_history]
        : [...base.suppression_history],
  };
}

function isModalishDecision(d: ExperienceDecision): boolean {
  const t = `${d.surface_type ?? ""} ${d.surface_id}`.toLowerCase();
  return t.includes("modal") || t.includes("popup") || t.includes("overlay");
}

/** Infer family when pack JSON omits `decision_family`. */
export function inferDecisionFamily(recipe: ExperienceRecipe | undefined): ExperienceDecisionFamily {
  if (!recipe) return "unknown";
  if (recipe.decision_family) return recipe.decision_family;
  const id = recipe.id.toLowerCase();
  if (id.includes("walkthrough") || id.includes("workshop_offer") || id.includes("flash") || id.includes("urgency")) {
    return "high_intent_escalation";
  }
  if (id.includes("pricing_secondary") || id.includes("roi") || id.includes("fee_explainer")) return "evaluation_support";
  if (id.includes("comparison") || id.includes("card_shopping") || id.includes("integration")) return "comparison_support";
  if (id.includes("trust") || id.includes("stakeholder") || id.includes("adoption")) return "trust_building";
  if (id.includes("workspace") || id.includes("readiness_assessment")) return "commercial_readiness";
  if (id.includes("newsletter") || id.includes("signup")) return "soft_conversion";
  if (id.includes("implementation") || id.includes("education") || id.includes("checklist") || id.includes("timeline")) {
    return "implementation_guidance";
  }
  return "unknown";
}

export function progressionGateDecision(args: {
  decision: ExperienceDecision;
  recipe: ExperienceRecipe | undefined;
  progression: ExperienceProgressionMemory | undefined;
  now: number;
}): { ok: true } | { ok: false; reason: string } {
  const { decision, recipe, progression, now } = args;
  if (!progression) return { ok: true };
  const family = inferDecisionFamily(recipe);

  if (family === "high_intent_escalation" && progression.escalation_stage < HIGH_INTENT_MIN_STAGE) {
    return { ok: false, reason: "progression_escalation_gate" };
  }

  const tailSurfaces = progression.recent_surfaces_shown.slice(-SURFACE_REPEAT_WINDOW);
  if (tailSurfaces.includes(decision.surface_id)) {
    return { ok: false, reason: "progression_surface_cooldown" };
  }

  if (
    family !== "unknown" &&
    progression.last_emit_navigation_tick === progression.navigation_tick &&
    progression.recent_decision_families.length > 0 &&
    progression.recent_decision_families[progression.recent_decision_families.length - 1] === family
  ) {
    return { ok: false, reason: "progression_family_same_navigation_repeat" };
  }

  if (isModalishDecision(decision)) {
    const lastNav = progression.last_modal_emit_navigation_tick;
    const navDelta = lastNav == null ? MODAL_COOLDOWN_NAV : progression.navigation_tick - lastNav;
    const timeSince =
      progression.last_modal_emit_at == null ? MODAL_COOLDOWN_MS : now - progression.last_modal_emit_at;
    if (progression.last_modal_emit_at != null && (timeSince < MODAL_COOLDOWN_MS || navDelta < MODAL_COOLDOWN_NAV)) {
      return { ok: false, reason: "progression_modal_cooldown" };
    }
  }

  return { ok: true };
}

function pushCapped<T>(arr: T[], item: T, max: number): void {
  arr.push(item);
  while (arr.length > max) arr.shift();
}

export function recordProgressionAfterPrimary(
  progression: ExperienceProgressionMemory,
  primary: ExperienceDecision,
  recipe: ExperienceRecipe | undefined,
  now: number,
): void {
  const sameSurfaceSameNavTick =
    progression.last_recorded_primary_surface === primary.surface_id &&
    progression.last_emit_navigation_tick === progression.navigation_tick;
  if (sameSurfaceSameNavTick) return;

  progression.last_recorded_primary_surface = primary.surface_id;
  const family = inferDecisionFamily(recipe);
  pushCapped(progression.recent_surfaces_shown, primary.surface_id, 8);
  if (primary.source_recipe_id) pushCapped(progression.recent_recipe_ids, primary.source_recipe_id, 8);
  pushCapped(progression.recent_decision_families, family, 8);
  pushCapped(progression.suppression_history, `emitted:${primary.surface_id}`, 24);

  progression.last_decision_emit_at = now;
  progression.last_emit_navigation_tick = progression.navigation_tick;

  if (isModalishDecision(primary)) {
    progression.last_modal_emit_at = now;
    progression.last_modal_emit_navigation_tick = progression.navigation_tick;
  }

  if (
    family === "implementation_guidance" ||
    family === "evaluation_support" ||
    family === "comparison_support" ||
    family === "trust_building" ||
    family === "commercial_readiness"
  ) {
    progression.escalation_stage = Math.min(4, progression.escalation_stage + 1);
  }
  if (family === "high_intent_escalation") {
    progression.escalation_stage = Math.max(progression.escalation_stage, 3);
  }
}

export function bumpNavigationTickIfPathChanged(
  progression: ExperienceProgressionMemory,
  path: string,
): void {
  if (!path || path === progression.last_path_seen) return;
  progression.last_path_seen = path;
  progression.navigation_tick += 1;
}
