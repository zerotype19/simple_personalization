import type { ExperienceDecisionTiming } from "@si/shared";
import type { ExperienceSurfaceCatalogEntry } from "@si/shared";

/** Ensure recipe timing is allowed for the surface; otherwise first allowed or `next_navigation`. */
export function clampTimingForSurface(
  timing: ExperienceDecisionTiming,
  entry: ExperienceSurfaceCatalogEntry | undefined,
): ExperienceDecisionTiming {
  const allowed = entry?.allowed_timing;
  if (!allowed?.length) return timing;
  if (allowed.includes(timing)) return timing;
  if (allowed.includes("next_navigation")) return "next_navigation";
  if (allowed.includes("after_scroll")) return "after_scroll";
  return allowed[0] ?? timing;
}

const FRICTION_RANK: Record<"low" | "medium" | "high", number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function frictionWithinMax(
  friction: "low" | "medium" | "high",
  max?: "low" | "medium" | "high",
): boolean {
  if (!max) return true;
  return FRICTION_RANK[friction] <= FRICTION_RANK[max];
}
