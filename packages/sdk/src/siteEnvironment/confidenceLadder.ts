import type { ConfidenceLadder, PersonalizationLadderLevel } from "@si/shared";

/**
 * Maps combined inference confidence to product ladder (zero-config caps at 3).
 * Level 4 is reserved for future publisher opt-in; we never auto-assign it here.
 */
export function buildConfidenceLadder(
  siteConf01: number,
  pageConf01: number,
  conversionConf01: number,
): ConfidenceLadder {
  const minC = Math.min(siteConf01, pageConf01, conversionConf01);

  let level: PersonalizationLadderLevel = 1;
  let label = "Observe only";
  let detail =
    "Still learning this site — no automated DOM personalization from environment inference alone.";

  if (minC >= 0.38 && minC < 0.58) {
    level = 2;
    label = "Recommend only";
    detail =
      "Medium confidence: use NBA / signals to guide the session. DOM treatments stay off unless a vertical-specific safe path applies.";
  } else if (minC >= 0.58) {
    level = 3;
    label = "Safe personalization eligible";
    detail =
      "Higher confidence in site + page + conversion read. Only known-safe treatments run (e.g. auto-retail demo slots when enabled).";
  }

  return { level, label, detail };
}
