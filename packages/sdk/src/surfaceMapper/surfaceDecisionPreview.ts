import type { ExperienceDecision } from "@si/shared";

export interface SurfaceDecisionPreview {
  headline: string;
  timing: string;
  actionLine: string;
  offerLine: string | null;
  suppressionLine: string | null;
}

function tidy(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Buyer-safe preview lines (no numeric confidence in strings). */
export function buildSurfaceDecisionPreview(decision: ExperienceDecision): SurfaceDecisionPreview {
  const timing = decision.timing.replace(/_/g, " ");
  if (decision.action === "none") {
    return {
      headline: "No strong decision yet",
      timing,
      actionLine: "None — slot is idle for this session tick.",
      offerLine: null,
      suppressionLine: null,
    };
  }
  if (decision.action === "suppress") {
    const sr = decision.suppression_reason?.trim();
    return {
      headline: "Suppressed",
      timing,
      actionLine: "Suppress",
      offerLine: null,
      suppressionLine: sr ? tidy(sr) : "This surface is intentionally held back.",
    };
  }
  const hl = decision.headline?.trim() || decision.offer_type.replace(/_/g, " ");
  const body = decision.body?.trim();
  return {
    headline: hl,
    timing,
    actionLine: `${decision.action.replace(/_/g, " ")} · ${decision.friction} friction`,
    offerLine: body ? tidy(body.slice(0, 160)) : null,
    suppressionLine: null,
  };
}
