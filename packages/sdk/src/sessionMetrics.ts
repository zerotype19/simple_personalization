import type { SessionProfile } from "@si/shared";

/**
 * Distinct URL paths explored this session (query stripped, lowercased).
 * Prefer over `signals.pages_viewed`, which counts route transitions / ticks.
 */
export function distinctPagesExploredCount(profile: SessionProfile): number {
  if (profile.page_journey && profile.page_journey.length > 0) {
    return new Set(
      profile.page_journey.map((e) => ((e.path.split("?")[0] || "/").trim() || "/").toLowerCase()),
    ).size;
  }
  const seq = profile.signals.path_sequence ?? [];
  if (seq.length === 0) return 1;
  return new Set(seq.map((p) => ((p.split("?")[0] || "/").trim() || "/").toLowerCase())).size;
}
