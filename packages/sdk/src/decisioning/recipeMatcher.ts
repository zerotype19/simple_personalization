import type { CommercialJourneyPhase, ExperienceRecipe, SessionProfile } from "@si/shared";
import { CONCEPT_DISPLAY_MIN_SCORE } from "@si/shared/contextBrain";
import { findSurfaceEntry } from "./surfaceMatcher";
import type { ExperienceSurfaceCatalogFile } from "@si/shared";

function conceptSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function readinessScore(profile: SessionProfile): number {
  const sig = profile.personalization_signal;
  return sig.activation_readiness_score ?? sig.conversion_readiness ?? 0;
}

function phaseOk(profile: SessionProfile, allowed?: CommercialJourneyPhase[]): boolean {
  if (!allowed?.length) return true;
  const phase = profile.commercial_journey_phase ?? profile.behavior_snapshot?.commercial_journey_phase;
  if (!phase) return true;
  return allowed.includes(phase);
}

function conceptsMatch(profile: SessionProfile, required?: string[]): boolean {
  if (!required?.length) return true;
  const aff = profile.concept_affinity ?? {};
  for (const slug of required) {
    for (const [label, score] of Object.entries(aff)) {
      if (score < CONCEPT_DISPLAY_MIN_SCORE) continue;
      if (conceptSlug(label) === slug || conceptSlug(label).includes(slug) || slug.includes(conceptSlug(label))) {
        return true;
      }
    }
  }
  return false;
}

export interface RecipeMatchCandidate {
  recipe: ExperienceRecipe;
  surface_id: string;
  /** Pre-suppression confidence hint (0–1). */
  match_confidence: number;
}

export function matchRecipeCandidates(
  profile: SessionProfile,
  recipes: ExperienceRecipe[],
  catalog: ExperienceSurfaceCatalogFile,
  vertical: string,
): RecipeMatchCandidate[] {
  const out: RecipeMatchCandidate[] = [];
  const engagement = profile.engagement_score;
  const readiness = readinessScore(profile);
  const ctaClicks = profile.signals.cta_clicks;

  for (const recipe of recipes) {
    const vOk = recipe.verticals.some((v) => v === vertical || v === "generic");
    if (!vOk) continue;
    if (recipe.min_engagement_score != null && engagement < recipe.min_engagement_score) continue;
    if (recipe.min_activation_readiness != null && readiness < recipe.min_activation_readiness) continue;
    if (recipe.max_cta_clicks != null && ctaClicks > recipe.max_cta_clicks) continue;
    if (!phaseOk(profile, recipe.allowed_phases)) continue;
    if (!conceptsMatch(profile, recipe.required_any_concepts)) continue;

    const ao = profile.activation_opportunity;
    const base = Math.min(0.95, Math.max(0.35, ao.confidence * 0.55 + (readiness / 100) * 0.25 + (engagement / 100) * 0.2));

    for (const surface_id of recipe.surfaces) {
      const entry = findSurfaceEntry(catalog.surfaces, surface_id);
      if (!entry) continue;
      out.push({ recipe, surface_id, match_confidence: base });
    }
  }
  return out;
}
