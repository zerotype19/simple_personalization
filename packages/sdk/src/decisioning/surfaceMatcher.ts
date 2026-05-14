import type { ExperienceSurfaceCatalogEntry } from "@si/shared";

export function findSurfaceEntry(
  surfaces: ExperienceSurfaceCatalogEntry[],
  surfaceId: string,
): ExperienceSurfaceCatalogEntry | undefined {
  return surfaces.find((s) => s.surface_id === surfaceId);
}
