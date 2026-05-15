import type { SiteVertical } from "@si/shared";
import { getSurfaceCatalogForVertical } from "@si/shared/experiencePacks";
import { attachDecisionsToRegions, buildCssSelector, discoverSurfaceRegions } from "./discoverSurfaceRegions";
import {
  addMapping,
  clearMappingsForPage,
  dispatchSurfaceMapUpdated,
  getPageMappingKey,
  loadMappingsForPage,
  SURFACE_MAPPINGS_STORAGE_KEY,
} from "./surfaceMappingStore";
import {
  destroySurfaceMapperOverlay,
  isOverlayEnabled,
  setOverlayEnabled,
  updateSurfaceMapperOverlay,
} from "./surfaceMapperOverlay";
import type { SurfaceMapState } from "./surfaceMapperTypes";

export * from "./surfaceMapperTypes";
export {
  discoverSurfaceRegions,
  attachDecisionsToRegions,
  buildCssSelector,
  type DiscoverOptions,
  type SurfaceDiscoverLayoutStub,
} from "./discoverSurfaceRegions";
export { buildSurfaceDecisionPreview } from "./surfaceDecisionPreview";
export type { SurfaceDecisionPreview } from "./surfaceDecisionPreview";
export {
  loadMappingsForPage,
  saveMappingsForPage,
  clearMappingsForPage,
  addMapping,
  getPageMappingKey,
  dispatchSurfaceMapUpdated,
  SURFACE_MAPPINGS_STORAGE_KEY,
} from "./surfaceMappingStore";
export {
  updateSurfaceMapperOverlay,
  destroySurfaceMapperOverlay,
  isOverlayEnabled,
  setOverlayEnabled,
} from "./surfaceMapperOverlay";

export const FALLBACK_SURFACE_IDS: readonly string[] = [
  "homepage_hero_secondary",
  "article_inline_mid",
  "article_inline_end",
  "soft_popup",
  "sticky_footer_cta",
  "comparison_module",
  "implementation_readiness_checklist",
  "product_comparison_inline",
  "shipping_returns_reassurance",
  "card_comparison_module",
  "education_inline_next_step",
  "model_discovery_assist",
  "inventory_assist_module",
] as const;

export function getKnownSurfaceIdsForVertical(vertical: SiteVertical): string[] {
  try {
    const cat = getSurfaceCatalogForVertical(vertical);
    const fromCatalog = cat.surfaces.map((s) => s.surface_id);
    return [...new Set([...fromCatalog, ...FALLBACK_SURFACE_IDS])].sort();
  } catch {
    return [...FALLBACK_SURFACE_IDS].sort();
  }
}

export function buildSurfaceMapState(
  doc: Document,
  vertical: SiteVertical,
  getDecision: (surfaceId: string) => import("@si/shared").ExperienceDecision,
  demoSelectors?: Array<{ selector: string; surface_id: string; label: string }>,
): SurfaceMapState {
  const mappings = loadMappingsForPage();
  const raw = discoverSurfaceRegions(doc, mappings, { demoSelectors });
  const regions = attachDecisionsToRegions(raw, getDecision);
  return { regions, mappings };
}
