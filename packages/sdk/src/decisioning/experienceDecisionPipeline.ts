import type {
  ExperienceDecision,
  ExperienceDecisionEnvelope,
  ExperienceProgressionMemory,
  ExperienceRecipe,
  SessionProfile,
} from "@si/shared";
import {
  getExperienceRecipesForVertical,
  getSurfaceCatalogForVertical,
} from "@si/shared/experiencePacks";
import { polishHeadline } from "./decisionCopy";
import { rankDecisions } from "./decisionRanking";
import { clampTimingForSurface } from "./decisionTiming";
import {
  buildCommercialIntentDecisionReasons,
  rankCandidatesWithCommercialIntent,
  shouldSuppressForCommercialIntent,
} from "./commercialIntentDecisionCoupling";
import { matchRecipeCandidates, type RecipeMatchCandidate } from "./recipeMatcher";
import { shouldSuppressDecision, summarizeSuppression } from "./decisionSuppression";
import { findSurfaceEntry } from "./surfaceMatcher";
import { noneDecision, suppressSlotDecision } from "./getExperienceDecision";
import {
  progressionGateDecision,
  recordProgressionAfterPrimary,
} from "./progressionMemory";

export interface DecisionPipelineContext {
  now: number;
  observeOnly?: boolean;
  progression?: ExperienceProgressionMemory;
  recordProgression?: boolean;
}

export interface ExperienceDecisionFrameDiagnostics {
  matched_recipe_ids: string[];
  matched_candidates: Array<{ recipe_id: string; surface_id: string; match_confidence: number }>;
  suppressed: Array<{ recipe_id: string; surface_id: string; reason: string }>;
  progression_gated: Array<{ recipe_id: string; surface_id: string; reason: string }>;
  holdback_reasons: string[];
  readiness_score: number;
  engagement_score: number;
  commercial_phase: string | undefined;
}

function dedupeByRecipe(candidates: RecipeMatchCandidate[]): RecipeMatchCandidate[] {
  const map = new Map<string, RecipeMatchCandidate>();
  for (const c of candidates) {
    const prev = map.get(c.recipe.id);
    if (!prev || c.match_confidence > prev.match_confidence) map.set(c.recipe.id, c);
  }
  return [...map.values()];
}

function buildDecisionFromCandidate(
  profile: SessionProfile,
  c: RecipeMatchCandidate,
  now: number,
): ExperienceDecision {
  const recipe = c.recipe;
  const d = recipe.decision;
  const catalog = getSurfaceCatalogForVertical(profile.site_context.vertical);
  const entry = findSurfaceEntry(catalog.surfaces, c.surface_id)!;
  const timing = clampTimingForSurface(d.timing, entry);
  const friction = d.friction ?? "medium";
  const ao = profile.activation_opportunity;
  const reasons = [
    ...ao.reason.slice(0, 3),
    `recipe:${recipe.id}`,
    `surface:${c.surface_id}`,
  ].filter(Boolean);
  const evidence = [
    ...ao.evidence.slice(0, 4),
    ...profile.personalization_signal.top_concepts.slice(0, 3).map((t) => `${t.label}:${t.score}`),
  ].filter(Boolean);
  const ttl = d.ttl_seconds ?? 900;
  const conf = Math.round(c.match_confidence * 1000) / 1000;
  return {
    id: `exp_${recipe.id}_${c.surface_id}`,
    surface_id: c.surface_id,
    surface_type: d.surface_type ?? entry.surface_type,
    action: d.action ?? "show",
    message_angle: d.message_angle,
    offer_type: d.offer_type,
    headline: polishHeadline(d.headline),
    body: d.body,
    cta_label: d.cta_label,
    target_url_hint: d.target_url_hint ?? "",
    timing,
    friction,
    priority: Math.round(conf * 100),
    confidence: conf,
    reason: reasons.length ? reasons : ["inferred_session_fit"],
    evidence: evidence.length ? evidence : ["light_session_signals"],
    source_recipe_id: recipe.id,
    ttl_seconds: ttl,
    expires_at: now + ttl * 1000,
    privacy_scope: "session_only",
    visitor_status: "anonymous",
  };
}

function readinessFromProfile(profile: SessionProfile): number {
  const sig = profile.personalization_signal;
  return (
    sig.activation_readiness_score ??
    sig.conversion_readiness ??
    profile.behavior_snapshot?.activation_readiness.score_0_100 ??
    0
  );
}

export function runExperienceDecisionPipeline(
  profile: SessionProfile,
  ctx: DecisionPipelineContext,
  includeDiagnostics: boolean,
): {
  envelope: ExperienceDecisionEnvelope;
  slotDecisions: Record<string, ExperienceDecision>;
  diagnostics: ExperienceDecisionFrameDiagnostics | undefined;
} {
  const vertical = profile.site_context.vertical;
  const catalog = getSurfaceCatalogForVertical(vertical);
  const recipes = getExperienceRecipesForVertical(vertical);
  const recipeById = new Map<string, ExperienceRecipe>(recipes.map((r) => [r.id, r]));
  const raw = matchRecipeCandidates(profile, recipes, catalog, vertical);
  const deduped = rankCandidatesWithCommercialIntent(dedupeByRecipe(raw), profile);

  const holdbackReasons: string[] = [];
  const surfaceFirstFail = new Map<string, string>();
  const viable: ExperienceDecision[] = [];

  const diagnostics: ExperienceDecisionFrameDiagnostics | undefined = includeDiagnostics
    ? {
        matched_recipe_ids: [...new Set(deduped.map((c) => c.recipe.id))],
        matched_candidates: deduped.map((c) => ({
          recipe_id: c.recipe.id,
          surface_id: c.surface_id,
          match_confidence: c.match_confidence,
        })),
        suppressed: [],
        progression_gated: [],
        holdback_reasons: [],
        readiness_score: readinessFromProfile(profile),
        engagement_score: profile.engagement_score,
        commercial_phase: profile.commercial_journey_phase ?? profile.behavior_snapshot?.commercial_journey_phase,
      }
    : undefined;

  for (const c of deduped) {
    const dec = buildDecisionFromCandidate(profile, c, ctx.now);
    const commercialSup = shouldSuppressForCommercialIntent(dec, profile);
    if (commercialSup) {
      holdbackReasons.push(commercialSup.reason);
      if (!surfaceFirstFail.has(dec.surface_id)) {
        surfaceFirstFail.set(dec.surface_id, commercialSup.reason);
      }
      diagnostics?.suppressed.push({
        recipe_id: c.recipe.id,
        surface_id: c.surface_id,
        reason: commercialSup.reason,
      });
      continue;
    }
    const sup = shouldSuppressDecision({
      profile,
      vertical,
      decision: dec,
      catalog,
      globalFloor: 0.45,
    });
    if (!sup.ok) {
      if (sup.reason) holdbackReasons.push(sup.reason);
      if (!surfaceFirstFail.has(dec.surface_id)) surfaceFirstFail.set(dec.surface_id, sup.reason ?? "suppressed");
      diagnostics?.suppressed.push({
        recipe_id: c.recipe.id,
        surface_id: c.surface_id,
        reason: sup.reason ?? "suppressed",
      });
      continue;
    }
    viable.push(dec);
  }

  const ranked = rankDecisions(viable);
  const progression_notes: string[] = [];
  const gated: ExperienceDecision[] = [];
  for (const d of ranked) {
    const recipe = d.source_recipe_id ? recipeById.get(d.source_recipe_id) : undefined;
    const gate = progressionGateDecision({
      decision: d,
      recipe,
      progression: ctx.progression,
      now: ctx.now,
    });
    if (!gate.ok) {
      holdbackReasons.push(gate.reason);
      progression_notes.push(`Progression held ${d.surface_id} (${gate.reason}).`);
      if (d.source_recipe_id) {
        diagnostics?.progression_gated.push({
          recipe_id: d.source_recipe_id,
          surface_id: d.surface_id,
          reason: gate.reason,
        });
      }
      continue;
    }
    gated.push(d);
  }

  let primary: ExperienceDecision | null = gated[0] ?? null;
  let secondary = gated.slice(1, 3);

  if (ctx.observeOnly) {
    primary = null;
    secondary = [];
  } else if (ctx.recordProgression && ctx.progression && primary) {
    const r = primary.source_recipe_id ? recipeById.get(primary.source_recipe_id) : undefined;
    recordProgressionAfterPrimary(ctx.progression, primary, r, ctx.now);
  }

  if (diagnostics) diagnostics.holdback_reasons = [...holdbackReasons];

  let suppression_summary: string | undefined;
  if (ctx.observeOnly) {
    suppression_summary = "observe_only_mode — decisions not emitted.";
  } else if (!primary) {
    suppression_summary = summarizeSuppression(holdbackReasons);
  } else if (holdbackReasons.length) {
    suppression_summary = `Primary: ${primary.surface_id}. ${summarizeSuppression(holdbackReasons.slice(0, 4))}`;
  }

  if (primary && profile.commercial_intent) {
    const intentReasons = buildCommercialIntentDecisionReasons(profile, primary);
    if (intentReasons.length) {
      primary.reason = [...intentReasons, ...primary.reason].slice(0, 8);
    }
  }

  const envelope: ExperienceDecisionEnvelope = {
    event: "si_experience_decision",
    generated_at: ctx.now,
    session_id: profile.session_id,
    primary_decision: primary,
    secondary_decisions: secondary,
    suppression_summary,
    progression_notes: progression_notes.length ? progression_notes : undefined,
  };

  const slotDecisions: Record<string, ExperienceDecision> = {};
  for (const s of catalog.surfaces) {
    const sid = s.surface_id;
    if (ctx.observeOnly) {
      slotDecisions[sid] = noneDecision(sid, ctx.now);
      continue;
    }
    const fromPrimary = primary?.surface_id === sid ? primary : secondary.find((d) => d.surface_id === sid);
    if (fromPrimary) {
      slotDecisions[sid] = structuredClone(fromPrimary);
    } else if (surfaceFirstFail.has(sid)) {
      slotDecisions[sid] = suppressSlotDecision(sid, surfaceFirstFail.get(sid)!, ctx.now);
    } else {
      slotDecisions[sid] = noneDecision(sid, ctx.now);
    }
  }

  return { envelope, slotDecisions, diagnostics };
}
