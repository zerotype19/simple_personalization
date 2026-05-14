import type {
  ExperienceDecision,
  ExperienceDecisionEnvelope,
  SessionProfile,
} from "@si/shared";
import {
  getExperienceRecipesForVertical,
  getSurfaceCatalogForVertical,
} from "@si/shared/experiencePacks";
import { polishHeadline } from "./decisionCopy";
import { rankDecisions } from "./decisionRanking";
import { clampTimingForSurface } from "./decisionTiming";
import { matchRecipeCandidates, type RecipeMatchCandidate } from "./recipeMatcher";
import { shouldSuppressDecision, summarizeSuppression } from "./decisionSuppression";
import { findSurfaceEntry } from "./surfaceMatcher";
import { noneDecision, suppressSlotDecision } from "./getExperienceDecision";

export interface ExperienceDecisionContext {
  now: number;
  /** When true, envelope stays decision-free (trust / staging). */
  observeOnly?: boolean;
  /** Reserved for future frequency caps (session-local). */
  emittedKeys?: Set<string>;
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

export function buildExperienceDecisionEnvelope(
  profile: SessionProfile,
  ctx: ExperienceDecisionContext,
): { envelope: ExperienceDecisionEnvelope; slotDecisions: Record<string, ExperienceDecision> } {
  const vertical = profile.site_context.vertical;
  const catalog = getSurfaceCatalogForVertical(vertical);
  const recipes = getExperienceRecipesForVertical(vertical);
  const raw = matchRecipeCandidates(profile, recipes, catalog, vertical);
  const deduped = dedupeByRecipe(raw);

  const holdbackReasons: string[] = [];
  const surfaceFirstFail = new Map<string, string>();
  const viable: ExperienceDecision[] = [];

  for (const c of deduped) {
    const dec = buildDecisionFromCandidate(profile, c, ctx.now);
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
      continue;
    }
    viable.push(dec);
  }

  const ranked = rankDecisions(viable);
  let primary: ExperienceDecision | null = ranked[0] ?? null;
  let secondary = ranked.slice(1, 3);

  if (ctx.observeOnly) {
    primary = null;
    secondary = [];
  }

  let suppression_summary: string | undefined;
  if (ctx.observeOnly) {
    suppression_summary = "observe_only_mode — decisions not emitted.";
  } else if (!primary) {
    suppression_summary = summarizeSuppression(holdbackReasons);
  } else if (holdbackReasons.length) {
    suppression_summary = `Primary: ${primary.surface_id}. ${summarizeSuppression(holdbackReasons.slice(0, 4))}`;
  }

  const envelope: ExperienceDecisionEnvelope = {
    event: "si_experience_decision",
    generated_at: ctx.now,
    session_id: profile.session_id,
    primary_decision: primary,
    secondary_decisions: secondary,
    suppression_summary,
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

  return { envelope, slotDecisions };
}
