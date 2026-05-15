import type { ExperienceDecision } from "@si/shared";

export type SurfaceRegionSource = "attribute" | "inspector" | "demo";

export interface SurfaceRegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One on-page slot the mapper tracks (declarative tag or saved selector). */
export interface SurfaceRegion {
  id: string;
  surface_id: string;
  label: string;
  selector: string;
  element_path: string;
  source: SurfaceRegionSource;
  bounds: SurfaceRegionBounds;
  /** Filled by {@link attachDecisionsToRegions}. */
  current_decision?: ExperienceDecision | null;
}

export interface SurfaceMapping {
  surface_id: string;
  selector: string;
  label: string;
  created_at: number;
  source: "inspector" | "demo";
}

export interface SurfaceMapState {
  regions: SurfaceRegion[];
  mappings: SurfaceMapping[];
  selected_region_id?: string;
}
